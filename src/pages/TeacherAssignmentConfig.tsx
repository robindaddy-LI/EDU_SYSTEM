import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Teacher, Class } from '../types';
import { teacherService, classService, teacherAssignmentService } from '../services';
import { getAcademicYear, getAcademicYearOptions } from '../utils/academicYear';

interface AssignmentRow {
    classId: number;
    className: string;
    teachers: {
        teacherId: number;
        fullName: string;
        isLead: boolean;
    }[];
}

const TeacherAssignmentConfig: React.FC = () => {
    const navigate = useNavigate();
    const [academicYear, setAcademicYear] = useState<string>(getAcademicYear());
    const [classes, setClasses] = useState<Class[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Initial data load
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [classData, teacherData] = await Promise.all([
                    classService.getAll(),
                    teacherService.getAll({ status: 'active' }) // Only show active teachers
                ]);
                setClasses(classData);
                setTeachers(teacherData);
            } catch (err) {
                console.error('Failed to load initial data:', err);
                setError('無法載入班級或教員資料');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    // Load assignments when academic year or classes change
    useEffect(() => {
        if (classes.length === 0) return;

        const fetchAssignments = async () => {
            try {
                const assignmentData = await teacherAssignmentService.getAll(academicYear);

                // Map existing assignments to our UI structure
                const initialRows: AssignmentRow[] = classes.map(cls => {
                    const classAssignments = assignmentData.filter(a => a.classId === cls.id);
                    return {
                        classId: cls.id,
                        name: cls.className, // Assuming Class type has className, mapping it to 'name' for AssignmentRow
                        teachers: classAssignments.map(a => ({
                            teacherId: a.teacherId,
                            fullName: a.teacher?.fullName || 'Unknown',
                            isLead: a.isLead
                        }))
                    };
                });

                setAssignments(initialRows);
            } catch (err) {
                console.error('Failed to load assignments:', err);
                setError('無法載入指派資料');
            }
        };
        fetchAssignments();
    }, [academicYear, classes]);

    const handleAddTeacher = (classId: number, teacherIdStr: string) => {
        const teacherId = parseInt(teacherIdStr);
        if (!teacherId) return;

        const teacher = teachers.find(t => t.id === teacherId);
        if (!teacher) return;

        setAssignments(prev => prev.map(row => {
            if (row.classId !== classId) return row;

            // Prevent duplicates
            if (row.teachers.some(t => t.teacherId === teacherId)) return row;

            return {
                ...row,
                teachers: [...row.teachers, {
                    teacherId,
                    fullName: teacher.fullName,
                    isLead: false
                }]
            };
        }));
    };

    const handleRemoveTeacher = (classId: number, teacherId: number) => {
        setAssignments(prev => prev.map(row => {
            if (row.classId !== classId) return row;
            return {
                ...row,
                teachers: row.teachers.filter(t => t.teacherId !== teacherId)
            };
        }));
    };

    const handleToggleLead = (classId: number, teacherId: number) => {
        setAssignments(prev => prev.map(row => {
            if (row.classId !== classId) return row;
            return {
                ...row,
                teachers: row.teachers.map(t => {
                    if (t.teacherId === teacherId) {
                        return { ...t, isLead: !t.isLead };
                    }
                    return t;
                })
            };
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);
        setSuccessMessage(null);

        try {
            // Flatten assignments for API
            const batchData = {
                academicYear,
                assignments: assignments.flatMap(row =>
                    row.teachers.map(t => ({
                        teacherId: t.teacherId,
                        classId: row.classId,
                        isLead: t.isLead
                    }))
                )
            };

            const result = await teacherAssignmentService.batchUpsert(batchData);
            if (result.success) {
                setSuccessMessage(`成功儲存 ${result.count} 筆指派資料`);
                // Auto-dismiss success message
                setTimeout(() => setSuccessMessage(null), 3000);
            }
        } catch (err) {
            console.error('Failed to save assignments:', err);
            setError('儲存失敗，請檢查網路連線');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center text-gray-500">載入中...</div>;
    }

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/teachers')}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        &larr; 返回教員列表
                    </button>
                    <h1 className="text-3xl font-bold text-gray-800">年度教員指派</h1>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <label className="font-medium text-gray-700">學年度:</label>
                        <select
                            value={academicYear}
                            onChange={(e) => setAcademicYear(e.target.value)}
                            className="border rounded-md px-3 py-1.5 focus:ring-2 focus:ring-church-blue-500"
                        >
                            {getAcademicYearOptions().map(year => (
                                <option key={year} value={year}>{year} ({year}-{year + 1})</option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`px-6 py-2 rounded-lg text-white font-medium transition-colors
                            ${isSaving
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-church-blue-600 hover:bg-church-blue-700'}`}
                    >
                        {isSaving ? '儲存中...' : '儲存變更'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
                    {error}
                </div>
            )}

            {successMessage && (
                <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-lg border border-green-200">
                    {successMessage}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {assignments.map(row => (
                    <div key={row.classId} className="bg-white rounded-lg shadow-md border p-5 flex flex-col h-full">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b">
                            {row.name}
                        </h3>

                        <div className="flex-grow space-y-3 mb-4">
                            {row.teachers.length === 0 ? (
                                <div className="text-gray-400 text-sm italic py-2 text-center">
                                    尚未指派教員
                                </div>
                            ) : (
                                row.teachers.map(t => (
                                    <div
                                        key={t.teacherId}
                                        className={`flex items-center justify-between p-2 rounded border 
                                            ${t.isLead ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-800">{t.fullName}</span>
                                            {t.isLead && (
                                                <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                                                    班負責
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleToggleLead(row.classId, t.teacherId)}
                                                className={`p-1 rounded text-xs border ${t.isLead
                                                    ? 'bg-blue-600 text-white border-blue-600'
                                                    : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'}`}
                                                title={t.isLead ? "取消班負責" : "設為班負責"}
                                            >
                                                ★
                                            </button>
                                            <button
                                                onClick={() => handleRemoveTeacher(row.classId, t.teacherId)}
                                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                                                title="移除"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="mt-auto pt-3 border-t">
                            <select
                                className="w-full text-sm border rounded p-2 text-gray-600 focus:ring-2 focus:ring-church-blue-500 outline-none"
                                onChange={(e) => {
                                    handleAddTeacher(row.classId, e.target.value);
                                    e.target.value = ""; // Reset select
                                }}
                                defaultValue=""
                            >
                                <option value="" disabled>+ 新增教員...</option>
                                {teachers
                                    .filter(t => !row.teachers.some(assigned => assigned.teacherId === t.id))
                                    .sort((a, b) => a.fullName.localeCompare(b.fullName))
                                    .map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.fullName}
                                        </option>
                                    ))
                                }
                            </select>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TeacherAssignmentConfig;
