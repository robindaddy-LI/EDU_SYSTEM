import React, { useState, useEffect } from 'react';
import QuarterlyReport from './QuarterlyReport';
import { studentService, teacherService, statisticsService, classService } from '../services';
import { Student, Teacher, StudentType, TeacherType, Class } from '../types';
import { SchoolStatistics } from '../services/statisticsService';

const Reports: React.FC = () => {
    const [activeTab, setActiveTab] = useState('overview');

    const renderActiveTab = () => {
        switch (activeTab) {
            case 'overview':
                return <SchoolOverview />;
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
            <h1 className="text-3xl font-bold text-gray-800 mb-6">報表統計與儀表板</h1>
            <div className="mb-6 border-b border-gray-200">
                <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                    <TabButton
                        label="全校概況"
                        isActive={activeTab === 'overview'}
                        onClick={() => setActiveTab('overview')}
                    />
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

// --- School Overview Dashboard ---
const SchoolOverview: React.FC = () => {
    const [stats, setStats] = useState<SchoolStatistics | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchStats = async () => {
            setIsLoading(true);
            try {
                const data = await statisticsService.getSchoolStats();
                setStats(data);
            } catch (error) {
                console.error("Failed to load school stats", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (isLoading) return <div className="p-8 text-center text-gray-500">載入中...</div>;
    if (!stats) return <div className="p-8 text-center text-gray-500">無法載入數據</div>;

    const maxStudents = Math.max(...stats.classBreakdown.map(c => c.studentCount), 1);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard title="目前學年度" value={stats.currentYear.toString()} icon="📅" color="bg-blue-100 text-blue-800" />
            <StatCard title="在籍學員" value={stats.activeStudents.toString()} icon="👶" color="bg-green-100 text-green-800" />
            <StatCard title="在職教員" value={stats.activeTeachers.toString()} icon="👩‍🏫" color="bg-purple-100 text-purple-800" />
            <StatCard title="本年度聚會數" value={stats.sessionsThisYear.toString()} icon="📚" color="bg-yellow-100 text-yellow-800" />

            <div className="col-span-1 md:col-span-2 lg:col-span-4 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">班級人數分佈</h3>
                <div className="space-y-4">
                    {stats.classBreakdown.map(cls => (
                        <div key={cls.id}>
                            <div className="flex justify-between text-sm text-gray-600 mb-1">
                                <span>{cls.name}</span>
                                <span className="font-bold">{cls.studentCount} 人</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2.5">
                                <div
                                    className="bg-cute-primary h-2.5 rounded-full transition-all duration-500"
                                    style={{ width: `${(cls.studentCount / maxStudents) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const StatCard: React.FC<{ title: string; value: string; icon: string; color: string }> = ({ title, value, icon, color }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center space-x-4">
        <div className={`p-3 rounded-full ${color} text-xl`}>{icon}</div>
        <div>
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);


const StudentListReport: React.FC = () => {
    const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');
    const [students, setStudents] = useState<Student[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const [allStudents, allClasses] = await Promise.all([
                    studentService.getAll(), // Fetch all to allow client filtering or update service to filter
                    classService.getAll()
                ]);
                // Client-side mapping for classes
                setClasses(allClasses);
                setStudents(allStudents);
            } catch (error) {
                console.error("Failed to load students", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    const studentsToDisplay = students.filter(s => statusFilter === 'all' || s.status === statusFilter);
    const classesMap = new Map(classes.map(c => [c.id, c.className])); // Backend className mapped in service

    const getStudentTypeName = (type: StudentType) => (type === StudentType.Member ? '信徒' : '慕道');
    const getStatusName = (status: string) => (status === 'active' ? '在學' : '離校');

    const handleExport = () => {
        const headers = ['姓名', '類別', '班級', '狀態', '出生日期', '地址', '緊急聯絡人姓名', '緊急聯絡人電話'];
        const data = studentsToDisplay.map(s => [
            s.fullName,
            getStudentTypeName(s.studentType),
            s.class?.name || (s.classId ? (classesMap.get(s.classId) || '未分班') : '未分班'), // Support raw relation or ID map
            getStatusName(s.status),
            s.dob || '',
            s.address || '',
            s.emergencyContactName || '',
            s.emergencyContactPhone || ''
        ]);
        exportToCsv('學員名冊.csv', headers, data);
    };

    if (isLoading) return <div>載入中...</div>;

    return (
        <div>
            <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                <div className="flex items-center space-x-4 bg-gray-100 p-2 rounded-lg">
                    <label className="text-sm font-medium text-gray-700">狀態:</label>
                    <FilterRadio id="studentStatusActive" value="active" label="在學" current={statusFilter} onChange={setStatusFilter} />
                    <FilterRadio id="studentStatusInactive" value="inactive" label="離校" current={statusFilter} onChange={setStatusFilter} />
                    <FilterRadio id="studentStatusAll" value="all" label="全部" current={statusFilter} onChange={setStatusFilter} />
                </div>
                <button onClick={handleExport} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center">
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
                                <td className="px-6 py-4 whitespace-nowrap">{student.class?.name || classesMap.get(student.classId) || '未分班'}</td>
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
    const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const loadTeachers = async () => {
            setIsLoading(true);
            try {
                const data = await teacherService.getAll();
                setTeachers(data);
            } catch (error) {
                console.error("Failed to load teachers", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadTeachers();
    }, []);

    const teachersToDisplay = teachers.filter(t => statusFilter === 'all' || t.status === statusFilter);

    const getTeacherTypeName = (type: TeacherType) => (type === TeacherType.Formal ? '正式教員' : '見習教員');
    const getStatusName = (status: string) => (status === 'active' ? '在職' : '離職');

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

    if (isLoading) return <div>載入中...</div>;

    return (
        <div>
            <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                <div className="flex items-center space-x-4 bg-gray-100 p-2 rounded-lg">
                    <label className="text-sm font-medium text-gray-700">狀態:</label>
                    <FilterRadio id="teacherStatusActive" value="active" label="在職" current={statusFilter} onChange={setStatusFilter} />
                    <FilterRadio id="teacherStatusInactive" value="inactive" label="離職" current={statusFilter} onChange={setStatusFilter} />
                    <FilterRadio id="teacherStatusAll" value="all" label="全部" current={statusFilter} onChange={setStatusFilter} />
                </div>
                <button onClick={handleExport} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center">
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

const FilterRadio: React.FC<{ id: string, value: string, label: string, current: string, onChange: (val: any) => void }> = ({ id, value, label, current, onChange }) => (
    <div className="flex items-center">
        <input
            type="radio"
            id={id}
            value={value}
            checked={current === value}
            onChange={e => onChange(e.target.value)}
            className="h-4 w-4 text-church-blue-600 focus:ring-church-blue-500 border-gray-300"
        />
        <label htmlFor={id} className="ml-2 block text-sm text-gray-900">{label}</label>
    </div>
);

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