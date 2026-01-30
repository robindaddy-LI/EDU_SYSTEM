
import React, { useMemo, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { studentService, teacherService, classService, sessionService } from '../services';
import { Student, ClassSession, UserRole, Teacher, Class } from '../types';
import { useAuth } from '../AuthContext';

interface StatCardProps {
    icon: React.ReactElement;
    title: string;
    value: number | string;
    bgGradient: string;
    iconColor: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, title, value, bgGradient, iconColor }) => (
    <div className={`p-6 rounded-3xl shadow-cute hover:shadow-cute-hover ${bgGradient} text-white transform hover:scale-[1.02] transition-all duration-300 flex items-center space-x-4 relative overflow-hidden border-4 border-white/20`}>
        {/* Background decoration */}
        <div className="absolute -right-6 -top-6 w-32 h-32 bg-white opacity-20 rounded-full blur-2xl"></div>
        <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-black opacity-5 rounded-full blur-2xl"></div>

        <div className={`p-4 rounded-2xl bg-white/90 shadow-inner ${iconColor}`}>
            {icon}
        </div>
        <div className="relative z-10">
            <p className="text-sm font-bold opacity-90 tracking-wide">{title}</p>
            <p className="text-4xl font-black drop-shadow-sm tracking-tight">{value}</p>
        </div>
    </div>
);

