
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Teacher, TeacherType } from '../types';
import { mockTeachers, mockTeacherClassMap, mockClasses } from '../data/mockData';
import { useAuth } from '../AuthContext';

const TeacherManagement: React.FC = () => {
    const { isAdmin, isClassLead, userClassId } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('active');
    const [filteredTeachers, setFilteredTeachers] = useState<Teacher[]>([]);

    useEffect(() => {
        let authorizedTeachers = mockTeachers;

        // If user is Class Lead, they can only see teachers assigned to their class (current or past academic years? let's assume all time for simplicity, or just "teachers associated with this class")
        if (isClassLead && userClassId) {
            const teacherIdsInClass = new Set(
                mockTeacherClassMap
                    .filter(m => m.classId === userClassId)
                    .map(m => m.teacherId)
            );
            authorizedTeachers = mockTeachers.filter(t => teacherIdsInClass.has(t.id));
        }

        const results = authorizedTeachers.filter(teacher => {
            const matchesSearch = teacher.fullName.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || teacher.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
        setFilteredTeachers(results);
    }, [searchTerm, statusFilter, isClassLead, userClassId]);

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

    const userClassName = userClassId ? mockClasses.find(c => c.id === userClassId)?.className : '';

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">教員管理</h1>
                {isAdmin && ( // Only Admin can add new teachers globally
                    <Link
                        to="/teachers/new"
                        className="bg-church-blue-600 text-white px-4 py-2 rounded-lg hover:bg-church-blue-700 transition-colors duration-200 flex items-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        新增教員
                    </Link>
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
                        <input type="radio" id="statusActive" name="status" value="active" checked={statusFilter === 'active'} onChange={e => setStatusFilter(e.target.value)} className="h-4 w-4 text-church-blue-600 focus:ring-church-blue-500 border-gray-300"/>
                        <label htmlFor="statusActive" className="ml-2 block text-sm text-gray-900">在職</label>
                    </div>
                    <div className="flex items-center">
                        <input type="radio" id="statusInactive" name="status" value="inactive" checked={statusFilter === 'inactive'} onChange={e => setStatusFilter(e.target.value)} className="h-4 w-4 text-church-blue-600 focus:ring-church-blue-500 border-gray-300"/>
                        <label htmlFor="statusInactive" className="ml-2 block text-sm text-gray-900">離職</label>
                    </div>
                    <div className="flex items-center">
                        <input type="radio" id="statusAll" name="status" value="all" checked={statusFilter === 'all'} onChange={e => setStatusFilter(e.target.value)} className="h-4 w-4 text-church-blue-600 focus:ring-church-blue-500 border-gray-300"/>
                        <label htmlFor="statusAll" className="ml-2 block text-sm text-gray-900">全部</label>
                    </div>
                </div>
            </div>

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
                                電話
                            </th>
                            <th scope="col" className="relative px-6 py-3">
                                <span className="sr-only">操作</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredTeachers.length > 0 ? (
                            filteredTeachers.map((teacher) => (
                                <tr key={teacher.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{teacher.fullName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getTeacherTypeName(teacher.teacherType)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${teacher.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {getStatusName(teacher.status)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{teacher.phoneNumber || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <Link to={`/teachers/${teacher.id}`} className="text-church-blue-600 hover:text-church-blue-900">
                                            查看詳情
                                        </Link>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
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
