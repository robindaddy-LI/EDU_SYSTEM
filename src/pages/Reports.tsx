import React, { useState } from 'react';
import QuarterlyReport from './QuarterlyReport';
import { mockStudents, mockTeachers, mockClasses } from '../data/mockData';
import { Student, Teacher, StudentType, TeacherType } from '../types';

const Reports: React.FC = () => {
    const [activeTab, setActiveTab] = useState('quarterly');

    const renderActiveTab = () => {
        switch (activeTab) {
            case 'quarterly':
                return <QuarterlyReport />;
            case 'studentList':
                return <StudentListReport />;
            case 'teacherList':
                return <TeacherListReport />;
            default:
                return null;
        }
    };

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">報表統計</h1>
            <div className="mb-6 border-b border-gray-200">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <TabButton
                        label="季度統計報表"
                        isActive={activeTab === 'quarterly'}
                        onClick={() => setActiveTab('quarterly')}
                    />
                    <TabButton
                        label="學員名冊總覽"
                        isActive={activeTab === 'studentList'}
                        onClick={() => setActiveTab('studentList')}
                    />
                    <TabButton
                        label="教員名冊總覽"
                        isActive={activeTab === 'teacherList'}
                        onClick={() => setActiveTab('teacherList')}
                    />
                </nav>
            </div>
            <div>
                {renderActiveTab()}
            </div>
        </div>
    );
};

interface TabButtonProps {
    label: string;
    isActive: boolean;
    onClick: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ label, isActive, onClick }) => {
    const activeClasses = 'border-church-blue-500 text-church-blue-600';
    const inactiveClasses = 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300';
    return (
        <button
            onClick={onClick}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 focus:outline-none ${isActive ? activeClasses : inactiveClasses}`}
        >
            {label}
        </button>
    );
};

// --- Sub-components for other reports ---

const StudentListReport: React.FC = () => {
    const [statusFilter, setStatusFilter] = useState('active');
    const classesMap = new Map(mockClasses.map(c => [c.id, c.className]));

    const getStudentTypeName = (type: StudentType) => {
        return type === StudentType.Member ? '信徒' : '慕道';
    };

    const getStatusName = (status: 'active' | 'inactive') => {
        return status === 'active' ? '在學' : '離校';
    };

    const studentsToDisplay = mockStudents.filter(s => statusFilter === 'all' || s.status === statusFilter);

    const handleExport = () => {
        const headers = ['姓名', '類別', '班級', '狀態', '出生日期', '地址', '緊急聯絡人姓名', '緊急聯絡人電話'];
        const data = studentsToDisplay.map(s => [
            s.fullName,
            getStudentTypeName(s.studentType),
            classesMap.get(s.classId) || '未分班',
            getStatusName(s.status),
            s.dob || '',
            s.address || '',
            s.emergencyContactName || '',
            s.emergencyContactPhone || ''
        ]);
        exportToCsv('學員名冊.csv', headers, data);
    };

    return (
        <div>
            <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                <div className="flex items-center space-x-4 bg-gray-100 p-2 rounded-lg">
                    <label className="text-sm font-medium text-gray-700">狀態:</label>
                    <div className="flex items-center">
                        <input type="radio" id="studentStatusActive" name="studentStatus" value="active" checked={statusFilter === 'active'} onChange={e => setStatusFilter(e.target.value)} className="h-4 w-4 text-church-blue-600 focus:ring-church-blue-500 border-gray-300"/>
                        <label htmlFor="studentStatusActive" className="ml-2 block text-sm text-gray-900">在學</label>
                    </div>
                    <div className="flex items-center">
                        <input type="radio" id="studentStatusInactive" name="studentStatus" value="inactive" checked={statusFilter === 'inactive'} onChange={e => setStatusFilter(e.target.value)} className="h-4 w-4 text-church-blue-600 focus:ring-church-blue-500 border-gray-300"/>
                        <label htmlFor="studentStatusInactive" className="ml-2 block text-sm text-gray-900">離校</label>
                    </div>
                    <div className="flex items-center">
                        <input type="radio" id="studentStatusAll" name="studentStatus" value="all" checked={statusFilter === 'all'} onChange={e => setStatusFilter(e.target.value)} className="h-4 w-4 text-church-blue-600 focus:ring-church-blue-500 border-gray-300"/>
                        <label htmlFor="studentStatusAll" className="ml-2 block text-sm text-gray-900">全部</label>
                    </div>
                </div>
                <button onClick={handleExport} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    匯出為 CSV
                </button>
            </div>
            <div className="bg-white shadow-md rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">姓名</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">類別</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">班級</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">狀態</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">緊急聯絡人</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {studentsToDisplay.map(student => (
                            <tr key={student.id}>
                                <td className="px-6 py-4 whitespace-nowrap">{student.fullName}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{getStudentTypeName(student.studentType)}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{classesMap.get(student.classId) || '未分班'}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${student.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {getStatusName(student.status)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">{student.emergencyContactName || 'N/A'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const TeacherListReport: React.FC = () => {
    const [statusFilter, setStatusFilter] = useState('active');

    const getTeacherTypeName = (type: TeacherType) => {
        return type === TeacherType.Formal ? '正式教員' : '見習教員';
    };
    
    const getStatusName = (status: 'active' | 'inactive') => {
        return status === 'active' ? '在職' : '離職';
    };

    const teachersToDisplay = mockTeachers.filter(t => statusFilter === 'all' || t.status === statusFilter);

    const handleExport = () => {
        const headers = ['姓名', '教員類別', '狀態', '電話', '電子郵件'];
        const data = teachersToDisplay.map(t => [
            t.fullName,
            getTeacherTypeName(t.teacherType),
            getStatusName(t.status),
            t.phoneNumber || '',
            t.email || ''
        ]);
        exportToCsv('教員名冊.csv', headers, data);
    };

    return (
        <div>
            <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                 <div className="flex items-center space-x-4 bg-gray-100 p-2 rounded-lg">
                    <label className="text-sm font-medium text-gray-700">狀態:</label>
                    <div className="flex items-center">
                        <input type="radio" id="teacherStatusActive" name="teacherStatus" value="active" checked={statusFilter === 'active'} onChange={e => setStatusFilter(e.target.value)} className="h-4 w-4 text-church-blue-600 focus:ring-church-blue-500 border-gray-300"/>
                        <label htmlFor="teacherStatusActive" className="ml-2 block text-sm text-gray-900">在職</label>
                    </div>
                    <div className="flex items-center">
                        <input type="radio" id="teacherStatusInactive" name="teacherStatus" value="inactive" checked={statusFilter === 'inactive'} onChange={e => setStatusFilter(e.target.value)} className="h-4 w-4 text-church-blue-600 focus:ring-church-blue-500 border-gray-300"/>
                        <label htmlFor="teacherStatusInactive" className="ml-2 block text-sm text-gray-900">離職</label>
                    </div>
                    <div className="flex items-center">
                        <input type="radio" id="teacherStatusAll" name="teacherStatus" value="all" checked={statusFilter === 'all'} onChange={e => setStatusFilter(e.target.value)} className="h-4 w-4 text-church-blue-600 focus:ring-church-blue-500 border-gray-300"/>
                        <label htmlFor="teacherStatusAll" className="ml-2 block text-sm text-gray-900">全部</label>
                    </div>
                </div>
                <button onClick={handleExport} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    匯出為 CSV
                </button>
            </div>
            <div className="bg-white shadow-md rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">姓名</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">教員類別</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">狀態</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">電話</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">電子郵件</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {teachersToDisplay.map(teacher => (
                            <tr key={teacher.id}>
                                <td className="px-6 py-4 whitespace-nowrap">{teacher.fullName}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{getTeacherTypeName(teacher.teacherType)}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${teacher.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {getStatusName(teacher.status)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">{teacher.phoneNumber || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{teacher.email || 'N/A'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- CSV Export Utility ---
const exportToCsv = (filename: string, headers: string[], data: (string | number)[][]) => {
    const csvRows = [
        headers.join(','),
        ...data.map(row =>
            row.map(field => (typeof field === 'string' ? `"${field.replace(/"/g, '""')}"` : field)).join(',')
        )
    ];
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export default Reports;