const Dashboard: React.FC = () => {
    const { isAdmin, isClassLead, userClassId, currentUser } = useAuth();
    const navigate = useNavigate();

    const isRecorder = currentUser?.role === UserRole.Recorder;

    // State for data from API
    const [students, setStudents] = useState<Student[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [sessions, setSessions] = useState<ClassSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch data on mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [studentsData, teachersData, classesData, sessionsData] = await Promise.all([
                    studentService.getAll(),
                    teacherService.getAll(),
                    classService.getAll(),
                    sessionService.getAll()
                ]);

                setStudents(studentsData);
                setTeachers(teachersData);
                setClasses(classesData);
                setSessions(sessionsData);
            } catch (err) {
                console.error('Failed to fetch dashboard data:', err);
            } finally {
                setIsLoading(false);
            }
        };

        if (!isRecorder) {
            fetchData();
        }
    }, [isRecorder]);

    useEffect(() => {
        if (isRecorder) {
            if (userClassId) {
                navigate(`/class-logbook/class/${userClassId}`, { replace: true });
            } else {
                navigate('/class-logbook', { replace: true });
            }
        }
    }, [isRecorder, userClassId, navigate]);

    if (isRecorder) return null;
    if (isLoading) return <div className="p-8 text-center text-gray-500 font-bold">載入中...</div>;

    const studentsToShow = useMemo(() => {
        if (isAdmin) return students;
        if (isClassLead && userClassId) return students.filter(s => s.classId === userClassId);
        return [];
    }, [isAdmin, isClassLead, userClassId, students]);

    const sessionsToShow = useMemo(() => {
        if (isAdmin) return sessions;
        if (isClassLead && userClassId) return sessions.filter(s => s.classId === userClassId);
        return [];
    }, [isAdmin, isClassLead, userClassId, sessions]);

    const totalStudents = studentsToShow.filter(s => s.status === 'active').length;
    const totalTeachers = isAdmin ? teachers.filter(t => t.status === 'active').length : 'N/A';
    const totalClasses = isAdmin ? classes.length : (userClassId ? 1 : 0);

    const recentStudents = useMemo(() =>
        [...studentsToShow]
            .sort((a, b) => b.id - a.id)
            .slice(0, 5),
        [studentsToShow]);

    const recentSessions = useMemo(() =>
        [...sessionsToShow]
            .sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime())
            .slice(0, 5),
        [sessionsToShow]);

    const classesMap = useMemo(() => new Map(classes.map(cls => [cls.id, cls.name])), [classes]);

    const statCards = [
        {
            title: isClassLead ? '本班學員' : '總學員數',
            value: totalStudents,
            bgGradient: 'bg-gradient-to-br from-blue-400 to-blue-500',
            iconColor: 'text-blue-500',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a3.002 3.002 0 01-3.71-1.29l-1.123-1.945A3 3 0 012 8.324V6c0-1.105.895-2 2-2h12c1.105 0 2 .895 2 2v2.324a3 3 0 01-1.88 2.775l-1.123 1.945a3.002 3.002 0 01-3.71 1.29m-3.71-1.29a3.002 3.002 0 01-3.142 0" /></svg>
        },
        {
            title: isClassLead ? '全校教員' : '總教員數',
            value: isAdmin ? totalTeachers : teachers.length,
            bgGradient: 'bg-gradient-to-br from-emerald-400 to-emerald-500',
            iconColor: 'text-emerald-500',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
        },
        {
            title: isClassLead ? '負責班級' : '總班級數',
            value: totalClasses,
            bgGradient: 'bg-gradient-to-br from-amber-400 to-amber-500',
            iconColor: 'text-amber-500',
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5-1.253" /></svg>
        }
    ];

    return (
        <div className="space-y-8 pb-8">
            <div className="bg-white rounded-3xl p-8 shadow-cute border-4 border-white">
                <h1 className="text-3xl font-black text-gray-800 tracking-tight">Hello, {currentUser.fullName} 👋</h1>
                <p className="mt-2 text-gray-500 font-medium">歡迎回來！準備好開始今天的服事了嗎？</p>
                {!isAdmin && userClassId && (
                    <span className="inline-block mt-4 px-5 py-2 bg-cute-primary/10 text-cute-primary rounded-2xl text-sm font-bold tracking-wide ring-2 ring-cute-primary/20">
                        管理班級：{classesMap.get(userClassId)}
                    </span>
                )}
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {statCards.map(stat => (
                    <StatCard key={stat.title} {...stat} />
                ))}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Link to="/students/new" className="group flex items-center justify-center text-center p-6 bg-white border-4 border-white text-cute-primary rounded-3xl shadow-cute hover:bg-cute-primary hover:text-white hover:shadow-cute-hover hover:-translate-y-1 transition-all duration-300">
                    <div className="bg-cute-primary/10 group-hover:bg-white/20 p-4 rounded-2xl mr-4 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    </div>
                    <span className="text-xl font-black tracking-wide">新增學員</span>
                </Link>
                <Link to="/class-logbook/new" className="group flex items-center justify-center text-center p-6 bg-white border-4 border-white text-cute-secondary rounded-3xl shadow-cute hover:bg-cute-secondary hover:text-white hover:shadow-cute-hover hover:-translate-y-1 transition-all duration-300">
                    <div className="bg-cute-secondary/10 group-hover:bg-white/20 p-4 rounded-2xl mr-4 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <span className="text-xl font-black tracking-wide">新增課程紀錄</span>
                </Link>
            </div>

            {/* Recent Activities */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Students */}
                <div className="bg-white p-6 rounded-3xl shadow-cute border-4 border-white">
                    <h2 className="text-xl font-bold text-gray-700 mb-4 pb-3 border-b border-gray-100 flex items-center">
                        <span className="bg-cute-secondary/20 p-2 rounded-xl mr-3 text-cute-secondary">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a3.002 3.002 0 01-3.71-1.29l-1.123-1.945A3 3 0 012 8.324V6c0-1.105.895-2 2-2h12c1.105 0 2 .895 2 2v2.324a3 3 0 01-1.88 2.775l-1.123 1.945a3.002 3.002 0 01-3.71 1.29m-3.71-1.29a3.002 3.002 0 01-3.142 0"></path></svg>
                        </span>
                        {isClassLead ? '本班新學員' : '最新學員'}
                    </h2>
                    {recentStudents.length > 0 ? (
                        <ul className="space-y-3">
                            {recentStudents.map(student => (
                                <li key={student.id}>
                                    <Link to={`/students/${student.id}`} className="block p-4 rounded-2xl bg-gray-50 hover:bg-cute-secondary/10 hover:ring-2 hover:ring-cute-secondary/20 transition-all duration-200">
                                        <div className="flex justify-between items-center">
                                            <p className="font-bold text-gray-700">{student.fullName}</p>
                                            <span className="px-3 py-1 rounded-xl text-xs bg-white shadow-sm text-gray-500 border border-gray-100 font-bold">
                                                {classesMap.get(student.classId) || '未分班'}
                                            </span>
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center text-gray-400 py-8 italic font-bold">尚無資料</p>
                    )}
                </div>

                {/* Recent Sessions */}
                <div className="bg-white p-6 rounded-3xl shadow-cute border-4 border-white">
                    <h2 className="text-xl font-bold text-gray-700 mb-4 pb-3 border-b border-gray-100 flex items-center">
                        <span className="bg-cute-yellow/20 p-2 rounded-xl mr-3 text-cute-yellow">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </span>
                        {isClassLead ? '本班近期課程' : '近期課程'}
                    </h2>
                    {recentSessions.length > 0 ? (
                        <ul className="space-y-3">
                            {recentSessions.map(session => (
                                <li key={session.id}>
                                    <Link to={`/class-logbook/session/${session.id}`} className="block p-4 rounded-2xl bg-gray-50 hover:bg-cute-yellow/10 hover:ring-2 hover:ring-cute-yellow/20 transition-all duration-200">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-bold text-gray-700">{classesMap.get(session.classId) || '未知班級'}</p>
                                                <p className="text-xs text-gray-500 mt-1 font-medium">{session.worshipTopic || '無主題'}</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="bg-white px-2 py-1 rounded-lg shadow-sm border border-gray-100">
                                                    <p className="text-xs font-bold text-gray-500">{session.sessionDate}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center text-gray-400 py-8 italic font-bold">尚無資料</p>
                    )}
                </div>
            </div>

        </div>
    );
};

export default Dashboard;