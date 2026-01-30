
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from './types';
import { userService } from './services';

interface AuthContextType {
    currentUser: User;
    setCurrentUser: (user: User) => void;
    isAdmin: boolean;
    isClassLead: boolean;
    isRecorder: boolean;
    userClassId?: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Initial user load
    useEffect(() => {
        const initAuth = async () => {
            setIsLoading(true);
            try {
                // 1. Try to recover session from localStorage
                const storedUserId = localStorage.getItem('edu_user_id');
                if (storedUserId) {
                    try {
                        const user = await userService.getById(parseInt(storedUserId));
                        setCurrentUser(user);
                        return; // Found and loaded
                    } catch (e) {
                        console.warn('Failed to restore session:', e);
                        localStorage.removeItem('edu_user_id');
                    }
                }

                // 2. If no session or restore failed, fetch default admin (for demo purposes)
                // In a real app, we would just leave currentUser as null and redirect to login
                const allUsers = await userService.getAll();
                const defaultAdmin = allUsers.find(u => u.role === UserRole.Admin);
                if (defaultAdmin) {
                    setCurrentUser(defaultAdmin);
                    // Don't auto-save default admin to localStorage to allow explicit logout/in behavior? 
                    // Or save it for convenience? Let's save it for convenience in this demo app.
                    localStorage.setItem('edu_user_id', String(defaultAdmin.id));
                } else if (allUsers.length > 0) {
                    // Fallback to any user
                    setCurrentUser(allUsers[0]);
                }
            } catch (error) {
                console.error('Auth initialization failed:', error);
            } finally {
                setIsLoading(false);
            }
        };

        initAuth();
    }, []);

    const handleSetCurrentUser = (user: User) => {
        setCurrentUser(user);
        localStorage.setItem('edu_user_id', String(user.id));
    };

    // If loading, show nothing or a spinner. But for context provider usually better to just not render children until ready 
    // OR allow children to handle null user. 
    // Given the app structure, rendering children with null user might crash components that expect user.
    // So we'll show a loading screen if loading, OR if still null (shouldn't happen with fallback logic unless DB empty).
    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-500">正在載入使用者資訊...</p>
            </div>
        </div>;
    }

    // Safety check - if initialization finished but no user found (e.g. empty DB), handle gracefully
    // to avoid crashes in components that expect currentUser
    if (!currentUser) {
        return <div className="min-h-screen flex items-center justify-center bg-red-50 text-red-600 p-8 text-center">
            <div>
                <h2 className="text-xl font-bold mb-2">無法載入使用者</h2>
                <p>資料庫可能是空的，請聯繫管理員初始化系統。</p>
            </div>
        </div>;
    }

    const isAdmin = currentUser.role === UserRole.Admin;
    const isClassLead = currentUser.role === UserRole.Teacher;
    const isRecorder = currentUser.role === UserRole.Recorder;
    const userClassId = currentUser.classId;

    return (
        <AuthContext.Provider value={{ currentUser, setCurrentUser: handleSetCurrentUser, isAdmin, isClassLead, isRecorder, userClassId }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
