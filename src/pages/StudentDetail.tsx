
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Student, StudentType, AttendanceStatus, HistoricalAttendance } from '../types';
import { studentService, statisticsService } from '../services';

const StudentDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [student, setStudent] = useState<Student | undefined>(undefined);
    const [className, setClassName] = useState<string>('未分班');
    const [isLoading, setIsLoading] = useState(true);
    const [attendanceStats, setAttendanceStats] = useState({ present: 0, absent: 0, late: 0, excused: 0 });

    // Combined grid data: key="RowLabel-ClassName", value=Percentage
    const [attendanceGrid, setAttendanceGrid] = useState<Record<string, number>>({});

    // Editing Manual History
    const [isEditingHistory, setIsEditingHistory] = useState(false);
    const [manualHistoryBuffer, setManualHistoryBuffer] = useState<HistoricalAttendance[]>([]);

    const classHeaders = useMemo(() => {
        return ['幼兒班', '幼年班', '少年班', '國中班', '高中班'];
    }, []);

    const rowLabels = ["學齡前(3歲)", "第一年", "第二年", "第三年"];

    const getAcademicYear = (dateString: string): number => {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = date.getMonth(); // 0-11
        // Academic year starts in September (month 8)
        return month >= 8 ? year : year - 1;
    };

    const calculateAgeOnDate = (dob: string, onDateStr: string): number => {
        const birthDate = new Date(dob);
        const onDate = new Date(onDateStr);
        let age = onDate.getFullYear() - birthDate.getFullYear();
        const m = onDate.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && onDate.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            setIsLoading(true);
            try {
                const studentId = parseInt(id, 10);

                // 1. Fetch Student Details
                const foundStudent = await studentService.getById(studentId);
                setStudent(foundStudent);

                if (foundStudent) {
                    setClassName(foundStudent.class?.name || '未分班');
                    // Initialize Manual History Buffer with API data (needs casting/mapping if structure differs)
                    setManualHistoryBuffer((foundStudent.historicalAttendance as HistoricalAttendance[]) || []);
                }

                // 2. Fetch Statistics
                const stats = await statisticsService.getStudentStats(studentId);
                setAttendanceStats({
                    present: stats.summary.present,
                    absent: stats.summary.absent,
                    late: stats.summary.late,
                    excused: stats.summary.excused
                });

                // 3. Construct Grid
                const newGrid: Record<string, number> = {};

                // Helper to set grid value
                const setVal = (row: string, cls: string, val: number) => {
                    newGrid[`${row}-${cls}`] = val;
                };

                // A. Process Aggregated Real History
                // Group by ClassName
                const dataByClass: Record<string, typeof stats.aggregatedHistory> = {};
                stats.aggregatedHistory.forEach(h => {
                    if (!dataByClass[h.className]) dataByClass[h.className] = [];
                    dataByClass[h.className].push(h);
                });

                // Map each class's years to rows
                for (const cName in dataByClass) {
                    const classHistory = dataByClass[cName].sort((a, b) => a.academicYear - b.academicYear);

                    classHistory.forEach((h, index) => {
                        let targetRow = "";

                        // Special logic for "Kindergarten" / 幼兒班 age 3
                        if (cName === '幼兒班' && foundStudent.dob) {
                            const age = calculateAgeOnDate(foundStudent.dob, `${h.academicYear}-09-01`);
                            if (age <= 3) targetRow = "學齡前(3歲)";
                            else if (age === 4) targetRow = "第一年";
                            else if (age === 5) targetRow = "第二年";
                            // Fallback for older kids in preschool?
                            else if (index === 0) targetRow = "第一年";
                            else if (index === 1) targetRow = "第二年";
                            else targetRow = "第三年";
                        } else {
                            // Default sequential mapping with "First Year" as index 0
                            if (index === 0) targetRow = "第一年";
                            else if (index === 1) targetRow = "第二年";
                            else if (index === 2) targetRow = "第三年";
                        }

                        if (targetRow) {
                            setVal(targetRow, cName, h.percentage);
                        }
                    });
                }

                // B. Process Manual History (Override/Merge)
                // Note: The Grid UI prefers manualHistoryBuffer (state) over attendanceGrid (calculated) in getCellValue. 'attendanceGrid' is foundational.
                // However, 'manualHistory' from API is already put into 'manualHistoryBuffer' via setManualHistoryBuffer above?
                // Yes, 'student.historicalAttendance' is the manual history.
                // So we don't need to put it into 'attendanceGrid'. getCellValue handles it.

                setAttendanceGrid(newGrid);

            } catch (error) {
                console.error("Failed to load student details:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [id]);

    const getStudentTypeName = (type: StudentType) => {
        return type === StudentType.Member ? '信徒' : '慕道';
    };

    const renderDetailItem = (label: string, value?: string | null) => (
        <div>
            <dt className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</dt>
            <dd className="mt-1 text-base font-bold text-gray-800">{value || '未提供'}</dd>
        </div>
    );

    const renderStatusItem = (label: string, value: 'active' | 'inactive') => (
        <div>
            <dt className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</dt>
            <dd className="mt-1">
                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${value === 'active' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                    {value === 'active' ? '在學' : '離校'}
                </span>
            </dd>
        </div>
    );

    const renderBooleanItem = (label: string, value: boolean, date?: string | null) => (
        <div>
            <dt className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</dt>
            <dd className="mt-1 text-base font-bold text-gray-800 flex items-center">
                <span className={`w-3 h-3 rounded-full mr-2 ${value ? 'bg-green-400' : 'bg-red-400'}`}></span>
                {value ? '是' : '否'}
                {value && date && <span className="ml-2 text-sm text-gray-400 font-medium">({date})</span>}
            </dd>
        </div>
    );

    // --- Manual History Handlers ---
    const getCellKey = (row: string, col: string) => `${row}-${col}`;

    const getCellValue = (row: string, col: string) => {
        // 1. Check Manual Buffer first (if editing or just viewing manual overrides)
        const manualEntry = manualHistoryBuffer.find(h => h.rowLabel === row && h.className === col);
        if (manualEntry) return manualEntry.percentage;

        // 2. Check Calculated Grid
        const calcValue = attendanceGrid[getCellKey(row, col)];
        if (calcValue !== undefined) return calcValue;

        return null;
    };

    const handleManualChange = (row: string, col: string, valStr: string) => {
        const val = parseInt(valStr, 10);
        setManualHistoryBuffer(prev => {
            // Remove existing entry for this cell
            const filtered = prev.filter(h => !(h.rowLabel === row && h.className === col));
            if (isNaN(val)) return filtered; // If cleared, remove it
            // Add new
            return [...filtered, { rowLabel: row, className: col, percentage: val }];
        });
    };

    const saveHistory = () => {
        if (!student) return;
        // In a real app, API call here.
        student.historicalAttendance = manualHistoryBuffer;
        setIsEditingHistory(false);
        alert("歷史資料已更新成功！");
    };

    if (isLoading) return <div className="p-8 text-center text-gray-500 font-bold">讀取中...</div>;
    if (!student) return <div className="p-8 text-center text-gray-500">找不到資料</div>;

    return (
        <div className="p-4 sm:p-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                <div className="flex items-center">
                    <div className="w-16 h-16 rounded-full bg-cute-primary/20 text-cute-primary flex items-center justify-center text-2xl font-black border-4 border-white shadow-lg mr-4">
                        {student.fullName.charAt(0)}
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-gray-800 tracking-tight">{student.fullName}</h1>
                        <p className="text-gray-500 font-bold text-sm">{className}</p>
                    </div>
                </div>
                <div className="flex space-x-3">
                    <Link to={`/students/${student.id}/edit`} className="bg-cute-primary text-white px-5 py-2.5 rounded-full hover:bg-blue-500 transition-all shadow-cute hover:shadow-cute-hover font-bold flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" />
                        </svg>
                        編輯
                    </Link>
                    <Link to="/students" className="bg-white text-gray-600 px-5 py-2.5 rounded-full hover:bg-gray-50 transition-all shadow-sm border border-gray-200 font-bold flex items-center">
                        返回
                    </Link>
                </div>
            </div>

            <div className="space-y-8">
                {/* Top Section: 3 Cards Grid - Basic Info, Church Status, Emergency Contact */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Basic Info */}
                    <div className="bg-white shadow-cute rounded-3xl overflow-hidden border-4 border-white h-full">
                        <div className="p-6 border-b border-gray-100 bg-orange-50/30">
                            <h2 className="text-xl font-black text-gray-700">基本資料</h2>
                        </div>
                        <div className="p-6 space-y-6">
                            <dl className="grid grid-cols-1 gap-y-4">
                                {renderDetailItem('姓名', student.fullName)}
                                {renderDetailItem('類別', getStudentTypeName(student.studentType))}
                                {renderStatusItem('狀態', student.status)}
                                {renderDetailItem('出生日期', student.dob)}
                                {renderDetailItem('地址', student.address)}
                            </dl>
                        </div>
                    </div>

                    {/* Church Status */}
                    <div className="bg-white shadow-cute rounded-3xl overflow-hidden border-4 border-white h-full">
                        <div className="p-6 border-b border-gray-100 bg-purple-50/30">
                            <h2 className="text-xl font-black text-gray-700">教會狀態</h2>
                        </div>
                        <div className="p-6 space-y-6">
                            <dl className="grid grid-cols-1 gap-y-4">
                                {renderBooleanItem('是否受洗', student.isBaptized, student.baptismDate)}
                                {renderBooleanItem('是否受聖靈', student.isSpiritBaptized, student.spiritBaptismDate)}
                            </dl>
                        </div>
                    </div>

                    {/* Emergency Contact */}
                    <div className="bg-white shadow-cute rounded-3xl overflow-hidden border-4 border-white h-full">
                        <div className="p-6 border-b border-gray-100 bg-pink-50/30">
                            <h2 className="text-xl font-black text-gray-700">緊急聯絡</h2>
                        </div>
                        <div className="p-6 space-y-6">
                            <dl className="grid grid-cols-1 gap-y-4">
                                {renderDetailItem('姓名', student.emergencyContactName)}
                                {renderDetailItem('電話', student.emergencyContactPhone)}
                            </dl>
                        </div>
                    </div>
                </div>

                {/* Enrollment History */}
                <div className="bg-white shadow-cute rounded-3xl overflow-hidden border-4 border-white">
                    <div className="p-6 sm:p-8 border-b border-gray-100 flex items-center bg-green-50/30">
                        <h2 className="text-xl font-black text-gray-700 flex items-center">
                            <span className="w-2 h-6 bg-cute-accent rounded-full mr-3"></span>
                            學歷 / 入學紀錄
                        </h2>
                    </div>
                    <div className="p-6 sm:p-8">
                        {student.enrollmentHistory && student.enrollmentHistory.length > 0 ? (
                            <ul className="relative border-l-2 border-gray-100 ml-3 space-y-6">
                                {student.enrollmentHistory.map((record, idx) => (
                                    <li key={record.id} className="ml-6 relative">
                                        <span className="absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white ring-4 ring-green-100">
                                            <span className="h-2 w-2 rounded-full bg-green-400"></span>
                                        </span>
                                        <div className="flex flex-col sm:flex-row sm:items-center bg-gray-50 rounded-2xl p-4 hover:bg-green-50 transition-colors">
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-gray-500 mb-1">{record.enrollmentDate}</p>
                                                <h3 className="text-lg font-black text-gray-800">{record.className}</h3>
                                                {record.schoolName && <p className="text-sm text-gray-600 mt-1">學校：{record.schoolName}</p>}
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-400 text-center py-4 font-bold">沒有入學紀錄</p>
                        )}
                    </div>
                </div>

                {/* Attendance History Table */}
                <div className="bg-white shadow-cute rounded-3xl overflow-hidden border-4 border-white">
                    <div className="p-6 sm:p-8 border-b border-gray-100 flex justify-between items-center bg-blue-50/30">
                        <h2 className="text-xl font-black text-gray-700 flex items-center">
                            <span className="w-2 h-6 bg-cute-primary rounded-full mr-3"></span>
                            歷年出席紀錄表
                        </h2>
                        {!isEditingHistory ? (
                            <button onClick={() => setIsEditingHistory(true)} className="text-xs font-bold text-cute-primary bg-white px-3 py-1 rounded-full shadow-sm border border-blue-100 hover:bg-blue-50">
                                編輯歷史資料
                            </button>
                        ) : (
                            <div className="flex space-x-2">
                                <button onClick={saveHistory} className="text-xs font-bold text-white bg-green-500 px-3 py-1 rounded-full shadow-sm hover:bg-green-600">儲存</button>
                                <button onClick={() => setIsEditingHistory(false)} className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full hover:bg-gray-200">取消</button>
                            </div>
                        )}
                    </div>

                    <div className="overflow-x-auto p-6">
                        <div className="inline-block min-w-full align-middle">
                            <div className="overflow-hidden border border-gray-200 rounded-2xl">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr className="divide-x divide-gray-200">
                                            <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-100/50">年級 \ 班級</th>
                                            {classHeaders.map(header => (
                                                <th key={header} scope="col" className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">{header}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {rowLabels.map((row, rIdx) => (
                                            <tr key={row} className={`divide-x divide-gray-200 ${rIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                                                <td className="px-4 py-3 text-xs font-black text-gray-400 whitespace-nowrap bg-gray-50/50">{row}</td>
                                                {classHeaders.map(col => {
                                                    const val = getCellValue(row, col);
                                                    const isManual = manualHistoryBuffer.some(h => h.rowLabel === row && h.className === col);

                                                    return (
                                                        <td key={getCellKey(row, col)} className="px-2 py-2 whitespace-nowrap text-center relative group">
                                                            {isEditingHistory ? (
                                                                <div className="relative">
                                                                    <input
                                                                        type="number"
                                                                        min="0" max="100"
                                                                        className="w-16 text-center text-sm border border-gray-200 rounded-lg p-1 focus:ring-2 focus:ring-cute-primary focus:border-transparent bg-white text-gray-900"
                                                                        value={val !== null ? val : ''}
                                                                        onChange={(e) => handleManualChange(row, col, e.target.value)}
                                                                        placeholder="-"
                                                                    />
                                                                    <span className="absolute right-2 top-1.5 text-gray-300 text-xs">%</span>
                                                                </div>
                                                            ) : (
                                                                <div className="flex justify-center items-center">
                                                                    <span className={`text-sm font-bold ${val !== null ? (val < 60 ? 'text-red-400' : 'text-gray-700') : 'text-gray-300'}`}>
                                                                        {val !== null ? `${val}%` : '-'}
                                                                    </span>
                                                                    {isManual && <span className="ml-1 w-1.5 h-1.5 bg-yellow-400 rounded-full" title="手動輸入數據"></span>}
                                                                </div>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <p className="mt-3 text-xs text-gray-400 text-right">* 百分比為該學年度出席率。黃點標記為手動補登資料。</p>
                        </div>
                    </div>
                </div>

                {/* Important Notes (Keep at Bottom) */}
                <div className="bg-white shadow-cute rounded-3xl overflow-hidden border-4 border-white">
                    <div className="p-6 border-b border-gray-100 bg-yellow-50/30">
                        <h2 className="text-xl font-black text-gray-700">重要紀事</h2>
                    </div>
                    <div className="p-6">
                        {student.notes ? (
                            <p className="text-gray-700 bg-yellow-50 p-4 rounded-2xl text-sm leading-relaxed">{student.notes}</p>
                        ) : (
                            <p className="text-gray-400 italic">無重要紀事。</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentDetail;
