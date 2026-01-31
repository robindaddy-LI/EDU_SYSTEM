import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Teacher, TeacherType, Class } from '../types';
import { teacherService } from '../services/teacherService';
import { teacherAssignmentService } from '../services/teacherAssignmentService';

interface AssignedClassInfo extends Class {
    mainTeacher?: string;
}

// --- Helper Functions for Academic Year ---
/**
 * Converts a Gregorian year to a Republic of China (ROC) year.
 * @param gregorianYear The Gregorian year number.
 * @returns The ROC year number.
 */
const gregorianToRoc = (gregorianYear: number): number => {
    return gregorianYear - 1911;
};
// -----------------------------------------


const TeacherDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [teacher, setTeacher] = useState<Teacher | undefined>(undefined);
    const [assignmentsByYear, setAssignmentsByYear] = useState<Record<string, AssignedClassInfo[]>>({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchTeacherData = async () => {
            if (!id) return;
            setIsLoading(true);
            try {
                const teacherId = parseInt(id, 10);

                // Fetch teacher and all assignments in parallel
                const [teacherData, allAssignments] = await Promise.all([
                    teacherService.getById(teacherId),
                    teacherAssignmentService.getAll() // Assuming this returns all history
                ]);

                setTeacher(teacherData);

                if (teacherData) {
                    const myAssignments = allAssignments.filter(a => a.teacherId === teacherId);
                    const groupedAssignments: Record<string, AssignedClassInfo[]> = {};

                    // Sort assignments by year descending for better UI interaction logic if needed later
                    // But here we just group them.

                    myAssignments.forEach(assignment => {
                        const year = assignment.academicYear;
                        if (!groupedAssignments[year]) {
                            groupedAssignments[year] = [];
                        }

                        // Extract class info. 
                        // Note: The API returns class object inside assignment.
                        // We need to map it to AssignedClassInfo structure.
                        // Check naming: API usually returns `name` for class name, frontend uses `className`.
                        if (assignment.class) {
                            // Find the lead teacher for this class in this year
                            const leadAssignment = allAssignments.find(a =>
                                a.classId === assignment.classId &&
                                a.academicYear === year &&
                                a.isLead
                            );

                            const mainTeacherName = leadAssignment?.teacher?.fullName;

                            // Prevent duplicates
                            if (!groupedAssignments[year].some(c => c.id === assignment.classId)) {
                                groupedAssignments[year].push({
                                    id: assignment.classId,
                                    name: assignment.class.name,
                                    mainTeacher: mainTeacherName
                                } as AssignedClassInfo);
                            }
                        }
                    });

                    setAssignmentsByYear(groupedAssignments);
                }
            } catch (err) {
                console.error("Failed to load teacher detail:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTeacherData();
    }, [id]);

    const handleDelete = async () => {
        if (!teacher) return;
        const confirmation = window.confirm(`您確定要刪除教員「${teacher.fullName}」嗎？此操作無法復原。`);
        if (confirmation) {
            try {
                await teacherService.delete(teacher.id);
                alert('教員已成功刪除。');
                navigate('/teachers');
            } catch (err) {
                console.error("Delete failed:", err);
                alert('刪除失敗，請稍後再試。');
            }
        }
    };

    const getTeacherTypeName = (type: TeacherType) => {
        switch (type) {
            case TeacherType.Formal: return '正式教員';
            case TeacherType.Trainee: return '見習教員';
            default: return '未知';
        }
    };

    const renderDetailItem = (label: string, value?: string | null) => (
        <div>
            <dt className="text-sm font-medium text-gray-500">{label}</dt>
            <dd className="mt-1 text-base text-gray-900">{value || '未提供'}</dd>
        </div>
    );

    const renderStatusItem = (label: string, value: 'active' | 'inactive') => (
        <div>
            <dt className="text-sm font-medium text-gray-500">{label}</dt>
            <dd className="mt-1 text-base text-gray-900">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${value === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {value === 'active' ? '在職' : '離職'}
                </span>
            </dd>
        </div>
    );

    if (isLoading) {
        return <div className="p-8 text-center">讀取中...</div>;
    }

    if (!teacher) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-2xl font-bold text-gray-700">找不到教員資料</h2>
                <p className="mt-2 text-gray-500">無法找到 ID 為 {id} 的教員，請確認連結是否正確。</p>
                <Link to="/teachers" className="mt-6 inline-block bg-church-blue-600 text-white px-4 py-2 rounded-lg hover:bg-church-blue-700 transition-colors">
                    返回教員列表
                </Link>
            </div>
        );
    }

    const sortedYears = Object.keys(assignmentsByYear).sort((a, b) => parseInt(b) - parseInt(a));

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">{teacher.fullName}</h1>
                <div className="flex space-x-2">
                    <Link
                        to={`/teachers/${teacher.id}/edit`}
                        className="bg-church-blue-600 text-white px-4 py-2 rounded-lg hover:bg-church-blue-700 transition-colors duration-200 flex items-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" />
                        </svg>
                        編輯資料
                    </Link>
                    <button
                        onClick={handleDelete}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors duration-200 flex items-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        刪除教員
                    </button>
                    <Link to="/teachers" className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors duration-200 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        返回列表
                    </Link>
                </div>
            </div>

            <div className="bg-white shadow-lg rounded-xl overflow-hidden divide-y divide-gray-200">
                {/* Basic Info */}
                <div className="p-6 sm:p-8">
                    <h2 className="text-xl font-semibold text-gray-700 mb-4">基本資料</h2>
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                        {renderDetailItem('姓名', teacher.fullName)}
                        {renderDetailItem('教員類別', getTeacherTypeName(teacher.teacherType))}
                        {renderStatusItem('狀態', teacher.status)}
                    </dl>
                </div>

                {/* Contact Info */}
                <div className="p-6 sm:p-8">
                    <h2 className="text-xl font-semibold text-gray-700 mb-4">聯絡方式</h2>
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                        {renderDetailItem('電話', teacher.phone)}
                        {renderDetailItem('電子郵件', teacher.email)}
                    </dl>
                </div>

                {/* Assigned Classes History */}
                <div className="p-6 sm:p-8">
                    <h2 className="text-xl font-semibold text-gray-700 mb-4">歷年負責班級</h2>
                    {sortedYears.length > 0 ? (
                        <div className="space-y-6">
                            {sortedYears.map(year => (
                                <div key={year}>
                                    <h3 className="text-md font-semibold text-gray-600 border-b pb-2 mb-3">
                                        {gregorianToRoc(parseInt(year, 10))} 學年度
                                    </h3>
                                    <ul className="space-y-3">
                                        {assignmentsByYear[year].map(cls => (
                                            <li key={cls.id} className="p-3 bg-gray-50 rounded-md flex items-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-church-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a3.002 3.002 0 01-3.71-1.29l-1.123-1.945A3 3 0 012 8.324V6c0-1.105.895-2 2-2h12c1.105 0 2 .895 2 2v2.324a3 3 0 01-1.88 2.775l-1.123 1.945a3.002 3.002 0 01-3.71 1.29m-3.71-1.29a3.002 3.002 0 01-3.142 0" /></svg>
                                                <div>
                                                    <span className="font-medium text-gray-800">{cls.name}</span>
                                                    {cls.mainTeacher && (
                                                        <span className="ml-2 text-sm text-gray-500">(班負責: {cls.mainTeacher})</span>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500">尚無任何班級分配紀錄。</p>
                    )}
                </div>


                {/* Notes */}
                {teacher.notes && (
                    <div className="p-6 sm:p-8">
                        <h2 className="text-xl font-semibold text-gray-700 mb-2">備註</h2>
                        <p className="text-base text-gray-800 whitespace-pre-wrap bg-gray-50 p-4 rounded-md">{teacher.notes}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeacherDetail;