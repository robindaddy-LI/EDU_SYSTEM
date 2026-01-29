import apiClient from './api';
import { ClassSession, AttendanceStatus } from '../types';

export interface SessionFilter {
    classId?: number;
    startDate?: string;
    endDate?: string;
}

export interface SessionDetail {
    session: ClassSession;
    attendingTeachers: Array<{
        id: number;
        teacher: { id: number; fullName: string };
        status: AttendanceStatus;
        reason?: string;
    }>;
    studentAttendance: Array<{
        id: number;
        student: { id: number; fullName: string };
        status: AttendanceStatus;
        reason?: string;
    }>;
}

export interface AttendanceUpdate {
    students?: Array<{ studentId: number; status: AttendanceStatus; reason?: string }>;
    teachers?: Array<{ teacherId: number; status: AttendanceStatus; reason?: string }>;
}

export const sessionService = {
    // Get all sessions with optional filtering
    async getAll(filter?: SessionFilter): Promise<ClassSession[]> {
        const response = await apiClient.get('/sessions', { params: filter });
        return response.data;
    },

    // Get single session by ID with attendance details
    async getById(id: number): Promise<SessionDetail> {
        const response = await apiClient.get(`/sessions/${id}`);
        return response.data;
    },

    // Create a new session
    async create(data: { classId: number; date: string; sessionType: string }): Promise<ClassSession> {
        const response = await apiClient.post('/sessions', data);
        return response.data;
    },

    // Update session details
    async update(id: number, data: Partial<ClassSession>): Promise<ClassSession> {
        const response = await apiClient.put(`/sessions/${id}`, data);
        return response.data;
    },

    // Update attendance for a session
    async updateAttendance(id: number, data: AttendanceUpdate): Promise<{ success: boolean }> {
        const response = await apiClient.post(`/sessions/${id}/attendance`, data);
        return response.data;
    }
};

export default sessionService;
