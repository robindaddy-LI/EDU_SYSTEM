
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Class, ClassSession, Teacher, Student, AttendanceStatus } from '../types';
import { mockClasses, mockClassSessions, mockTeachers, mockStudents, mockTeacherAttendanceRecords, mockStudentAttendanceRecords } from '../data/mockData';
import { useAuth } from '../AuthContext';

interface LogbookData {
    session: ClassSession;
    attendingTeachers: { teacher: Teacher; status: AttendanceStatus; reason?: string }[];
    studentAttendance: { student: Student; status: AttendanceStatus; reason?: string }[];
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
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 border shadow-sm ${
                                state.status === btn.value
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
// 3. Detail View Component
// ====================================================================
const ClassSessionDetailView: React.FC<{ sessionId: string }> = ({ sessionId }) => {
    const navigate = useNavigate();
    const { isAdmin, userClassId } = useAuth();
    const [logbookData, setLogbookData] = useState<LogbookData | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [editableSession, setEditableSession] = useState<ClassSession | null>(null);
    
    const [editableStudentAttendance, setEditableStudentAttendance] = useState<Record<number, AttendanceEditState>>({});
    const [editableTeacherAttendance, setEditableTeacherAttendance] = useState<Record<number, AttendanceEditState>>({});

    useEffect(() => {
        setIsLoading(true);
        setIsEditing(false);

        setTimeout(() => {
            const session = mockClassSessions.find(s => s.id === parseInt(sessionId, 10));
            
            if (session && !isAdmin && userClassId && session.classId !== userClassId) {
                alert('您沒有權限檢視其他班級的紀錄。');
                navigate('/class-logbook');
                return;
            }

            if (session) {
                const teacherRecords = mockTeacherAttendanceRecords
                    .filter(rec => rec.sessionId === session.id)
                    .map(rec => ({ teacher: mockTeachers.find(t => t.id === rec.teacherId)!, status: rec.status, reason: rec.reason }))
                    .filter(item => item.teacher);
                const studentRecords = mockStudentAttendanceRecords
                    .filter(rec => rec.sessionId === session.id)
                    .map(rec => ({ student: mockStudents.find(s => s.id === rec.studentId)!, status: rec.status, reason: rec.reason }))
                    .filter(item => item.student);
                setLogbookData({ session, attendingTeachers: teacherRecords, studentAttendance: studentRecords });
            } else {
                setLogbookData(null);
            }
            setIsLoading(false);
        }, 300);
    }, [sessionId, isAdmin, userClassId, navigate]);

    const handleEditClick = () => {
        if (logbookData) {
            setEditableSession({ ...logbookData.session });
            
            const sAttendance: Record<number, AttendanceEditState> = {};
            logbookData.studentAttendance.forEach(r => {
                sAttendance[r.student.id] = { status: r.status, reason: r.reason || '' };
            });
            setEditableStudentAttendance(sAttendance);

            const tAttendance: Record<number, AttendanceEditState> = {};
            logbookData.attendingTeachers.forEach(r => {
                tAttendance[r.teacher.id] = { status: r.status, reason: r.reason || '' };
            });
            setEditableTeacherAttendance(tAttendance);

            setIsEditing(true);
        }
    };
    
    const handleCancelClick = () => {
        setIsEditing(false);
        setEditableSession(null);
    };

    const handleSaveClick = () => {
        if (!editableSession || !logbookData) return;
        
        const sessionIdInt = parseInt(sessionId, 10);
        const sessionIndex = mockClassSessions.findIndex(s => s.id === editableSession.id);
        if (sessionIndex !== -1) {
            mockClassSessions[sessionIndex] = editableSession;
        }

        Object.entries(editableStudentAttendance).forEach(([studentIdStr, data]) => {
            const studentId = parseInt(studentIdStr, 10);
            const recordIndex = mockStudentAttendanceRecords.findIndex(r => r.sessionId === sessionIdInt && r.studentId === studentId);
            if (recordIndex !== -1) {
                const val = data as AttendanceEditState;
                mockStudentAttendanceRecords[recordIndex] = { ...mockStudentAttendanceRecords[recordIndex], status: val.status, reason: val.reason || undefined };
            }
        });

        Object.entries(editableTeacherAttendance).forEach(([teacherIdStr, data]) => {
            const teacherId = parseInt(teacherIdStr, 10);
            const recordIndex = mockTeacherAttendanceRecords.findIndex(r => r.sessionId === sessionIdInt && r.teacherId === teacherId);
            if (recordIndex !== -1) {
                const val = data as AttendanceEditState;
                mockTeacherAttendanceRecords[recordIndex] = { ...mockTeacherAttendanceRecords[recordIndex], status: val.status, reason: val.reason || undefined };
            }
        });

        const updatedStudentRecords = logbookData.studentAttendance.map(r => {
             const editData = editableStudentAttendance[r.student.id];
             return { ...r, status: editData.status, reason: editData.reason || undefined };
        });
        const updatedTeacherRecords = logbookData.attendingTeachers.map(r => {
             const editData = editableTeacherAttendance[r.teacher.id];
             return { ...r, status: editData.status, reason: editData.reason || undefined };
        });

        setLogbookData({ 
            session: editableSession, 
            studentAttendance: updatedStudentRecords, 
            attendingTeachers: updatedTeacherRecords 
        });
       
        setIsEditing(false);
        setEditableSession(null);
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

    if (isLoading) return <div className="p-8 text-center text-gray-500 font-bold">讀取紀錄中...</div>;
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
                            <h2 className="text-3xl font-black text-gray-800 mb-1">{mockClasses.find(c => c.id === session.classId)?.className} 紀錄簿</h2>
                            <p className="text-gray-500 font-bold flex items-center mt-2">
                                <span className="bg-gray-100 px-3 py-1 rounded-lg text-sm mr-2">{session.sessionDate}</span>
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
                                <button onClick={handleSaveClick} className="flex items-center bg-green-500 text-white px-6 py-3 rounded-full hover:bg-green-600 hover:shadow-lg transform hover:-translate-y-0.5 transition-all font-bold shadow-md">
                                    儲存
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
                                        <datalist id="teacher-list">{attendingTeachers.map(({ teacher }) => (<option key={teacher.id} value={teacher.fullName} />))}</datalist>
                                    </>
                                ) : ( !session.isCancelled &&
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
                                            {attendingTeachers.map(({ teacher }) => (
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
                                            {studentAttendance.map(({ student }) => (
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
                                    ) : ( !session.isCancelled &&
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

// ====================================================================
// 2. List View Component
// ====================================================================
const ClassLogbookListView: React.FC<{ classId: string }> = ({ classId }) => {
    const { isAdmin, userClassId } = useAuth();
    const navigate = useNavigate();

    if (!isAdmin && userClassId && parseInt(classId) !== userClassId) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-2xl font-bold text-red-500">🚫 存取被拒</h2>
                <Link to={`/class-logbook/class/${userClassId}`} className="mt-4 inline-block text-cute-primary font-bold hover:underline">前往我的班級紀錄</Link>
            </div>
        );
    }

    const numericClassId = parseInt(classId, 10);
    const currentClass = mockClasses.find(c => c.id === numericClassId);
    
    const sessions = useMemo(() => mockClassSessions
        .filter(s => s.classId === numericClassId)
        .sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime()),
        [numericClassId]
    );

    if (!currentClass) return <div className="p-8 text-center text-gray-500">找不到班級</div>;

    return (
        <div className="p-4 sm:p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    {isAdmin && <Link to="/class-logbook" className="text-xs font-bold text-gray-400 hover:text-cute-primary mb-1 block transition-colors">&larr; 返回總覽</Link>}
                    <h1 className="text-3xl font-black text-gray-800">{currentClass.className} 紀錄列表</h1>
                </div>
                <Link to="/class-logbook/new" className="bg-cute-primary text-white px-6 py-3 rounded-full hover:bg-blue-500 shadow-cute hover:shadow-cute-hover hover:-translate-y-1 transition-all duration-300 font-bold flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    新增紀錄
                </Link>
            </div>

            <div className="grid gap-4">
                {sessions.length > 0 ? (
                    sessions.map(session => (
                        <Link key={session.id} to={`/class-logbook/session/${session.id}`} className="group block bg-white rounded-3xl p-6 shadow-sm border-4 border-transparent hover:border-cute-primary/20 hover:shadow-cute transition-all duration-200">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-5">
                                    <div className="text-center bg-gray-50 rounded-2xl p-3 min-w-[80px] border border-gray-100">
                                        <div className="text-xs font-black text-gray-400 uppercase tracking-wider">{new Date(session.sessionDate).toLocaleDateString('en-US', { month: 'short' })}</div>
                                        <div className="text-2xl font-black text-gray-700">{new Date(session.sessionDate).getDate()}</div>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-800 group-hover:text-cute-primary transition-colors">
                                            {session.isCancelled ? <span className="text-red-500 bg-red-50 px-2 py-0.5 rounded-lg">🚫 已停課 ({session.cancellationReason})</span> : session.worshipTopic || <span className="text-gray-400 italic">無主題</span>}
                                        </h3>
                                        <p className="text-sm text-gray-500 mt-1 font-medium">{!session.isCancelled && `共習: ${session.activityTopic || '-'}`}</p>
                                    </div>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-full text-gray-300 group-hover:bg-cute-primary group-hover:text-white transition-all shadow-sm">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path></svg>
                                </div>
                            </div>
                        </Link>
                    ))
                ) : (
                    <div className="text-center py-16 bg-white rounded-3xl border-4 border-dashed border-gray-200">
                        <p className="text-gray-400 font-bold text-lg">尚無任何紀錄 📝</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// ====================================================================
// 1. Dashboard View Component
// ====================================================================
const ClassLogbookDashboardView: React.FC = () => {
    const { isAdmin, userClassId } = useAuth();

    const availableClasses = useMemo(() => {
        if (isAdmin) return mockClasses;
        if (userClassId) return mockClasses.filter(c => c.id === userClassId);
        return [];
    }, [isAdmin, userClassId]);

    const sessionCounts = useMemo(() => availableClasses.map(cls => {
        const count = mockClassSessions.filter(s => s.classId === cls.id).length;
        return { ...cls, count };
    }), [availableClasses]);

    const bgColors = ['bg-blue-100', 'bg-pink-100', 'bg-yellow-100', 'bg-green-100', 'bg-purple-100'];
    const textColors = ['text-blue-600', 'text-pink-600', 'text-yellow-600', 'text-green-600', 'text-purple-600'];

    return (
         <div className="p-4 sm:p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-black text-gray-800">📚 班級紀錄簿</h1>
                <Link to="/class-logbook/new" className="bg-cute-primary text-white px-6 py-3 rounded-full hover:bg-blue-500 shadow-cute hover:shadow-cute-hover hover:-translate-y-1 transition-all duration-300 font-bold flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    新增紀錄
                </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {sessionCounts.length > 0 ? (
                    sessionCounts.map((cls, index) => {
                        const bgClass = bgColors[index % bgColors.length];
                        const textClass = textColors[index % textColors.length];
                        return (
                            <Link to={`/class-logbook/class/${cls.id}`} key={cls.id} className="group block bg-white p-8 rounded-3xl shadow-cute hover:shadow-cute-hover hover:-translate-y-2 transition-all duration-300 border-4 border-white relative overflow-hidden">
                                <div className={`absolute top-0 right-0 w-32 h-32 -mr-10 -mt-10 rounded-full opacity-20 ${bgClass}`}></div>
                                <div className="relative z-10">
                                    <div className={`w-14 h-14 rounded-2xl ${bgClass} ${textClass} flex items-center justify-center mb-4 shadow-inner`}>
                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5-1.253" /></svg>
                                    </div>
                                    <h2 className="text-2xl font-black text-gray-800 group-hover:text-cute-primary transition-colors">{cls.className}</h2>
                                    <p className="text-gray-400 font-bold mt-1">{cls.count} 筆紀錄</p>
                                </div>
                            </Link>
                        );
                    })
                ) : (
                    <div className="col-span-full text-center py-16 bg-white rounded-3xl border-4 border-dashed border-gray-200">
                        <p className="text-gray-400 font-bold text-lg">沒有可顯示的班級 🙈</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const ClassLogbook: React.FC = () => {
    const { classId, sessionId } = useParams<{ classId?: string; sessionId?: string; }>();
    if (sessionId) return <ClassSessionDetailView sessionId={sessionId} />;
    if (classId) return <ClassLogbookListView classId={classId} />;
    return <ClassLogbookDashboardView />;
};

export default ClassLogbook;