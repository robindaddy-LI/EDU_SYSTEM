
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Class, Student, Teacher, AttendanceStatus } from '../types';
import { classService, studentService, teacherAssignmentService, sessionService } from '../services';

const getUpcomingSaturday = (): string => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 (Sun) - 6 (Sat)
    const daysToAdd = 6 - dayOfWeek;
    const upcomingSaturday = new Date(today);
    upcomingSaturday.setDate(today.getDate() + daysToAdd);
    return upcomingSaturday.toISOString().split('T')[0];
};

interface AttendanceState {
    status: AttendanceStatus;
    reason: string;
}

// Defined outside to maintain focus
const AttendanceRow: React.FC<{
    label: string,
    state: AttendanceState,
    onChange: (field: keyof AttendanceState, value: string) => void,
    disabled: boolean
}> = ({ label, state, onChange, disabled }) => {
    const buttons = [
        {
            value: AttendanceStatus.Present,
            label: '出席',
            activeClass: 'bg-gradient-to-b from-green-400 to-green-500 text-white shadow-green-200 shadow-lg transform scale-110',
            baseClass: 'hover:bg-green-50 text-green-600 border-green-200'
        },
        {
            value: AttendanceStatus.Late,
            label: '遲到',
            activeClass: 'bg-gradient-to-b from-yellow-300 to-yellow-400 text-yellow-900 shadow-yellow-200 shadow-lg transform scale-110',
            baseClass: 'hover:bg-yellow-50 text-yellow-600 border-yellow-200'
        },
        {
            value: AttendanceStatus.Excused,
            label: '請假',
            activeClass: 'bg-gradient-to-b from-blue-400 to-blue-500 text-white shadow-blue-200 shadow-lg transform scale-110',
            baseClass: 'hover:bg-blue-50 text-blue-600 border-blue-200'
        },
        {
            value: AttendanceStatus.Absent,
            label: '缺席',
            activeClass: 'bg-gradient-to-b from-red-400 to-red-500 text-white shadow-red-200 shadow-lg transform scale-110',
            baseClass: 'hover:bg-red-50 text-red-600 border-red-200'
        },
    ];

    return (
        <div className="grid grid-cols-12 gap-2 items-center border-b border-gray-50 py-3 last:border-b-0 hover:bg-gray-50/50 rounded-xl px-2 transition-colors">
            <label className="col-span-12 sm:col-span-3 text-sm font-bold text-gray-600 truncate" title={label}>{label}</label>
            <div className="col-span-12 sm:col-span-9 flex flex-wrap items-center gap-3">
                <div className="flex space-x-2">
                    {buttons.map((btn) => (
                        <button
                            key={btn.value}
                            type="button"
                            disabled={disabled}
                            onClick={() => onChange('status', btn.value)}
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 shadow-sm border ${state.status === btn.value
                                ? `${btn.activeClass} border-transparent z-10`
                                : `bg-white ${btn.baseClass}`
                                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
                            title={btn.label}
                        >
                            {btn.label.substring(0, 2)}
                        </button>
                    ))}
                </div>
                <div className="flex-grow min-w-[120px]">
                    <input
                        type="text"
                        placeholder={state.status === AttendanceStatus.Present ? "出席" : "輸入原因..."}
                        value={state.reason}
                        onChange={e => onChange('reason', e.target.value)}
                        disabled={disabled || state.status === AttendanceStatus.Present}
                        className={`block w-full rounded-full border-gray-200 shadow-inner focus:border-cute-primary focus:ring-cute-primary text-sm py-2 px-4 disabled:bg-transparent disabled:border-transparent disabled:shadow-none disabled:text-gray-400 transition-all ${state.status !== AttendanceStatus.Present ? 'bg-white' : ''}`}
                    />
                </div>
            </div>
        </div>
    );
};

const AddNewClassSession: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Form state
    const [classId, setClassId] = useState<string>(searchParams.get('classId') || '');
    const [sessionDate, setSessionDate] = useState<string>(getUpcomingSaturday());
    const [isNotSaturday, setIsNotSaturday] = useState<boolean>(false);
    const [worshipTopic, setWorshipTopic] = useState('');
    const [worshipTeacherName, setWorshipTeacherName] = useState('');
    const [activityTopic, setActivityTopic] = useState('');
    const [activityTeacherName, setActivityTeacherName] = useState('');
    const [offeringAmount, setOfferingAmount] = useState<number | ''>('');
    const [auditorCount, setAuditorCount] = useState<number | ''>('');
    const [notes, setNotes] = useState('');
    const [isCancelled, setIsCancelled] = useState<boolean>(false);
    const [cancellationReason, setCancellationReason] = useState<string>('');

    // Dynamic data state
    const [classes, setClasses] = useState<Class[]>([]);
    const [studentsForClass, setStudentsForClass] = useState<Student[]>([]);
    const [teachersForClass, setTeachersForClass] = useState<Teacher[]>([]);
    const [studentAttendance, setStudentAttendance] = useState<Record<number, AttendanceState>>({});
    const [teacherAttendance, setTeacherAttendance] = useState<Record<number, AttendanceState>>({});

    // Fetch classes on mount
    useEffect(() => {
        const fetchClasses = async () => {
            try {
                const data = await classService.getAll();
                setClasses(data);
            } catch (err) {
                console.error('Failed to fetch classes:', err);
            }
        };
        fetchClasses();
    }, []);

    // Effect to check if selected date is a Saturday
    useEffect(() => {
        if (sessionDate) {
            const parts = sessionDate.split('-').map(Number);
            const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
            setIsNotSaturday(date.getUTCDay() !== 6);
        } else {
            setIsNotSaturday(false);
        }
    }, [sessionDate]);


    useEffect(() => {
        if (!classId) {
            setStudentsForClass([]);
            setTeachersForClass([]);
            return;
        }

        const numericClassId = parseInt(classId, 10);

        const fetchClassRoster = async () => {
            try {
                // Fetch active students for the selected class
                const students = await studentService.getAll({ classId: numericClassId, status: 'active' });
                setStudentsForClass(students);

                const initialStudentAttendance: Record<number, AttendanceState> = {};
                students.forEach(s => {
                    initialStudentAttendance[s.id] = { status: AttendanceStatus.Present, reason: '' };
                });
                setStudentAttendance(initialStudentAttendance);

                // Fetch teacher assignments for current year
                const currentYear = new Date().getFullYear().toString();
                const allAssignments = await teacherAssignmentService.getAll(currentYear);
                const classAssignments = allAssignments.filter(a => a.classId === numericClassId);
                const teachers = classAssignments
                    .map(a => a.teacher)
                    .filter((t): t is Teacher => t !== undefined) as Teacher[];

                setTeachersForClass(teachers);

                const initialTeacherAttendance: Record<number, AttendanceState> = {};
                teachers.forEach(t => {
                    initialTeacherAttendance[t.id] = { status: AttendanceStatus.Present, reason: '' };
                });
                setTeacherAttendance(initialTeacherAttendance);
            } catch (err) {
                console.error('Failed to fetch class roster:', err);
            }
        };

        fetchClassRoster();
    }, [classId]);

    const handleStudentAttendanceChange = (studentId: number, field: keyof AttendanceState, value: string) => {
        setStudentAttendance(prev => {
            const newState = { ...prev[studentId], [field]: value };
            if (field === 'status' && value === AttendanceStatus.Present) {
                newState.reason = '';
            }
            return { ...prev, [studentId]: newState };
        });
    };

    const handleTeacherAttendanceChange = (teacherId: number, field: keyof AttendanceState, value: string) => {
        setTeacherAttendance(prev => {
            const newState = { ...prev[teacherId], [field]: value };
            if (field === 'status' && value === AttendanceStatus.Present) {
                newState.reason = '';
            }
            return { ...prev, [teacherId]: newState };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!classId) return;

        try {
            const sessionData = {
                classId: parseInt(classId),
                date: sessionDate,
                sessionType: '安息日學',
                isCancelled: isCancelled,
                cancellationReason: isCancelled ? cancellationReason : undefined,
                worshipTopic: isCancelled ? undefined : (worshipTopic || undefined),
                worshipTeacherName: isCancelled ? undefined : (worshipTeacherName || undefined),
                activityTopic: isCancelled ? undefined : (activityTopic || undefined),
                activityTeacherName: isCancelled ? undefined : (activityTeacherName || undefined),
                offeringAmount: isCancelled ? 0 : (Number(offeringAmount) || 0),
                auditorCount: isCancelled ? 0 : (Number(auditorCount) || 0),
                notes: notes || undefined,
                studentAttendance: isCancelled ? [] : Object.entries(studentAttendance).map(([studentId, data]) => {
                    const attendanceData = data as AttendanceState;
                    return {
                        studentId: parseInt(studentId),
                        status: attendanceData.status,
                        reason: attendanceData.reason || undefined,
                    };
                }),
                teacherAttendance: isCancelled ? [] : Object.entries(teacherAttendance).map(([teacherId, data]) => {
                    const attendanceData = data as AttendanceState;
                    return {
                        teacherId: parseInt(teacherId),
                        status: attendanceData.status,
                        reason: attendanceData.reason || undefined,
                    };
                }),
            };

            await sessionService.create(sessionData);
            alert('課程紀錄已成功儲存！');
            navigate('/class-logbook');
        } catch (err) {
            console.error('Failed to create session:', err);
            alert('儲存失敗，請稍後再試。');
        }
    };

    const formInputClass = "mt-1 block w-full rounded-2xl border-gray-200 shadow-inner focus:border-cute-primary focus:ring-cute-primary text-sm py-3 px-4 bg-white text-gray-700";
    const formLabelClass = "block text-sm font-bold text-gray-600 mb-1";

    return (
        <div className="">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">✨ 新增課程紀錄</h1>
                <button onClick={() => navigate('/class-logbook')} className="bg-white text-gray-600 px-6 py-2 rounded-full hover:bg-gray-50 hover:shadow-md transition-all duration-200 flex items-center border border-gray-200 font-bold">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    取消
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Session Details */}
                <div className="bg-white p-8 rounded-3xl shadow-lg shadow-purple-50 border border-white/50">
                    <h2 className="text-xl font-bold text-gray-700 border-b border-gray-100 pb-3 mb-6 flex items-center">
                        <span className="w-8 h-8 bg-purple-100 text-purple-500 rounded-full flex items-center justify-center mr-3 text-sm">1</span>
                        基本資訊
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="classId" className={formLabelClass}>班級</label>
                            <div className="relative">
                                <select id="classId" value={classId} onChange={e => setClassId(e.target.value)} required className={`${formInputClass} appearance-none`}>
                                    <option value="" disabled>請選擇班級...</option>
                                    {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="sessionDate" className={formLabelClass}>日期</label>
                            <input type="date" id="sessionDate" value={sessionDate} onChange={e => setSessionDate(e.target.value)} required className={formInputClass} />
                            {isNotSaturday && (
                                <p className="mt-2 text-xs font-bold text-yellow-600 bg-yellow-50 p-2 rounded-xl inline-block">
                                    ⚠️ 注意：您選擇的日期非安息日 (週六)
                                </p>
                            )}
                        </div>
                        <div className="md:col-span-2 mt-2">
                            <label className="flex items-center space-x-3 cursor-pointer group">
                                <div className="relative">
                                    <input id="isCancelled" name="isCancelled" type="checkbox" checked={isCancelled} onChange={(e) => setIsCancelled(e.target.checked)} className="sr-only" />
                                    <div className={`block w-14 h-8 rounded-full transition-colors duration-300 ${isCancelled ? 'bg-red-400' : 'bg-gray-200'}`}></div>
                                    <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform duration-300 ${isCancelled ? 'transform translate-x-6' : ''}`}></div>
                                </div>
                                <div className="text-sm">
                                    <span className={`font-bold ${isCancelled ? 'text-red-500' : 'text-gray-600'}`}>本週停課</span>
                                    <p className="text-xs text-gray-400">勾選此項表示本日無授課</p>
                                </div>
                            </label>

                            {isCancelled && (
                                <div className="mt-4 animate-fade-in">
                                    <label htmlFor="cancellationReason" className={formLabelClass}>停課理由</label>
                                    <input type="text" id="cancellationReason" value={cancellationReason} onChange={e => setCancellationReason(e.target.value)} required className={`${formInputClass} bg-red-50 focus:border-red-300 focus:ring-red-200`} placeholder="例如：戶外活動、發傳單..." />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <fieldset disabled={isCancelled} className="space-y-6 disabled:opacity-50 transition-opacity duration-300">
                    {/* Curriculum */}
                    <div className="bg-white p-8 rounded-3xl shadow-lg shadow-blue-50 border border-white/50">
                        <h2 className="text-xl font-bold text-gray-700 border-b border-gray-100 pb-3 mb-6 flex items-center">
                            <span className="w-8 h-8 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mr-3 text-sm">2</span>
                            課程內容
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            {/* Worship */}
                            <div className="space-y-4 p-4 bg-blue-50/30 rounded-2xl">
                                <h3 className="font-bold text-blue-600 text-sm uppercase tracking-wider">崇拜課程</h3>
                                <div>
                                    <label htmlFor="worshipTopic" className={formLabelClass}>主題</label>
                                    <input type="text" id="worshipTopic" value={worshipTopic} onChange={e => setWorshipTopic(e.target.value)} className={`${formInputClass} bg-white`} placeholder="輸入課程主題..." />
                                </div>
                                <div>
                                    <label htmlFor="worshipTeacherName" className={formLabelClass}>老師</label>
                                    <input
                                        type="text"
                                        id="worshipTeacherName"
                                        list="teacher-list"
                                        value={worshipTeacherName}
                                        onChange={e => setWorshipTeacherName(e.target.value)}
                                        className={`${formInputClass} bg-white`}
                                        placeholder="選擇或輸入..."
                                    />
                                </div>
                            </div>
                            {/* Activity */}
                            <div className="space-y-4 p-4 bg-green-50/30 rounded-2xl">
                                <h3 className="font-bold text-green-600 text-sm uppercase tracking-wider">共習課程</h3>
                                <div>
                                    <label htmlFor="activityTopic" className={formLabelClass}>主題</label>
                                    <input type="text" id="activityTopic" value={activityTopic} onChange={e => setActivityTopic(e.target.value)} className={`${formInputClass} bg-white`} placeholder="輸入活動主題..." />
                                </div>
                                <div>
                                    <label htmlFor="activityTeacherName" className={formLabelClass}>老師</label>
                                    <input
                                        type="text"
                                        id="activityTeacherName"
                                        list="teacher-list"
                                        value={activityTeacherName}
                                        onChange={e => setActivityTeacherName(e.target.value)}
                                        className={`${formInputClass} bg-white`}
                                        placeholder="選擇或輸入..."
                                    />
                                </div>
                            </div>
                        </div>
                        <datalist id="teacher-list">
                            {teachersForClass.map(teacher => (
                                <option key={teacher.id} value={teacher.fullName} />
                            ))}
                        </datalist>
                    </div>

                    {/* Attendance */}
                    {classId && (
                        <div className="bg-white p-8 rounded-3xl shadow-lg shadow-yellow-50 border border-white/50">
                            <h2 className="text-xl font-bold text-gray-700 border-b border-gray-100 pb-3 mb-6 flex items-center">
                                <span className="w-8 h-8 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mr-3 text-sm">3</span>
                                出席狀況
                            </h2>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-gray-50/50 p-4 rounded-3xl border border-gray-100">
                                    <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center justify-between">
                                        <span>👶 學員</span>
                                        <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">{studentsForClass.length} 人</span>
                                    </h3>
                                    <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                                        {studentsForClass.length > 0 ? studentsForClass.map(student => (
                                            <AttendanceRow
                                                key={student.id}
                                                label={student.fullName}
                                                state={studentAttendance[student.id] || { status: AttendanceStatus.Present, reason: '' }}
                                                onChange={(field, value) => handleStudentAttendanceChange(student.id, field, value)}
                                                disabled={isCancelled}
                                            />
                                        )) : <p className="text-gray-400 text-center py-8 bg-white rounded-xl border border-dashed">此班級尚無學員</p>}
                                    </div>
                                </div>
                                <div className="bg-gray-50/50 p-4 rounded-3xl border border-gray-100">
                                    <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center justify-between">
                                        <span>🧑‍🏫 教員</span>
                                        <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">{teachersForClass.length} 人</span>
                                    </h3>
                                    <div className="space-y-2">
                                        {teachersForClass.length > 0 ? teachersForClass.map(teacher => (
                                            <AttendanceRow
                                                key={teacher.id}
                                                label={teacher.fullName}
                                                state={teacherAttendance[teacher.id] || { status: AttendanceStatus.Present, reason: '' }}
                                                onChange={(field, value) => handleTeacherAttendanceChange(teacher.id, field, value)}
                                                disabled={isCancelled}
                                            />
                                        )) : <p className="text-gray-400 text-center py-8 bg-white rounded-xl border border-dashed">此班級尚無教員</p>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Financials & Notes */}
                    <div className="bg-white p-8 rounded-3xl shadow-lg shadow-indigo-50 border border-white/50">
                        <h2 className="text-xl font-bold text-gray-700 border-b border-gray-100 pb-3 mb-6 flex items-center">
                            <span className="w-8 h-8 bg-indigo-100 text-indigo-500 rounded-full flex items-center justify-center mr-3 text-sm">4</span>
                            其他資訊
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <label htmlFor="offeringAmount" className={formLabelClass}>💰 奉獻金額</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-gray-400 sm:text-sm">$</span>
                                    </div>
                                    <input type="number" id="offeringAmount" value={offeringAmount} onChange={e => setOfferingAmount(e.target.value === '' ? '' : parseFloat(e.target.value))} className={`${formInputClass} pl-7`} placeholder="0.00" step="0.01" />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="auditorCount" className={formLabelClass}>👀 旁聽人數</label>
                                <input type="number" id="auditorCount" value={auditorCount} onChange={e => setAuditorCount(e.target.value === '' ? '' : parseInt(e.target.value, 10))} className={formInputClass} placeholder="0" min="0" />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="notes" className={formLabelClass}>📝 上課記事</label>
                            <textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} className={formInputClass} placeholder="記錄今日課程特別事項..."></textarea>
                        </div>
                    </div>
                </fieldset>

                {/* Submission */}
                <div className="flex justify-end pt-4 pb-10">
                    <button type="submit" className="bg-gradient-to-r from-cute-primary to-blue-400 text-white px-10 py-4 rounded-full hover:shadow-lg hover:scale-105 transition-all duration-300 flex items-center text-lg font-bold shadow-md disabled:bg-gray-300 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed" disabled={!classId}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M7.5 2.5a.5.5 0 00-1 0v3.586l-1.793-1.793a.5.5 0 00-.707.707l2.5 2.5a.5.5 0 00.707 0l2.5-2.5a.5.5 0 00-.707-.707L8.5 6.086V2.5zM12 11.5a.5.5 0 01.5-.5h2a.5.5 0 010 1h-2a.5.5 0 01-.5-.5zm-3 3a.5.5 0 01.5-.5h5a.5.5 0 010 1h-5a.5.5 0 01-.5-.5zM2 3a1 1 0 011-1h10a1 1 0 011 1v1h2a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V5a1 1 0 011-1h2V3zm1 2v10h12V5H3z" />
                        </svg>
                        儲存紀錄
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddNewClassSession;
