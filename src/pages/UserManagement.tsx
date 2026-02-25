import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User, UserRole } from '../types';
import { userService, classService } from '../services';
import { ClassWithCounts } from '../services/classService';
import axios from 'axios';

interface UserFormData {
    username: string;
    fullName: string;
    email: string;
    role: UserRole;
    classId: string;
    status: 'active' | 'inactive';
    password?: string;
}

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [classes, setClasses] = useState<ClassWithCounts[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [formData, setFormData] = useState<UserFormData>({
        username: '',
        fullName: '',
        email: '',
        role: UserRole.Teacher,
        classId: '',
        status: 'active',
        password: ''
    });

    // Fetch classes on mount
    useEffect(() => {
        const fetchClasses = async () => {
            try {
                const data = await classService.getAll();
                setClasses(data);
            } catch (err) {
                console.error('Failed to fetch classes:', err);
            }
        };
        fetchClasses();
    }, []);

    // Fetch users
    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const filter: { role?: UserRole; search?: string } = {};
            if (roleFilter !== 'all') {
                filter.role = roleFilter as UserRole;
            }
            if (searchTerm.trim()) {
                filter.search = searchTerm.trim();
            }
            const data = await userService.getAll(filter);
            setUsers(data);
        } catch (err) {
            console.error('Failed to fetch users:', err);
            setError('無法載入使用者資料，請稍後再試。');
        } finally {
            setIsLoading(false);
        }
    }, [roleFilter, searchTerm]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchUsers();
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [fetchUsers]);

    const getClassName = (classId?: number) => {
        if (!classId) return '-';
        const cls = classes.find(c => c.id === classId);
        return cls ? cls.name : '-';
    };

    const getRoleBadge = (role: UserRole) => {
        switch (role) {
            case UserRole.Admin:
                return <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">管理員</span>;
            case UserRole.Teacher:
                return <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">班負責(教員)</span>;
            case UserRole.Recorder:
                return <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">紀錄人員</span>;
            default:
                return <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">{role}</span>;
        }
    };

    const getStatusBadge = (status: string | undefined) => {
        return status === 'active'
            ? <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">啟用</span>
            : <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">停用</span>;
    };

    // --- Modal Handlers ---
    const openModal = (user?: User) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                username: user.username,
                fullName: user.fullName,
                email: user.email || '',
                role: user.role,
                classId: user.classId ? String(user.classId) : '',
                status: user.status || 'active',
                password: ''
            });
        } else {
            setEditingUser(null);
            setFormData({
                username: '',
                fullName: '',
                email: '',
                role: UserRole.Teacher,
                classId: '',
                status: 'active',
                password: ''
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.username || !formData.fullName) {
            alert("請填寫必填欄位 (使用者名稱、姓名)");
            return;
        }

        setIsSaving(true);
        try {
            if (editingUser) {
                // Update existing
                await userService.update(editingUser.id, {
                    username: formData.username,
                    fullName: formData.fullName,
                    email: formData.email || undefined,
                    role: formData.role,
                    classId: formData.role === UserRole.Teacher && formData.classId ? parseInt(formData.classId) : null,
                    status: formData.status,
                    password: formData.password || undefined
                });
                alert("使用者資料已更新");
            } else {
                // Create new
                if (!formData.password) {
                    alert("新使用者必須設定密碼");
                    setIsSaving(false);
                    return;
                }
                await userService.create({
                    username: formData.username,
                    password: formData.password,
                    fullName: formData.fullName,
                    email: formData.email || undefined,
                    role: formData.role,
                    classId: formData.role === UserRole.Teacher && formData.classId ? parseInt(formData.classId) : undefined,
                    status: formData.status
                });
                alert("使用者已新增");
            }
            closeModal();
            fetchUsers(); // Refresh the list
        } catch (err: unknown) {
            console.error('Failed to save user:', err);
            if (axios.isAxiosError(err)) {
                alert(err.response?.data?.error || "儲存失敗，請稍後再試");
            } else {
                alert("儲存失敗，請稍後再試");
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm("確定要停用此使用者嗎？")) {
            try {
                await userService.delete(id);
                fetchUsers(); // Refresh the list
            } catch (err) {
                console.error('Failed to delete user:', err);
                alert("刪除失敗，請稍後再試");
            }
        }
    };

    // --- Render ---
    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">使用者帳號管理</h1>
                <button
                    onClick={() => openModal()}
                    className="bg-church-blue-600 text-white px-4 py-2 rounded-lg hover:bg-church-blue-700 transition-colors duration-200 flex items-center shadow-sm"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    新增使用者
                </button>
            </div>

            <div className="mb-6 flex flex-col md:flex-row gap-4 justify-between">
                <div className="relative flex-grow">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                        <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </span>
                    <input
                        type="text"
                        placeholder="搜尋使用者 (名稱、帳號、Email)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-church-blue-500 bg-white text-gray-900"
                    />
                </div>
                <div className="flex items-center space-x-2">
                    <label htmlFor="roleFilter" className="text-sm font-medium text-gray-700 whitespace-nowrap">角色篩選:</label>
                    <select
                        id="roleFilter"
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-church-blue-500 focus:border-church-blue-500 sm:text-sm rounded-md bg-white text-gray-900"
                    >
                        <option value="all">全部角色</option>
                        <option value={UserRole.Admin}>管理員</option>
                        <option value={UserRole.Teacher}>班負責(教員)</option>
                        <option value={UserRole.Recorder}>紀錄人員</option>
                    </select>
                </div>
            </div>

            {error && (
                <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">
                    {error}
                    <button onClick={fetchUsers} className="ml-4 underline">重試</button>
                </div>
            )}

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">使用者資訊</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">角色</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">關聯班級</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">狀態</th>
                            <th className="relative px-6 py-3"><span className="sr-only">操作</span></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {isLoading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                                    <div className="flex justify-center items-center">
                                        <svg className="animate-spin h-5 w-5 mr-3 text-church-blue-600" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        載入中...
                                    </div>
                                </td>
                            </tr>
                        ) : users.length > 0 ? (
                            users.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10 bg-church-blue-100 rounded-full flex items-center justify-center text-church-blue-600 font-bold">
                                                {user.fullName.charAt(0)}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{user.fullName}</div>
                                                <div className="text-sm text-gray-500">@{user.username}</div>
                                                {user.email && <div className="text-xs text-gray-400">{user.email}</div>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {getRoleBadge(user.role)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {getClassName(user.classId)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {getStatusBadge(user.status)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => openModal(user)} className="text-church-blue-600 hover:text-church-blue-900 mr-4">編輯</button>
                                        <button onClick={() => handleDelete(user.id)} className="text-red-600 hover:text-red-900">停用</button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">找不到符合條件的使用者。</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-10 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={closeModal}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
                            <form onSubmit={handleSubmit}>
                                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                    <div className="sm:flex sm:items-start">
                                        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                            <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                                {editingUser ? '編輯使用者' : '新增使用者'}
                                            </h3>
                                            <div className="mt-4 space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label htmlFor="username" className="block text-sm font-medium text-gray-700">帳號 (Username) *</label>
                                                        <input type="text" name="username" id="username" required value={formData.username} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-church-blue-500 focus:border-church-blue-500 sm:text-sm bg-white text-gray-900" />
                                                    </div>
                                                    <div>
                                                        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">姓名 (Full Name) *</label>
                                                        <input type="text" name="fullName" id="fullName" required value={formData.fullName} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-church-blue-500 focus:border-church-blue-500 sm:text-sm bg-white text-gray-900" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">電子郵件 (Email)</label>
                                                    <input type="email" name="email" id="email" value={formData.email} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-church-blue-500 focus:border-church-blue-500 sm:text-sm bg-white text-gray-900" />
                                                </div>
                                                <div>
                                                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                                        密碼 {editingUser ? '(若不修改請留空)' : '*'}
                                                    </label>
                                                    <input type="password" name="password" id="password" required={!editingUser} value={formData.password} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-church-blue-500 focus:border-church-blue-500 sm:text-sm bg-white text-gray-900" />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label htmlFor="role" className="block text-sm font-medium text-gray-700">角色</label>
                                                        <select id="role" name="role" value={formData.role} onChange={handleInputChange} className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-church-blue-500 focus:border-church-blue-500 sm:text-sm text-gray-900">
                                                            <option value={UserRole.Admin}>管理員</option>
                                                            <option value={UserRole.Teacher}>班負責(教員)</option>
                                                            <option value={UserRole.Recorder}>紀錄人員</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label htmlFor="status" className="block text-sm font-medium text-gray-700">帳號狀態</label>
                                                        <select id="status" name="status" value={formData.status} onChange={handleInputChange} className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-church-blue-500 focus:border-church-blue-500 sm:text-sm text-gray-900">
                                                            <option value="active">啟用</option>
                                                            <option value="inactive">停用</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                {formData.role === UserRole.Teacher && (
                                                    <div>
                                                        <label htmlFor="classId" className="block text-sm font-medium text-gray-700">關聯班級 (班負責專用)</label>
                                                        <select id="classId" name="classId" value={formData.classId} onChange={handleInputChange} className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-church-blue-500 focus:border-church-blue-500 sm:text-sm text-gray-900">
                                                            <option value="">無</option>
                                                            {classes.map(cls => (
                                                                <option key={cls.id} value={cls.id}>{cls.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                    <button type="submit" disabled={isSaving} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-church-blue-600 text-base font-medium text-white hover:bg-church-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-church-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50">
                                        {isSaving ? '儲存中...' : '儲存'}
                                    </button>
                                    <button type="button" onClick={closeModal} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-church-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                                        取消
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
