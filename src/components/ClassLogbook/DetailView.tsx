
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ClassSession, Teacher, Student, AttendanceStatus } from '../../types';
import { sessionService, classService, studentService, teacherAssignmentService } from '../../services';
import { useAuth } from '../../AuthContext';

interface LogbookData {
    session: ClassSession;
    attendingTeachers: { teacher: { id: number; fullName: string }; status: AttendanceStatus; reason?: string }[];
    studentAttendance: { student: { id: number; fullName: string }; status: AttendanceStatus; reason?: string }[];
}

interface AttendanceEditState {
    status: AttendanceStatus;
    reason: string;
}

// --- Helper Components & Functions ---

const getAttendanceStatusBadge = (status: AttendanceStatus, reason?: string) => {
    const baseClasses = "px-3 py-1 inline-flex text-xs font-bold rounded-full shadow-sm border";
    let badge;
    switch (status) {
        case AttendanceStatus.Present: badge = <span className={`${baseClasses} bg-green-100 text-green-700 border-green-200`}>出席</span>; break;
        case AttendanceStatus.Absent: badge = <span className={`${baseClasses} bg-red-100 text-red-700 border-red-200`}>缺席</span>; break;
        case AttendanceStatus.Late: badge = <span className={`${baseClasses} bg-yellow-100 text-yellow-700 border-yellow-200`}>遲到</span>; break;
        case AttendanceStatus.Excused: badge = <span className={`${baseClasses} bg-blue-100 text-blue-700 border-blue-200`}>請假</span>; break;
        default: badge = <span className={`${baseClasses} bg-gray-100 text-gray-600 border-gray-200`}>未知</span>;
    }

    return (
        <div className="flex items-center space-x-2">
            {badge}
            {reason && <span className="text-xs text-gray-400 font-bold italic">({reason})</span>}
        </div>
    );
};

