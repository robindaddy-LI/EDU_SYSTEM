
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, UserRole } from './types';
import { mockUsers } from './data/mockData';

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
    // Default to Admin for initial state, matching previous behavior
    const [currentUser, setCurrentUser] = useState<User>(mockUsers[0]);

    const isAdmin = currentUser.role === UserRole.Admin;
    const isClassLead = currentUser.role === UserRole.Teacher;
    const isRecorder = currentUser.role === UserRole.Recorder;
    const userClassId = currentUser.classId;

    return (
        <AuthContext.Provider value={{ currentUser, setCurrentUser, isAdmin, isClassLead, isRecorder, userClassId }}>
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
