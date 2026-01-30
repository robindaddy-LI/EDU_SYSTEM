import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from './types';
import { userService } from './services';

interface AuthContextType {
    currentUser: User | null;
    setCurrentUser: (user: User | null) => void;
    login: (user: User) => void;
    logout: () => void;
    isAdmin: boolean;
    isClassLead: boolean;
    isRecorder: boolean;
    userClassId?: number;
    isLoading: boolean;
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
                        if (user) {
                            setCurrentUser(user);
                        } else {
                            // User ID in local storage not found in DB
                            localStorage.removeItem('edu_user_id');
                        }
                    } catch (e) {
                        console.warn('Failed to restore session:', e);
                        localStorage.removeItem('edu_user_id');
                    }
                }
            } catch (error) {
                console.error('Auth initialization failed:', error);
            } finally {
                setIsLoading(false);
            }
        };

        initAuth();
    }, []);

    const login = (user: User) => {
        setCurrentUser(user);
        localStorage.setItem('edu_user_id', String(user.id));
    };

    const logout = () => {
        setCurrentUser(null);
        localStorage.removeItem('edu_user_id');
    };

    const isAdmin = currentUser?.role === UserRole.Admin;
    const isClassLead = currentUser?.role === UserRole.Teacher;
    const isRecorder = currentUser?.role === UserRole.Recorder;
    const userClassId = currentUser?.classId;

    return (
        <AuthContext.Provider value={{
            currentUser,
            setCurrentUser, // Keep for backward compatibility if needed, but login/logout is preferred
            login,
            logout,
            isAdmin,
            isClassLead,
            isRecorder,
            userClassId,
            isLoading
        }}>
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
