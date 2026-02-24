
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { studentService, classService, sessionService, teacherService, teacherAssignmentService } from '../services';
import type { TeacherAssignment } from '../services/teacherAssignmentService';
import { StudentType, AttendanceStatus, Class, Student, ClassSession, Teacher } from '../types';

interface WeeklyClassData {
    members: number;
    seekers: number;
    auditors: number;
    teachers: number;
    offering: number;
    isCancelled?: boolean;
    cancellationReason?: string;
    noRecord?: boolean;
}

interface ReportData {
    enrolled: Record<number, { members: number; seekers: number; teachers: number }>;
    weeklyData: {
        month: number;
        day: number;
        data: Record<number, WeeklyClassData>;
    }[];
    totals: Record<number, { members: number; seekers: number; auditors: number; teachers: number; offering: number }>;
    averages: Record<number, { members: number; seekers: number; auditors: number; teachers: number; offering: number }>;
    percentages: Record<number, { members: string; seekers: string }>;
}

const getCurrentAcademicYear = (date: Date = new Date()): number => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return month >= 8 ? year : year - 1; // Academic year starts in September
};

const gregorianToRoc = (gregorianYear: number): number => gregorianYear - 1911;
const rocToGregorian = (rocYear: number): number => rocYear + 1911;

const getSaturdaysInQuarter = (academicYearStart: number, quarter: number): Date[] => {
    const dates: Date[] = [];
    let startDate: Date, endDate: Date;

    let startMonth: number;
    let yearOffset = 0;

    switch (quarter) {
        case 1: startMonth = 8; break;  // September
        case 2: startMonth = 11; break; // December
        case 3: startMonth = 2; yearOffset = 1; break; // March
        case 4: startMonth = 5; yearOffset = 1; break; // June
        default: return [];
    }

    const startYear = academicYearStart + yearOffset;

    // Create dates in UTC to avoid any local timezone interference.
    startDate = new Date(Date.UTC(startYear, startMonth, 1));
    endDate = new Date(Date.UTC(startYear, startMonth + 3, 0)); // Day 0 gives the last day of the previous month.

    let currentDate = startDate;
    // Find the first Saturday on or after the start date
    while (currentDate.getUTCDay() !== 6 && currentDate <= endDate) {
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    // Add all subsequent Saturdays within the quarter
    while (currentDate <= endDate) {
        dates.push(new Date(currentDate));
        currentDate.setUTCDate(currentDate.getUTCDate() + 7);
    }
    return dates;
};


const QuarterlyReport: React.FC = () => {
    const currentRocYear = gregorianToRoc(getCurrentAcademicYear());
    const [selectedRocYear, setSelectedRocYear] = useState<number>(currentRocYear);
    const [selectedQuarter, setSelectedQuarter] = useState<number>(1);
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // State for data from API
    const [students, setStudents] = useState<Student[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [sessions, setSessions] = useState<ClassSession[]>([]);
    const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment[]>([]);
    const [dataLoaded, setDataLoaded] = useState(false);

    // Fetch all data on mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [studentsData, teachersData, classesData, sessionsData, assignmentsData] = await Promise.all([
                    studentService.getAll(),
                    teacherService.getAll(),
                    classService.getAll(),
                    sessionService.getAll(),
                    teacherAssignmentService.getAll()
                ]);

                setStudents(studentsData);
                setTeachers(teachersData);
                setClasses(classesData);
                setSessions(sessionsData);
                setTeacherAssignments(assignmentsData);
                setDataLoaded(true);
            } catch (err) {
                console.error('Failed to fetch report data:', err);
                alert('無法載入報表資料，請重新整理頁面。');
            }
        };

        fetchData();
    }, []);

    const orderedClasses = useMemo(() => {
        const order = ['幼兒班', '幼年班', '少年班', '國中班', '高中班'];
        return [...classes].sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
    }, [classes]);

    const generateReport = useCallback(() => {
        setIsLoading(true);
        setReportData(null);

        setTimeout(() => {
            const gregorianYear = rocToGregorian(selectedRocYear);
            const academicYearString = gregorianYear.toString();

            // --- 1. Calculate Enrolled (Corrected Logic) ---
            const enrolled: ReportData['enrolled'] = {};
            const academicYearStartStr = `${gregorianYear}-09-01`;
            const academicYearEndStr = `${gregorianYear + 1}-08-31`;

            orderedClasses.forEach(cls => {
                const teachersInClassCount = teacherAssignments.filter(
                    m => m.classId === cls.id && m.academicYear === academicYearString
                ).length;

                const sessionsForClassInYear = sessions.filter(s =>
                    s.classId === cls.id &&
                    s.date >= academicYearStartStr &&
                    s.date <= academicYearEndStr
                );

                const sessionIdsForClassInYear = new Set(sessionsForClassInYear.map(s => s.id));

                // Get student attendance from sessions
                const studentRecordsForClassInYear = sessionsForClassInYear.flatMap(session =>
                    session.studentAttendance || []
                );

                const uniqueStudentIds = [...new Set(studentRecordsForClassInYear.map(r => r.studentId))];
                const enrolledStudents = students.filter(s => uniqueStudentIds.includes(s.id));

                enrolled[cls.id] = {
                    members: enrolledStudents.filter(s => s.studentType === StudentType.Member).length,
                    seekers: enrolledStudents.filter(s => s.studentType === StudentType.Seeker).length,
                    teachers: teachersInClassCount,
                };
            });

            // --- 2. Process Weekly Data (Date format corrected) ---
            const allSaturdays = getSaturdaysInQuarter(gregorianYear, selectedQuarter);

            const sessionsByDate = new Map<string, ClassSession[]>();
            sessions.forEach(s => {
                if (!sessionsByDate.has(s.date)) {
                    sessionsByDate.set(s.date, []);
                }
                sessionsByDate.get(s.date)!.push(s);
            });

            const toYyyyMmDd = (date: Date): string => {
                const year = date.getUTCFullYear();
                const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
                const day = date.getUTCDate().toString().padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            const weeklyData: ReportData['weeklyData'] = allSaturdays.map(saturday => {
                const dateString = toYyyyMmDd(saturday);
                const sessionsForDay = sessionsByDate.get(dateString) || [];
                const weeklyCounts: ReportData['weeklyData'][0]['data'] = {};

                orderedClasses.forEach(cls => {
                    const session = sessionsForDay.find(s => s.classId === cls.id);
                    if (session) {
                        if (session.isCancelled) {
                            weeklyCounts[cls.id] = { members: 0, seekers: 0, auditors: 0, teachers: 0, offering: 0, isCancelled: true, cancellationReason: session.cancellationReason };
                        } else {
                            const studentAtt = session.studentAttendance || [];
                            const teacherAtt = session.teacherAttendance || [];

                            const presentStudentIds = new Set(
                                studentAtt
                                    .filter(sa => sa.status === AttendanceStatus.Present || sa.status === AttendanceStatus.Late)
                                    .map(sa => sa.studentId)
                            );

                            const presentStudents = students.filter(s => presentStudentIds.has(s.id));

                            weeklyCounts[cls.id] = {
                                members: presentStudents.filter(s => s.studentType === StudentType.Member).length,
                                seekers: presentStudents.filter(s => s.studentType === StudentType.Seeker).length,
                                auditors: session.auditorCount,
                                teachers: teacherAtt.filter(t => t.status === AttendanceStatus.Present || t.status === AttendanceStatus.Late).length,
                                offering: session.offeringAmount,
                                isCancelled: false,
                            };
                        }
                    } else {
                        weeklyCounts[cls.id] = { members: 0, seekers: 0, auditors: 0, teachers: 0, offering: 0, isCancelled: false, noRecord: true };
                    }
                });

                return {
                    month: saturday.getUTCMonth() + 1,
                    day: saturday.getUTCDate(),
                    data: weeklyCounts,
                };
            });

            // --- 3. Calculate Totals & Averages ---
            const totals: ReportData['totals'] = {};
            const averages: ReportData['averages'] = {};
            const percentages: ReportData['percentages'] = {};

            orderedClasses.forEach(cls => {
                const classTotals = { members: 0, seekers: 0, auditors: 0, teachers: 0, offering: 0 };

                // Calculate the number of actual teaching days for this specific class.
                const actualClassDaysCount = weeklyData.filter(week => {
                    const weekClassData = week.data[cls.id];
                    return weekClassData && !weekClassData.isCancelled && !weekClassData.noRecord;
                }).length;

                // The total sum is calculated over all weeks, which is correct since
                // non-teaching days (cancelled or no record) contribute 0 to the sum.
                weeklyData.forEach(week => {
                    classTotals.members += week.data[cls.id]?.members || 0;
                    classTotals.seekers += week.data[cls.id]?.seekers || 0;
                    classTotals.auditors += week.data[cls.id]?.auditors || 0;
                    classTotals.teachers += week.data[cls.id]?.teachers || 0;
                    classTotals.offering += week.data[cls.id]?.offering || 0;
                });
                totals[cls.id] = classTotals;

                // Use the count of actual class days for the average calculation. Avoid division by zero.
                const divisor = actualClassDaysCount > 0 ? actualClassDaysCount : 1;

                averages[cls.id] = {
                    members: parseFloat((classTotals.members / divisor).toFixed(1)),
                    seekers: parseFloat((classTotals.seekers / divisor).toFixed(1)),
                    auditors: parseFloat((classTotals.auditors / divisor).toFixed(1)),
                    teachers: parseFloat((classTotals.teachers / divisor).toFixed(1)),
                    offering: parseFloat((classTotals.offering / divisor).toFixed(2)),
                };

                const totalEnrolledStudents = enrolled[cls.id].members + enrolled[cls.id].seekers;
                percentages[cls.id] = {
                    members: totalEnrolledStudents > 0 ? `${Math.round(((averages[cls.id].members + averages[cls.id].seekers) / totalEnrolledStudents) * 100)}%` : 'N/A',
                    seekers: 'N/A', // Combined into one percentage
                };
            });

            setReportData({ enrolled, weeklyData, totals, averages, percentages });
            setIsLoading(false);
        }, 500);
    }, [selectedRocYear, selectedQuarter, orderedClasses, teacherAssignments, sessions, students]);

    useEffect(() => {
        if (dataLoaded) {
            generateReport();
        }
    }, [dataLoaded, generateReport]);

    const yearsToShow = Array.from({ length: 5 }, (_, i) => currentRocYear - i);

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <style>
                {`
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        #print-section, #print-section * {
                            visibility: visible;
                        }
                        #print-section {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                        }
                        .no-print {
                            display: none;
                        }
                    }
                    .writing-vertical-rl {
                        writing-mode: vertical-rl;
                    }
                `}
            </style>
            <div className="no-print flex flex-wrap gap-4 items-end mb-6">
                <div>
                    <label htmlFor="year-select" className="block text-sm font-medium text-gray-700">學年度</label>
                    <select
                        id="year-select"
                        value={selectedRocYear}
                        onChange={e => setSelectedRocYear(parseInt(e.target.value))}
                        style={{ backgroundColor: 'white', color: '#333' }}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-church-blue-500 focus:ring-church-blue-500 sm:text-sm bg-white text-gray-900"
                    >
                        {yearsToShow.map(year => <option key={year} value={year}>{year} 學年度</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="quarter-select" className="block text-sm font-medium text-gray-700">季度</label>
                    <select
                        id="quarter-select"
                        value={selectedQuarter}
                        onChange={e => setSelectedQuarter(parseInt(e.target.value))}
                        style={{ backgroundColor: 'white', color: '#333' }}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-church-blue-500 focus:ring-church-blue-500 sm:text-sm bg-white text-gray-900"
                    >
                        <option value="1">第一季 (9-11月)</option>
                        <option value="2">第二季 (12-2月)</option>
                        <option value="3">第三季 (3-5月)</option>
                        <option value="4">第四季 (6-8月)</option>
                    </select>
                </div>
                <button onClick={generateReport} disabled={isLoading} className="bg-church-blue-600 text-white px-4 py-2 rounded-lg hover:bg-church-blue-700 disabled:bg-gray-400">
                    {isLoading ? '產生中...' : '產生報表'}
                </button>
                <button onClick={() => window.print()} className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600">列印報表</button>
            </div>

            {isLoading && <div className="text-center p-8">正在產生報表...</div>}

            {reportData && !isLoading && (
                <div id="print-section" className="overflow-x-auto">
                    <h2 className="text-xl font-bold text-center text-black">{selectedRocYear}學年度 石牌教會 宗教教育股 第{['一', '二', '三', '四'][selectedQuarter - 1]}季 季報表</h2>
                    <p className="text-sm text-center text-black mb-4">填表日期：{new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <table className="min-w-full border-collapse border border-black text-xs text-center text-black">
                        <thead>
                            <tr className="border border-black">
                                <th rowSpan={2} colSpan={3} className="border border-black p-1">班別</th>
                                {orderedClasses.map(cls => (
                                    <th key={cls.id} colSpan={5} className="border border-black p-1">{cls.name}</th>
                                ))}
                            </tr>
                            <tr className="border border-black">
                                {orderedClasses.map(cls => (
                                    <React.Fragment key={cls.id}>
                                        <th className="border border-black p-1 font-normal">主內</th>
                                        <th className="border border-black p-1 font-normal">慕道</th>
                                        <th className="border border-black p-1 font-normal">傍聽</th>
                                        <th className="border border-black p-1 font-normal">教員</th>
                                        <th className="border border-black p-1 font-normal">獻金</th>
                                    </React.Fragment>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border border-black bg-gray-100">
                                <td rowSpan={reportData.weeklyData.length + 5} className="border border-black p-1 writing-vertical-rl transform rotate-180">實績記錄</td>
                                <td colSpan={2} className="border border-black p-1">在籍</td>
                                {orderedClasses.map(cls => (
                                    <React.Fragment key={cls.id}>
                                        <td className="border border-black p-1">{reportData.enrolled[cls.id].members}</td>
                                        <td className="border border-black p-1">{reportData.enrolled[cls.id].seekers}</td>
                                        <td className="border border-black p-1"></td>
                                        <td className="border border-black p-1">{reportData.enrolled[cls.id].teachers}</td>
                                        <td className="border border-black p-1"></td>
                                    </React.Fragment>
                                ))}
                            </tr>
                            {reportData.weeklyData.map((week, index) => (
                                <tr key={index} className="border border-black">
                                    <td className="border border-black p-1">{week.month}</td>
                                    <td className="border border-black p-1">{week.day}</td>
                                    {orderedClasses.map(cls => {
                                        const weekClassData = week.data[cls.id];
                                        if (weekClassData?.isCancelled) {
                                            return <td key={cls.id} colSpan={5} className="border border-black p-1 text-red-600 font-bold">{weekClassData.cancellationReason}</td>;
                                        }
                                        if (weekClassData?.noRecord) {
                                            return <td key={cls.id} colSpan={5} className="border border-black p-1 text-gray-500">N/A</td>;
                                        }
                                        return (
                                            <React.Fragment key={cls.id}>
                                                <td className="border border-black p-1">{weekClassData?.members || 0}</td>
                                                <td className="border border-black p-1">{weekClassData?.seekers || 0}</td>
                                                <td className="border border-black p-1">{weekClassData?.auditors || 0}</td>
                                                <td className="border border-black p-1">{weekClassData?.teachers || 0}</td>
                                                <td className="border border-black p-1">{weekClassData?.offering?.toFixed(0) || 0}</td>
                                            </React.Fragment>
                                        );
                                    })}
                                </tr>
                            ))}
                            <tr className="border border-black bg-gray-100">
                                <td colSpan={2} className="border border-black p-1">合計</td>
                                {orderedClasses.map(cls => (
                                    <React.Fragment key={cls.id}>
                                        <td className="border border-black p-1">{reportData.totals[cls.id].members}</td>
                                        <td className="border border-black p-1">{reportData.totals[cls.id].seekers}</td>
                                        <td className="border border-black p-1">{reportData.totals[cls.id].auditors}</td>
                                        <td className="border border-black p-1">{reportData.totals[cls.id].teachers}</td>
                                        <td className="border border-black p-1">{reportData.totals[cls.id].offering.toFixed(0)}</td>
                                    </React.Fragment>
                                ))}
                            </tr>
                            <tr className="border border-black bg-gray-100">
                                <td colSpan={2} className="border border-black p-1">平均</td>
                                {orderedClasses.map(cls => (
                                    <React.Fragment key={cls.id}>
                                        <td className="border border-black p-1">{reportData.averages[cls.id].members}</td>
                                        <td className="border border-black p-1">{reportData.averages[cls.id].seekers}</td>
                                        <td className="border border-black p-1">{reportData.averages[cls.id].auditors}</td>
                                        <td className="border border-black p-1">{reportData.averages[cls.id].teachers}</td>
                                        <td className="border border-black p-1">{reportData.averages[cls.id].offering.toFixed(0)}</td>
                                    </React.Fragment>
                                ))}
                            </tr>
                            <tr className="border border-black bg-gray-100">
                                <td colSpan={2} className="border border-black p-1">出席率</td>
                                {orderedClasses.map(cls => (
                                    <React.Fragment key={cls.id}>
                                        <td colSpan={2} className="border border-black p-1">{reportData.percentages[cls.id].members}</td>
                                        <td className="border border-black p-1"></td>
                                        <td className="border border-black p-1"></td>
                                        <td className="border border-black p-1"></td>
                                    </React.Fragment>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            {!reportData && !isLoading && <div className="text-center p-8">請選擇學年度與季度以產生報表。</div>}
        </div>
    );
};

export default QuarterlyReport;
