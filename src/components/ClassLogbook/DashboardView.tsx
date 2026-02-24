
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { classService, sessionService } from '../../services';
import { useAuth } from '../../AuthContext';

const DashboardView: React.FC = () => {
    const { isAdmin, userClassId } = useAuth();
    const [classes, setClasses] = useState<{ id: number; name: string; count: number }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const classData = await classService.getAll();

                // Filter by user permissions
                let filteredClasses = classData;
                if (!isAdmin && userClassId) {
                    filteredClasses = classData.filter(c => c.id === userClassId);
                }

                // Get session counts (Note: this causes N+1 requests, optimized endpoint recommended for future)
                const classesWithCounts = await Promise.all(
                    filteredClasses.map(async (cls) => {
                        try {
                            const sessions = await sessionService.getAll({ classId: cls.id });
                            return { id: cls.id, name: cls.name, count: sessions.length };
                        } catch {
                            return { id: cls.id, name: cls.name, count: 0 };
                        }
                    })
                );

                setClasses(classesWithCounts);
            } catch (err) {
                console.error('Failed to fetch data:', err);
                setError('無法載入資料');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [isAdmin, userClassId]);

    const bgColors = ['bg-blue-100', 'bg-pink-100', 'bg-yellow-100', 'bg-green-100', 'bg-purple-100'];
    const textColors = ['text-blue-600', 'text-pink-600', 'text-yellow-600', 'text-green-600', 'text-purple-600'];

    if (isLoading) return (
        <div className="p-8 text-center text-gray-500 font-bold">
            <div className="flex justify-center items-center">
                <svg className="animate-spin h-5 w-5 mr-3 text-church-blue-600" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                載入中...
            </div>
        </div>
    );

    if (error) return <div className="p-8 text-center text-red-500 font-bold">{error}</div>;

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
                {classes.length > 0 ? (
                    classes.map((cls, index) => {
                        const bgClass = bgColors[index % bgColors.length];
                        const textClass = textColors[index % textColors.length];
                        return (
                            <Link to={`/class-logbook/class/${cls.id}`} key={cls.id} className="group block bg-white p-8 rounded-3xl shadow-cute hover:shadow-cute-hover hover:-translate-y-2 transition-all duration-300 border-4 border-white relative overflow-hidden">
                                <div className={`absolute top-0 right-0 w-32 h-32 -mr-10 -mt-10 rounded-full opacity-20 ${bgClass}`}></div>
                                <div className="relative z-10">
                                    <div className={`w-14 h-14 rounded-2xl ${bgClass} ${textClass} flex items-center justify-center mb-4 shadow-inner`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5-1.253" /></svg>
                                    </div>
                                    <h2 className="text-2xl font-black text-gray-800 group-hover:text-cute-primary transition-colors">{cls.name}</h2>
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

export default DashboardView;
