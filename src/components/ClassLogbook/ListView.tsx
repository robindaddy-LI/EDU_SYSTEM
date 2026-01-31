
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ClassSession } from '../../types';
import { classService, sessionService } from '../../services';
import { useAuth } from '../../AuthContext';

const ListView: React.FC<{ classId: string }> = ({ classId }) => {
    const { isAdmin, userClassId } = useAuth();
    const [sessions, setSessions] = useState<ClassSession[]>([]);
    const [className, setClassName] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const numericClassId = parseInt(classId, 10);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // Check permissions
                if (!isAdmin && userClassId && numericClassId !== userClassId) {
                    setError('存取被拒');
                    return;
                }

                // Fetch class name
                const classData = await classService.getById(numericClassId);
                setClassName(classData.className);

                // Fetch sessions
                const sessionData = await sessionService.getAll({ classId: numericClassId });
                setSessions(sessionData.sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime()));
            } catch (err) {
                console.error('Failed to fetch data:', err);
                setError('無法載入資料');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [numericClassId, isAdmin, userClassId]);

    if (!isAdmin && userClassId && numericClassId !== userClassId) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-2xl font-bold text-red-500">🚫 存取被拒</h2>
                <Link to={`/class-logbook/class/${userClassId}`} className="mt-4 inline-block text-cute-primary font-bold hover:underline">前往我的班級紀錄</Link>
            </div>
        );
    }

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
                <div>
                    {isAdmin && <Link to="/class-logbook" className="text-xs font-bold text-gray-400 hover:text-cute-primary mb-1 block transition-colors">&larr; 返回總覽</Link>}
                    <h1 className="text-3xl font-black text-gray-800">{className} 紀錄列表</h1>
                </div>
                <Link to={`/class-logbook/new?classId=${numericClassId}`} className="bg-cute-primary text-white px-6 py-3 rounded-full hover:bg-blue-500 shadow-cute hover:shadow-cute-hover hover:-translate-y-1 transition-all duration-300 font-bold flex items-center">
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

export default ListView;
