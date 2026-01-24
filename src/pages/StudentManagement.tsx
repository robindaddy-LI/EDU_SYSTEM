
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Student, StudentType, Class } from '../types';
import { mockStudents, mockClasses } from '../data/mockData';
import { useAuth } from '../AuthContext';

const StudentManagement: React.FC = () => {
    const { isAdmin, isClassLead, userClassId } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('active');
    const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
    const [classesMap, setClassesMap] = useState<Map<number, string>>(new Map());

    useEffect(() => {
        const newClassesMap = new Map<number, string>();
        mockClasses.forEach(cls => newClassesMap.set(cls.id, cls.className));
        setClassesMap(newClassesMap);
    }, []);

    useEffect(() => {
        // Apply permissions first
        let authorizedStudents = mockStudents;
        if (isClassLead && userClassId) {
            authorizedStudents = mockStudents.filter(s => s.classId === userClassId);
        }

        // Apply search and filters
        const results = authorizedStudents.filter(student => {
            const matchesSearch = student.fullName.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || student.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
        setFilteredStudents(results);
    }, [searchTerm, statusFilter, isClassLead, userClassId]);

    const getStudentTypeName = (type: StudentType) => {
        return type === StudentType.Member ? '信徒' : '慕道';
    };

    const getStatusName = (status: 'active' | 'inactive') => {
        return status === 'active' ? '在學' : '離校';
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">學員管理</h1>
                <Link
                    to="/students/new"
                    className="bg-church-blue-600 text-white px-4 py-2 rounded-lg hover:bg-church-blue-700 transition-colors duration-200 flex items-center"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    新增學員
                </Link>
            </div>

            {isClassLead && userClassId && (
                <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded-lg text-sm">
                    僅顯示您負責班級 ({classesMap.get(userClassId)}) 的學員
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
                        placeholder="依姓名搜尋學員..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-church-blue-500 bg-white text-gray-900"
                        aria-label="搜尋學員"
                    />
                </div>
                <div className="flex items-center space-x-4 bg-gray-100 p-2 rounded-lg">
                    <label className="text-sm font-medium text-gray-700">狀態:</label>
                    <div className="flex items-center">
                        <input type="radio" id="statusActive" name="status" value="active" checked={statusFilter === 'active'} onChange={e => setStatusFilter(e.target.value)} className="h-4 w-4 text-church-blue-600 focus:ring-church-blue-500 border-gray-300"/>
                        <label htmlFor="statusActive" className="ml-2 block text-sm text-gray-900">在學</label>
                    </div>
                    <div className="flex items-center">
                        <input type="radio" id="statusInactive" name="status" value="inactive" checked={statusFilter === 'inactive'} onChange={e => setStatusFilter(e.target.value)} className="h-4 w-4 text-church-blue-600 focus:ring-church-blue-500 border-gray-300"/>
                        <label htmlFor="statusInactive" className="ml-2 block text-sm text-gray-900">離校</label>
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
                                類別
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                班級
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                狀態
                            </th>
                            <th scope="col" className="relative px-6 py-3">
                                <span className="sr-only">操作</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredStudents.length > 0 ? (
                            filteredStudents.map((student) => (
                                <tr key={student.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.fullName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getStudentTypeName(student.studentType)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{classesMap.get(student.classId) || '未分班'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${student.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {getStatusName(student.status)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <Link to={`/students/${student.id}`} className="text-church-blue-600 hover:text-church-blue-900">
                                            查看詳情
                                        </Link>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                                    找不到符合條件的學員。
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default StudentManagement;
