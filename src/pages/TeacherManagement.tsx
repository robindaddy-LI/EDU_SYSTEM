
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Teacher, TeacherType } from '../types';
import { teacherService, classService } from '../services';
import { useAuth } from '../AuthContext';

const TeacherManagement: React.FC = () => {
    const { isAdmin, isClassLead, userClassId } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [userClassName, setUserClassName] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch user's class name for display
    useEffect(() => {
        const fetchClassName = async () => {
            if (isClassLead && userClassId) {
                try {
                    const classData = await classService.getById(userClassId);
                    setUserClassName(classData.name);
                } catch (err) {
                    console.error('Failed to fetch class name:', err);
                }
            }
        };
        fetchClassName();
    }, [isClassLead, userClassId]);

    // Fetch teachers when filters change
    const fetchTeachers = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const filter: { status?: 'active' | 'inactive'; search?: string } = {};

            // Apply status filter
            if (statusFilter !== 'all') {
                filter.status = statusFilter;
            }

            // Apply search term
            if (searchTerm.trim()) {
                filter.search = searchTerm.trim();
            }

            const data = await teacherService.getAll(filter);
            setTeachers(data);
        } catch (err) {
            console.error('Failed to fetch teachers:', err);
            setError('無法載入教員資料，請稍後再試。');
        } finally {
            setIsLoading(false);
        }
    }, [statusFilter, searchTerm]);

    useEffect(() => {
        // Debounce search
        const timeoutId = setTimeout(() => {
            fetchTeachers();
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [fetchTeachers]);

    const getTeacherTypeName = (type: TeacherType) => {
        switch (type) {
            case TeacherType.Formal:
                return '正式教員';
            case TeacherType.Trainee:
                return '見習教員';
            default:
                return '未知';
        }
    };

    const getStatusName = (status: 'active' | 'inactive') => {
        return status === 'active' ? '在職' : '離職';
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">教員管理</h1>
                {isAdmin && (
                    <div className="flex gap-3">
                        <Link
                            to="/teacher-assignments"
                            className="bg-white text-church-blue-600 border border-church-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors duration-200 flex items-center"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                            教員指派
                        </Link>
                        <Link
                            to="/teachers/new"
                            className="bg-church-blue-600 text-white px-4 py-2 rounded-lg hover:bg-church-blue-700 transition-colors duration-200 flex items-center"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            新增教員
                        </Link>
                    </div>
                )}
            </div>

            {isClassLead && userClassName && (
                <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded-lg text-sm">
                    僅顯示 {userClassName} 相關的教員資料
                </div>
            )}

            <div className="mb-6 flex flex-col md:flex-row gap-4 justify-between">
                <div className="relative flex-grow">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </span>
                    <input
                        type="text"
                        placeholder="依姓名搜尋教員..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-church-blue-500 bg-white text-gray-900"
                        aria-label="搜尋教員"
                    />
                </div>
                <div className="flex items-center space-x-4 bg-gray-100 p-2 rounded-lg">
                    <label className="text-sm font-medium text-gray-700">狀態:</label>
                    <div className="flex items-center">
                        <input type="radio" id="statusActive" name="status" value="active" checked={statusFilter === 'active'} onChange={e => setStatusFilter(e.target.value as 'active')} className="h-4 w-4 text-church-blue-600 focus:ring-church-blue-500 border-gray-300" />
                        <label htmlFor="statusActive" className="ml-2 block text-sm text-gray-900">在職</label>
                    </div>
                    <div className="flex items-center">
                        <input type="radio" id="statusInactive" name="status" value="inactive" checked={statusFilter === 'inactive'} onChange={e => setStatusFilter(e.target.value as 'inactive')} className="h-4 w-4 text-church-blue-600 focus:ring-church-blue-500 border-gray-300" />
                        <label htmlFor="statusInactive" className="ml-2 block text-sm text-gray-900">離職</label>
                    </div>
                    <div className="flex items-center">
                        <input type="radio" id="statusAll" name="status" value="all" checked={statusFilter === 'all'} onChange={e => setStatusFilter(e.target.value as 'all')} className="h-4 w-4 text-church-blue-600 focus:ring-church-blue-500 border-gray-300" />
                        <label htmlFor="statusAll" className="ml-2 block text-sm text-gray-900">全部</label>
                    </div>
                </div>
            </div>

            {error && (
                <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">
                    {error}
                    <button onClick={fetchTeachers} className="ml-4 underline">重試</button>
                </div>
            )}

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                姓名
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                教員類別
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                狀態
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                負責班級
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                電話
                            </th>
                            <th scope="col" className="relative px-6 py-3">
                                <span className="sr-only">操作</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {isLoading ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                                    <div className="flex justify-center items-center">
                                        <svg className="animate-spin h-5 w-5 mr-3 text-church-blue-600" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        載入中...
                                    </div>
                                </td>
                            </tr>
                        ) : teachers.length > 0 ? (
                            teachers.map((teacher) => (
                                <tr key={teacher.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{teacher.fullName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getTeacherTypeName(teacher.teacherType)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${teacher.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {getStatusName(teacher.status)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {teacher.classAssignments && teacher.classAssignments.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {teacher.classAssignments.map((assignment: any) => (
                                                    <span
                                                        key={assignment.id}
                                                        className={`px-2 py-1 text-xs rounded ${assignment.isLead
                                                            ? 'bg-blue-100 text-blue-800 font-semibold'
                                                            : 'bg-gray-100 text-gray-700'
                                                            }`}
                                                    >
                                                        {assignment.class.name}
                                                        {assignment.isLead && ' ★'}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-gray-400">未分配</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{teacher.phone || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <Link to={`/teachers/${teacher.id}`} className="text-church-blue-600 hover:text-church-blue-900">
                                            查看詳情
                                        </Link>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                                    找不到符合條件的教員。
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TeacherManagement;