const AttendanceEditRow: React.FC<{
    label: string,
    state: AttendanceEditState,
    onChange: (field: keyof AttendanceEditState, value: string) => void
}> = ({ label, state, onChange }) => {
    const buttons = [
        {
            value: AttendanceStatus.Present,
            label: '出席',
            activeClass: 'bg-gradient-to-b from-green-400 to-green-500 text-white shadow-green-200 shadow-lg transform scale-110 ring-2 ring-green-100',
            baseClass: 'hover:bg-green-50 text-green-600 border-green-200 bg-white'
        },
        {
            value: AttendanceStatus.Late,
            label: '遲到',
            activeClass: 'bg-gradient-to-b from-yellow-300 to-yellow-400 text-yellow-900 shadow-yellow-200 shadow-lg transform scale-110 ring-2 ring-yellow-100',
            baseClass: 'hover:bg-yellow-50 text-yellow-600 border-yellow-200 bg-white'
        },
        {
            value: AttendanceStatus.Excused,
            label: '請假',
            activeClass: 'bg-gradient-to-b from-blue-400 to-blue-500 text-white shadow-blue-200 shadow-lg transform scale-110 ring-2 ring-blue-100',
            baseClass: 'hover:bg-blue-50 text-blue-600 border-blue-200 bg-white'
        },
        {
            value: AttendanceStatus.Absent,
            label: '缺席',
            activeClass: 'bg-gradient-to-b from-red-400 to-red-500 text-white shadow-red-200 shadow-lg transform scale-110 ring-2 ring-red-100',
            baseClass: 'hover:bg-red-50 text-red-600 border-red-200 bg-white'
        },
    ];

    return (
        <div className="flex flex-col sm:flex-row sm:items-center py-3 border-b border-gray-50 last:border-0 gap-3 hover:bg-gray-50/50 rounded-2xl px-3 transition-all">
            <span className="w-full sm:w-24 text-sm font-black text-gray-600 truncate shrink-0" title={label}>{label}</span>
            <div className="flex-grow flex flex-wrap items-center gap-3">
                <div className="flex space-x-2">
                    {buttons.map((btn) => (
                        <button
                            key={btn.value}
                            type="button"
                            onClick={() => onChange('status', btn.value)}
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 border shadow-sm ${state.status === btn.value
                                ? `${btn.activeClass} border-transparent z-10`
                                : `${btn.baseClass}`
                                }`}
                        >
                            {btn.label.substring(0, 2)}
                        </button>
                    ))}
                </div>
                <input
                    type="text"
                    placeholder={state.status === AttendanceStatus.Present ? "出席" : "輸入原因..."}
                    value={state.reason}
                    onChange={e => onChange('reason', e.target.value)}
                    disabled={state.status === AttendanceStatus.Present}
                    className={`block w-full min-w-[120px] flex-grow rounded-full border-transparent shadow-inner focus:border-cute-primary focus:ring-cute-primary text-xs py-2.5 px-4 transition-colors font-medium ${state.status === AttendanceStatus.Present ? 'bg-gray-100 text-gray-400' : 'bg-white'}`}
                />
            </div>
        </div>
    );
};

// ====================================================================
// Detail View Component
// ====================================================================
const DetailView: React.FC<{ sessionId: string }> = ({ sessionId }) => {
    const navigate = useNavigate();
    const { isAdmin, userClassId } = useAuth();
    const [logbookData, setLogbookData] = useState<LogbookData | null>(null);
    const [className, setClassName] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [editableSession, setEditableSession] = useState<ClassSession | null>(null);

    // Class roster for attendance
    const [classStudents, setClassStudents] = useState<Student[]>([]);
    const [classTeachers, setClassTeachers] = useState<Teacher[]>([]);

    const [editableStudentAttendance, setEditableStudentAttendance] = useState<Record<number, AttendanceEditState>>({});
    const [editableTeacherAttendance, setEditableTeacherAttendance] = useState<Record<number, AttendanceEditState>>({});

    const fetchSession = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await sessionService.getById(parseInt(sessionId, 10));

            // Check permissions
            if (!isAdmin && userClassId && data.session.classId !== userClassId) {
                alert('您沒有權限檢視其他班級的紀錄。');
                navigate('/class-logbook');
                return;
            }

            // Fetch class name
            try {
                const classData = await classService.getById(data.session.classId);
                setClassName(classData.className);
            } catch {
                setClassName('未知班級');
            }

            // Transform data to match frontend types
            const attendingTeachers = (data as any).attendingTeachers?.map((rec: any) => ({
                teacher: rec.teacher,
                status: rec.status as AttendanceStatus,
                reason: rec.reason
            })) || [];

            const studentAttendance = (data as any).studentAttendance?.map((rec: any) => ({
                student: rec.student,
                status: rec.status as AttendanceStatus,
                reason: rec.reason
            })) || [];

            setLogbookData({
                session: data.session,
                attendingTeachers,
                studentAttendance
            });
        } catch (err) {
            console.error('Failed to fetch session:', err);
            setError('無法載入紀錄資料');
        } finally {
            setIsLoading(false);
        }
    }, [sessionId, isAdmin, userClassId, navigate]);

    const fetchClassRoster = useCallback(async (classId: number) => {
        try {
            // Fetch all active students in the class
            const students = await studentService.getAll({ classId, status: 'active' });
            setClassStudents(students);

            // Fetch teacher assignments for current academic year
            const currentYear = getAcademicYear();
            // Optimized query: filter by classId on backend
            const classAssignments = await teacherAssignmentService.getAll(currentYear, classId);

            const teachers = classAssignments
                .map(a => a.teacher)
                .filter((t): t is Teacher => t !== undefined) as Teacher[];

            setClassTeachers(teachers);
        } catch (err) {
            console.error('Failed to fetch class roster:', err);
            // Don't set error state, just log - this is not critical
        }
    }, []);

    useEffect(() => {
        fetchSession();
    }, [fetchSession]);

    const handleEditClick = async () => {
        if (logbookData) {
            setEditableSession({ ...logbookData.session });

            // Fetch the full class roster first
            await fetchClassRoster(logbookData.session.classId);

            setIsEditing(true);
        }
    };

    // Initialize attendance state when class roster is loaded
    useEffect(() => {
        if (isEditing && classStudents.length > 0) {
            const sAttendance: Record<number, AttendanceEditState> = {};

            // Initialize all students with default Present status
            classStudents.forEach(student => {
                sAttendance[student.id] = { status: AttendanceStatus.Present, reason: '' };
            });

            // Override with existing attendance records
            if (logbookData) {
                logbookData.studentAttendance.forEach(r => {
                    sAttendance[r.student.id] = { status: r.status, reason: r.reason || '' };
                });
            }

            setEditableStudentAttendance(sAttendance);
        }
    }, [isEditing, classStudents, logbookData]);

    useEffect(() => {
        if (isEditing && classTeachers.length > 0) {
            const tAttendance: Record<number, AttendanceEditState> = {};

            // Initialize all teachers with default Present status
            classTeachers.forEach(teacher => {
                tAttendance[teacher.id] = { status: AttendanceStatus.Present, reason: '' };
            });

            // Override with existing attendance records
            if (logbookData) {
                logbookData.attendingTeachers.forEach(r => {
                    tAttendance[r.teacher.id] = { status: r.status, reason: r.reason || '' };
                });
            }

            setEditableTeacherAttendance(tAttendance);
        }
    }, [isEditing, classTeachers, logbookData]);

    const handleCancelClick = () => {
        setIsEditing(false);
        setEditableSession(null);
    };

    const handleSaveClick = async () => {
        if (!editableSession || !logbookData) return;

        setIsSaving(true);
        try {
            // Update session details
            await sessionService.update(editableSession.id, editableSession);

            // Update attendance records
            const students = Object.entries(editableStudentAttendance).map(([id, data]: [string, AttendanceEditState]) => ({
                studentId: parseInt(id, 10),
                status: data.status,
                reason: data.reason || undefined
            }));

            const teachers = Object.entries(editableTeacherAttendance).map(([id, data]: [string, AttendanceEditState]) => ({
                teacherId: parseInt(id, 10),
                status: data.status,
                reason: data.reason || undefined
            }));

            await sessionService.updateAttendance(editableSession.id, { students, teachers });

            // Refresh data
            await fetchSession();
            setIsEditing(false);
            setEditableSession(null);
        } catch (err) {
            console.error('Failed to save session:', err);
            alert('儲存失敗，請稍後再試');
        } finally {
            setIsSaving(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';

        if (editableSession) {
            setEditableSession(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    [name]: isCheckbox
                        ? (e.target as HTMLInputElement).checked
                        : (name === 'offeringAmount' || name === 'auditorCount')
                            ? (value === '' ? 0 : parseFloat(value))
                            : value,
                };
            });
        }
    };

    const handleStudentAttendanceChange = (studentId: number, field: keyof AttendanceEditState, value: string) => {
        setEditableStudentAttendance(prev => {
            const newState = { ...prev[studentId], [field]: value };
            if (field === 'status' && value === AttendanceStatus.Present) {
                newState.reason = '';
            }
            return { ...prev, [studentId]: newState };
        });
    };

    const handleTeacherAttendanceChange = (teacherId: number, field: keyof AttendanceEditState, value: string) => {
        setEditableTeacherAttendance(prev => {
            const newState = { ...prev[teacherId], [field]: value };
            if (field === 'status' && value === AttendanceStatus.Present) {
                newState.reason = '';
            }
            return { ...prev, [teacherId]: newState };
        });
    };

    if (isLoading) return (
        <div className="p-8 text-center text-gray-500 font-bold">
            <div className="flex justify-center items-center">
                <svg className="animate-spin h-5 w-5 mr-3 text-church-blue-600" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                讀取紀錄中...
            </div>
        </div>
    );

    if (error) return (
        <div className="p-8 text-center">
            <p className="text-red-500 font-bold">{error}</p>
            <button onClick={fetchSession} className="mt-4 text-cute-primary underline">重試</button>
        </div>
    );

    if (!logbookData) return <div className="p-8 text-center text-gray-500">找不到紀錄</div>;

    const { session, attendingTeachers, studentAttendance } = logbookData;
    const totalAttendees = studentAttendance.filter(s => s.status === AttendanceStatus.Present || s.status === AttendanceStatus.Late).length + session.auditorCount;
    const backLink = `/class-logbook/class/${session.classId}`;
    const formInputClass = "mt-1 block w-full rounded-2xl border-transparent bg-white shadow-inner focus:border-cute-primary focus:ring-cute-primary sm:text-sm py-3 px-4 font-bold text-gray-700";

    return (
        <div className="p-4 sm:p-8">
            <div className="bg-white shadow-cute rounded-3xl overflow-hidden animate-fade-in border-4 border-white">
                <div className="p-8">
                    <div className="flex flex-col md:flex-row justify-between items-start mb-8 border-b border-gray-100 pb-6 gap-4">
                        <div>
                            <Link to={backLink} className="inline-flex items-center px-4 py-1.5 rounded-full bg-gray-100 text-xs font-bold text-gray-500 hover:bg-gray-200 mb-3 transition-colors">
                                &larr; 返回列表
                            </Link>
                            <h2 className="text-3xl font-black text-gray-800 mb-1">{className} 紀錄簿</h2>
                            <p className="text-gray-500 font-bold flex items-center mt-2">
                                <span className="bg-gray-100 px-3 py-1 rounded-lg text-sm mr-2">{session.date}</span>
                                <span className="bg-cute-primary/10 text-cute-primary px-3 py-1 rounded-lg text-sm">{session.sessionType}</span>
                            </p>
                        </div>
                        {!isEditing ? (
                            <button onClick={handleEditClick} className="flex items-center bg-cute-primary text-white px-6 py-3 rounded-full hover:bg-blue-500 hover:shadow-lg transition-all font-bold shadow-md">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg>
                                編輯紀錄
                            </button>
                        ) : (
                            <div className="flex space-x-3">
                                <button onClick={handleSaveClick} disabled={isSaving} className="flex items-center bg-green-500 text-white px-6 py-3 rounded-full hover:bg-green-600 hover:shadow-lg transform hover:-translate-y-0.5 transition-all font-bold shadow-md disabled:opacity-50">
                                    {isSaving ? '儲存中...' : '儲存'}
                                </button>
                                <button onClick={handleCancelClick} className="flex items-center bg-gray-200 text-gray-600 px-6 py-3 rounded-full hover:bg-gray-300 transition-all font-bold">
                                    取消
                                </button>
                            </div>
                        )}
                    </div>

                    {session.isCancelled && !isEditing && (
                        <div className="mb-8 p-6 bg-red-50 border-2 border-red-100 text-red-800 rounded-3xl text-center shadow-sm">
                            <p className="font-black text-3xl mb-2">🚫 本日已停課</p>
                            <p className="text-red-600 font-bold bg-white/50 inline-block px-4 py-1 rounded-xl">原因：{session.cancellationReason || '未提供'}</p>
                        </div>
                    )}

                    {isEditing && editableSession && (
                        <div className="mb-8 p-6 border-2 border-dashed border-red-200 rounded-3xl bg-red-50/30">
                            <div className="flex items-center mb-4">
                                <input id="isCancelled" name="isCancelled" type="checkbox" checked={editableSession.isCancelled || false} onChange={handleInputChange} className="w-6 h-6 text-red-500 rounded-lg focus:ring-red-400 border-gray-300" />
                                <label htmlFor="isCancelled" className="ml-3 font-black text-lg text-gray-700">標示為停課</label>
                            </div>
                            {editableSession.isCancelled && (
                                <div className="animate-fade-in">
                                    <label htmlFor="cancellationReason" className="block text-sm font-bold text-gray-600 mb-1">停課理由</label>
                                    <input type="text" id="cancellationReason" name="cancellationReason" value={editableSession.cancellationReason || ''} onChange={handleInputChange} required className={formInputClass} placeholder="例如：戶外活動..." />
                                </div>
                            )}
                        </div>
                    )}

                    {!isEditing && !session.isCancelled && (
                        <div className="absolute top-8 right-8 sm:right-48 hidden md:block">
                            <div className="text-center bg-blue-50 p-4 rounded-3xl border-4 border-white shadow-cute">
                                <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">實到人數</p>
                                <p className="text-4xl font-black text-blue-600">{totalAttendees}</p>
                            </div>
                        </div>
                    )}

                    <fieldset disabled={isEditing && editableSession?.isCancelled}>
                        <div className="mb-8 p-6 bg-purple-50/30 rounded-3xl border-4 border-white shadow-sm">
                            <h3 className="text-lg font-black text-purple-600 mb-6 flex items-center">
                                <span className="w-3 h-8 bg-purple-400 rounded-full mr-3"></span>
                                課程內容
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                {isEditing && editableSession ? (
                                    <>
                                        <div><label htmlFor="worshipTopic" className="block text-sm font-bold text-gray-600 mb-1">崇拜課程主題</label><input type="text" id="worshipTopic" name="worshipTopic" value={editableSession.worshipTopic || ''} onChange={handleInputChange} className={formInputClass} /></div>
                                        <div><label htmlFor="worshipTeacherName" className="block text-sm font-bold text-gray-600 mb-1">崇拜課程老師</label><input type="text" id="worshipTeacherName" name="worshipTeacherName" list="teacher-list" value={editableSession.worshipTeacherName || ''} onChange={handleInputChange} className={formInputClass} /></div>
                                        <div><label htmlFor="activityTopic" className="block text-sm font-bold text-gray-600 mb-1">共習課程主題</label><input type="text" id="activityTopic" name="activityTopic" value={editableSession.activityTopic || ''} onChange={handleInputChange} className={formInputClass} /></div>
                                        <div><label htmlFor="activityTeacherName" className="block text-sm font-bold text-gray-600 mb-1">共習課程老師</label><input type="text" id="activityTeacherName" name="activityTeacherName" list="teacher-list" value={editableSession.activityTeacherName || ''} onChange={handleInputChange} className={formInputClass} /></div>
                                        <datalist id="teacher-list">{classTeachers.map((teacher) => (<option key={teacher.id} value={teacher.fullName} />))}</datalist>
                                    </>
                                ) : (!session.isCancelled &&
                                    <>
                                        <div className="p-4 bg-white rounded-2xl shadow-sm"><p className="text-xs font-bold text-purple-400 uppercase mb-1">崇拜課程主題</p><p className="text-gray-800 font-black text-xl">{session.worshipTopic || '未填寫'}</p></div>
                                        <div className="p-4 bg-white/50 rounded-2xl border border-purple-100"><p className="text-xs font-bold text-gray-400 uppercase mb-1">崇拜課程老師</p><p className="text-gray-700 font-bold">{session.worshipTeacherName || '未填寫'}</p></div>
                                        <div className="p-4 bg-white rounded-2xl shadow-sm"><p className="text-xs font-bold text-purple-400 uppercase mb-1">共習課程主題</p><p className="text-gray-800 font-black text-xl">{session.activityTopic || '未填寫'}</p></div>
                                        <div className="p-4 bg-white/50 rounded-2xl border border-purple-100"><p className="text-xs font-bold text-gray-400 uppercase mb-1">共習課程老師</p><p className="text-gray-700 font-bold">{session.activityTeacherName || '未填寫'}</p></div>
                                    </>
                                )}
                            </div>
                        </div>

                        {!session.isCancelled && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                                <div className="bg-orange-50/30 p-6 rounded-3xl border-4 border-white shadow-sm">
                                    <h3 className="text-lg font-black text-orange-500 mb-6 flex items-center">
                                        <span className="w-3 h-8 bg-orange-400 rounded-full mr-3"></span>
                                        出席教員
                                    </h3>
                                    {isEditing ? (
                                        <div className="space-y-2">
                                            {classTeachers.map((teacher) => (
                                                <AttendanceEditRow key={teacher.id} label={teacher.fullName} state={editableTeacherAttendance[teacher.id] || { status: AttendanceStatus.Present, reason: '' }} onChange={(field, value) => handleTeacherAttendanceChange(teacher.id, field, value)} />
                                            ))}
                                        </div>
                                    ) : (
                                        <ul className="space-y-3">{attendingTeachers.map(({ teacher, status, reason }) => (<li key={teacher.id} className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-orange-100"><span className="font-bold text-gray-700">{teacher.fullName}</span>{getAttendanceStatusBadge(status, reason)}</li>))}</ul>
                                    )}
                                </div>
                                <div className="bg-green-50/30 p-6 rounded-3xl border-4 border-white shadow-sm">
                                    <h3 className="text-lg font-black text-green-600 mb-6 flex items-center">
                                        <span className="w-3 h-8 bg-green-400 rounded-full mr-3"></span>
                                        學員出席
                                    </h3>
                                    {isEditing ? (
                                        <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                                            {classStudents.map((student) => (
                                                <AttendanceEditRow key={student.id} label={student.fullName} state={editableStudentAttendance[student.id] || { status: AttendanceStatus.Present, reason: '' }} onChange={(field, value) => handleStudentAttendanceChange(student.id, field, value)} />
                                            ))}
                                        </div>
                                    ) : (
                                        <ul className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">{studentAttendance.map(({ student, status, reason }) => (<li key={student.id} className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-green-100"><span className="font-bold text-gray-700">{student.fullName}</span>{getAttendanceStatusBadge(status, reason)}</li>))}</ul>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-cyan-50/30 p-6 rounded-3xl border-4 border-white shadow-sm">
                                <h3 className="text-lg font-black text-cyan-600 mb-6 flex items-center">
                                    <span className="w-3 h-8 bg-cyan-400 rounded-full mr-3"></span>
                                    其他資訊
                                </h3>
                                <div className="space-y-6">
                                    {isEditing && editableSession ? (
                                        <>
                                            <div><label htmlFor="auditorCount" className="block text-sm font-bold text-gray-600 mb-1">👀 旁聽人數</label><input type="number" id="auditorCount" name="auditorCount" min="0" value={editableSession.auditorCount} onChange={handleInputChange} className={formInputClass} /></div>
                                            <div><label htmlFor="offeringAmount" className="block text-sm font-bold text-gray-600 mb-1">💰 奉獻金額</label><input type="number" step="0.01" id="offeringAmount" name="offeringAmount" value={editableSession.offeringAmount} onChange={handleInputChange} className={formInputClass} /></div>
                                        </>
                                    ) : (!session.isCancelled &&
                                        <>
                                            <div className="flex justify-between items-center border-b border-cyan-100/50 pb-4">
                                                <span className="text-sm font-bold text-gray-500">👀 旁聽人數</span>
                                                <span className="text-2xl font-black text-gray-700 bg-white px-4 py-1 rounded-xl shadow-sm">{session.auditorCount}</span>
                                            </div>
                                            <div className="flex justify-between items-center pt-2">
                                                <span className="text-sm font-bold text-gray-500">💰 奉獻金額</span>
                                                <span className="text-2xl font-black text-gray-700 bg-white px-4 py-1 rounded-xl shadow-sm">${session.offeringAmount.toFixed(2)}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="bg-pink-50/30 p-6 rounded-3xl border-4 border-white shadow-sm md:col-span-1">
                                <h3 className="text-lg font-black text-pink-500 mb-6 flex items-center">
                                    <span className="w-3 h-8 bg-pink-400 rounded-full mr-3"></span>
                                    上課記事
                                </h3>
                                {isEditing && editableSession ? (
                                    <div><label htmlFor="notes" className="sr-only">上課記事</label><textarea id="notes" name="notes" value={editableSession.notes || ''} onChange={handleInputChange} rows={5} className={formInputClass} placeholder="記錄今日課程特別事項..."></textarea></div>
                                ) : (<div className="text-base text-gray-700 whitespace-pre-wrap bg-white p-6 rounded-2xl h-full leading-relaxed font-medium shadow-sm">{session.notes || '無特別記事。'}</div>)}
                            </div>
                        </div>
                    </fieldset>
                </div>
            </div>
        </div>
    );
};

export default DetailView;
