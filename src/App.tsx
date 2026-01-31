import React, { useState } from 'react';
import { HashRouter, Route, Routes, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import StudentManagement from './pages/StudentManagement';
import StudentDetail from './pages/StudentDetail';
import TeacherManagement from './pages/TeacherManagement';
import TeacherDetail from './pages/TeacherDetail';
import ClassLogbook from './pages/ClassLogbook';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import UserManagement from './pages/UserManagement';
import AddNewStudent from './pages/AddNewStudent';
import AddNewClassSession from './pages/AddNewClassSession';
import SystemInfo from './pages/SystemInfo';
import OperationLog from './pages/OperationLog';
import EditStudent from './pages/EditStudent';
import AddNewTeacher from './pages/AddNewTeacher';
import EditTeacher from './pages/EditTeacher';
import Login from './pages/Login';
import TeacherAssignmentConfig from './pages/TeacherAssignmentConfig';

const ProtectedLayout: React.FC = () => {
    const { currentUser, isLoading } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();

    // If still loading auth state, show nothing or a spinner
    // In AuthContext we already handle initial loading, but good to be safe
    if (isLoading) return null;

    if (!currentUser) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return (
        <div className="flex h-screen bg-cute-bg font-sans text-cute-text relative overflow-hidden selection:bg-cute-primary selection:text-white">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 z-20 bg-cute-text/20 backdrop-blur-sm md:hidden transition-opacity duration-300"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}

            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            <main className="flex-1 overflow-y-auto p-4 md:p-6 w-full relative scroll-smooth">
                {/* Mobile Hamburger Button */}
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="md:hidden absolute top-4 left-4 z-10 bg-white text-cute-primary p-3 rounded-2xl shadow-cute hover:shadow-cute-hover transition-all duration-300 active:scale-95"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>

                <div className="md:mt-0 mt-16 max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

const App: React.FC = () => {
    return (
        <AuthProvider>
            <HashRouter>
                <Routes>
                    <Route path="/login" element={<Login />} />

                    <Route element={<ProtectedLayout />}>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/users" element={<UserManagement />} />
                        <Route path="/teachers" element={<TeacherManagement />} />
                        <Route path="/teachers/new" element={<AddNewTeacher />} />
                        <Route path="/teachers/:id" element={<TeacherDetail />} />
                        <Route path="/teachers/:id/edit" element={<EditTeacher />} />
                        <Route path="/teacher-assignments" element={<TeacherAssignmentConfig />} />
                        <Route path="/students" element={<StudentManagement />} />
                        <Route path="/students/new" element={<AddNewStudent />} />
                        <Route path="/students/:id" element={<StudentDetail />} />
                        <Route path="/students/:id/edit" element={<EditStudent />} />
                        <Route path="/class-logbook" element={<ClassLogbook />} />
                        <Route path="/class-logbook/new" element={<AddNewClassSession />} />
                        <Route path="/class-logbook/class/:classId" element={<ClassLogbook />} />
                        <Route path="/class-logbook/session/:sessionId" element={<ClassLogbook />} />
                        <Route path="/reports" element={<Reports />} />
                        <Route path="/system-info" element={<SystemInfo />} />
                        <Route path="/operation-log" element={<OperationLog />} />
                        <Route path="/settings" element={<Settings />} />
                    </Route>
                </Routes>
            </HashRouter>
        </AuthProvider>
    );
};

export default App;