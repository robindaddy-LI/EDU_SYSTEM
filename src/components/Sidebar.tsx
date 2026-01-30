
import React, { useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { UserRole } from '../types';
import { useAuth } from '../AuthContext';


interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const allNavItems = [
    { to: '/', label: '儀表板', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', roles: [UserRole.Admin, UserRole.Teacher], color: 'text-cute-primary' },
    { to: '/students', label: '學員管理', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a3.002 3.002 0 01-3.71-1.29l-1.123-1.945A3 3 0 012 8.324V6c0-1.105.895-2 2-2h12c1.105 0 2 .895 2 2v2.324a3 3 0 01-1.88 2.775l-1.123 1.945a3.002 3.002 0 01-3.71 1.29m-3.71-1.29a3.002 3.002 0 01-3.142 0', roles: [UserRole.Admin, UserRole.Teacher], color: 'text-cute-secondary' },
    { to: '/teachers', label: '教員管理', icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', roles: [UserRole.Admin, UserRole.Teacher], color: 'text-cute-accent' },
    { to: '/class-logbook', label: '班級紀錄簿', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5-1.253', roles: [UserRole.Admin, UserRole.Teacher, UserRole.Recorder], color: 'text-cute-yellow' },
    { to: '/reports', label: '報表統計', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', roles: [UserRole.Admin, UserRole.Teacher], color: 'text-cute-lavender' },
    { to: '/users', label: '帳號管理', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', roles: [UserRole.Admin], color: 'text-gray-400' },
    { to: '/operation-log', label: '系統操作紀錄', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', roles: [UserRole.Admin], color: 'text-gray-400' },
    { to: '/system-info', label: '系統資訊', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', roles: [UserRole.Admin, UserRole.Teacher, UserRole.Recorder], color: 'text-gray-400' },
    { to: '/settings', label: '系統設定', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z', roles: [UserRole.Admin], color: 'text-gray-400' },
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
    const { currentUser, setCurrentUser } = useAuth();
    const navigate = useNavigate();
    const [availableUsers, setAvailableUsers] = React.useState<{ [key in UserRole]?: import('../types').User }>({});

    const baseLinkClass = "flex items-center px-6 py-3 mx-3 my-1 rounded-3xl transition-all duration-300 font-bold text-gray-500 hover:bg-white/80 hover:shadow-sm hover:text-cute-primary hover:translate-x-1";
    const activeLinkClass = "bg-white shadow-cute text-cute-primary ring-2 ring-white ring-opacity-50";

    const filteredNavItems = useMemo(() => {
        return allNavItems.filter(item => item.roles.includes(currentUser.role));
    }, [currentUser.role]);

    // Fetch representative users for dropdown
    React.useEffect(() => {
        const loadUsers = async () => {
            try {
                const users = await import('../services').then(m => m.userService.getAll());
                const admin = users.find(u => u.role === UserRole.Admin);
                const teacher = users.find(u => u.role === UserRole.Teacher && u.classId); // Prefer teacher with class
                const recorder = users.find(u => u.role === UserRole.Recorder);

                setAvailableUsers({
                    [UserRole.Admin]: admin,
                    [UserRole.Teacher]: teacher,
                    [UserRole.Recorder]: recorder
                });
            } catch (error) {
                console.error('Failed to load users for switcher:', error);
            }
        };
        loadUsers();
    }, []);

    const adminUser = availableUsers[UserRole.Admin];
    const teacherUser = availableUsers[UserRole.Teacher];
    const recorderUser = availableUsers[UserRole.Recorder];

    const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const role = e.target.value as UserRole;
        const newUser = availableUsers[role];

        if (newUser) {
            setCurrentUser(newUser);
            if (newUser.role === UserRole.Recorder) {
                if (newUser.classId) {
                    navigate(`/class-logbook/class/${newUser.classId}`);
                } else {
                    navigate('/class-logbook');
                }
            } else {
                navigate('/');
            }
        }
    };

    return (
        <aside className={`
            fixed inset-y-0 left-0 z-30 w-72 bg-white/60 backdrop-blur-xl border-r border-white/50 shadow-2xl 
            transform transition-transform duration-300 ease-in-out
            md:relative md:translate-x-0 md:bg-transparent md:shadow-none md:border-none
            flex flex-col h-screen
            ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
            <div className="h-24 flex items-center justify-between px-6 mt-2">
                <div className="flex items-center bg-white/80 px-4 py-3 rounded-3xl shadow-sm w-full">
                    <div className="bg-cute-primary p-2 rounded-2xl mr-3 shadow-lg shadow-cute-primary/30">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5-1.253" />
                        </svg>
                    </div>
                    <h1 className="text-lg font-black text-gray-700 tracking-wide">宗教教育股</h1>
                </div>
                {/* Mobile Close Button */}
                <button onClick={onClose} className="md:hidden absolute top-8 right-6 text-gray-400 hover:text-gray-600 bg-white rounded-full p-2 shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="px-6 py-4">
                <div className="bg-white/50 p-1 rounded-2xl border border-white/60">
                    <label className="block text-[10px] font-bold text-gray-400 mb-1 px-2 uppercase tracking-wider">使用者視角 (演示模式)</label>
                    <div className="relative">
                        <select
                            value={currentUser.role}
                            onChange={handleUserChange}
                            className="w-full appearance-none bg-white text-gray-600 text-sm font-bold rounded-xl px-4 py-2 border-none shadow-sm focus:ring-2 focus:ring-cute-primary cursor-pointer"
                        >
                            <option value={UserRole.Admin}>系統管理員</option>
                            <option value={UserRole.Teacher}>班負責 ({teacherUser?.fullName})</option>
                            <option value={UserRole.Recorder}>紀錄人員 ({recorderUser?.fullName})</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto py-2 px-2 custom-scrollbar space-y-1">
                {filteredNavItems.map((item) => (
                    <NavLink
                        key={item.label}
                        to={item.to}
                        onClick={() => {
                            if (window.innerWidth < 768) onClose();
                        }}
                        className={({ isActive }) => `${baseLinkClass} ${isActive ? activeLinkClass : ''}`}
                    >
                        <div className={`p-2 rounded-2xl mr-3 ${item.color} ${item.to === window.location.hash.substring(1) ? 'bg-cute-primary/10' : 'bg-gray-100'} transition-colors`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={item.icon} />
                            </svg>
                        </div>
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="p-6">
                <div className="bg-gradient-to-br from-white/80 to-white/40 backdrop-blur-sm rounded-3xl p-4 shadow-sm border border-white">
                    <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-cute-secondary/20 flex items-center justify-center text-cute-secondary font-bold text-lg mr-3 border-2 border-white">
                            {currentUser.fullName.charAt(0)}
                        </div>
                        <div>
                            <p className="font-bold text-gray-700 text-sm">{currentUser.fullName}</p>
                            <p className="text-xs text-gray-400 font-medium">{currentUser.role !== UserRole.Admin && currentUser.classId ? `Class ID: ${currentUser.classId}` : 'Administrator'}</p>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
