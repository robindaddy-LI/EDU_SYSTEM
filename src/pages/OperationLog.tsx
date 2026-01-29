import React, { useState, useEffect } from 'react';
import { operationLogService, type OperationLog } from '../services';

const OperationLogPage: React.FC = () => {
    const [logs, setLogs] = useState<OperationLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                setIsLoading(true);
                const data = await operationLogService.getAll({ limit: 100 });
                setLogs(data);
            } catch (err) {
                console.error('Failed to fetch operation logs:', err);
                setError('無法載入操作記錄，請稍後再試。');
            } finally {
                setIsLoading(false);
            }
        };

        fetchLogs();
    }, []);

    const formatTimestamp = (timestamp: Date | string) => {
        const date = new Date(timestamp);
        return date.toLocaleString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    };

    const getTypeBadge = (type: string) => {
        let bgColor = 'bg-gray-100';
        let textColor = 'text-gray-800';
        if (type.includes('升班')) {
            bgColor = 'bg-blue-100';
            textColor = 'text-blue-800';
        } else if (type.includes('初始化') || type.includes('匯入')) {
            bgColor = 'bg-green-100';
            textColor = 'text-green-800';
        } else if (type.includes('教員')) {
            bgColor = 'bg-purple-100';
            textColor = 'text-purple-800';
        }
        return <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${bgColor} ${textColor}`}>{type}</span>;
    };

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">系統操作紀錄</h1>

            {error && (
                <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">
                    {error}
                </div>
            )}

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                日期與時間
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                操作類型
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                操作描述
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                執行者
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {isLoading ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-500">
                                    <div className="flex justify-center items-center">
                                        <svg className="animate-spin h-5 w-5 mr-3 text-church-blue-600" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        載入中...
                                    </div>
                                </td>
                            </tr>
                        ) : logs.length > 0 ? (
                            logs.map((log) => (
                                <tr key={log.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-mono">{formatTimestamp(log.timestamp)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{getTypeBadge(log.type)}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{log.description}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {log.user?.fullName || '系統'}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-500">
                                    <h3 className="text-xl font-semibold text-gray-700">目前沒有任何操作紀錄</h3>
                                    <p className="text-gray-500 mt-2">當系統執行重要操作時，相關紀錄將會顯示在此處。</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default OperationLogPage;
