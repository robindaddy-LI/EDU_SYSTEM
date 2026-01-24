
import React from 'react';

const SystemInfo: React.FC = () => {
    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">系統資訊</h1>
            <div className="bg-white shadow-lg rounded-xl overflow-hidden max-w-2xl mx-auto">
                <div className="p-6 sm:p-8">
                    <h2 className="text-xl font-semibold text-gray-700 mb-6 border-b pb-3">系統架構設計說明書</h2>
                    <dl className="space-y-6">
                        <div>
                            <dt className="text-sm font-medium text-gray-500">文件版本</dt>
                            <dd className="mt-1 text-lg text-gray-900 font-semibold">2.1 (最終完整版)</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-gray-500">文件日期</dt>
                            <dd className="mt-1 text-lg text-gray-900 font-semibold">2025</dd>
                        </div>
                         <div>
                            <dt className="text-sm font-medium text-gray-500">系統名稱</dt>
                            <dd className="mt-1 text-lg text-gray-900 font-semibold">石牌教會宗教教育股學籍及班級紀錄系統</dd>
                        </div>
                    </dl>
                </div>
            </div>
        </div>
    );
};

export default SystemInfo;
