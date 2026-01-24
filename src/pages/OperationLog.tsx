import React from 'react';
import { mockOperationLogs } from '../data/mockData';
import { OperationLog } from '../types';

const OperationLogPage: React.FC = () => {

    const formatTimestamp = (isoString: string) => {
        const date = new Date(isoString);
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
        } else if (type.includes('初始化')) {
            bgColor = 'bg-green-100';
            textColor = 'text-green-800';
        }
        return <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${bgColor} ${textColor}`}>{type}</span>;
    };

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">系統操作紀錄</h1>
            
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
                        {mockOperationLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((log) => (
                            <tr key={log.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-mono">{formatTimestamp(log.timestamp)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{getTypeBadge(log.type)}</td>
                                <td className="px-6 py-4 text-sm text-gray-600">{log.description}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.user}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
             {mockOperationLogs.length === 0 && (
                <div className="text-center p-12 bg-white rounded-lg shadow-md mt-6">
                    <h3 className="text-xl font-semibold text-gray-700">目前沒有任何操作紀錄</h3>
                    <p className="text-gray-500 mt-2">當系統執行重要操作時，相關紀錄將會顯示在此處。</p>
                </div>
            )}
        </div>
    );
};

export default OperationLogPage;
