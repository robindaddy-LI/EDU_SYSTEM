import apiClient from './api';
import { TeacherAttendanceRecord } from '../types';

export interface TeacherAttendanceUpsertDto {
    sessionId: number;
    teacherId: number;
    status: 'present' | 'absent' | 'late' | 'excused';
    reason?: string;
}

export interface TeacherAttendanceBatchDto {
    sessionId: number;
    records: Array<{
        teacherId: number;
        status: 'present' | 'absent' | 'late' | 'excused';
        reason?: string;
    }>;
}

export const teacherAttendanceService = {
    async getAll(params?: {
        sessionId?: number;
        teacherId?: number;
        status?: string;
    }): Promise<TeacherAttendanceRecord[]> {
        const response = await apiClient.get('/teacher-attendance', { params });
        return response.data;
    },

    async getById(id: number): Promise<TeacherAttendanceRecord> {
        const response = await apiClient.get(`/teacher-attendance/${id}`);
        return response.data;
    },

    async upsert(data: TeacherAttendanceUpsertDto): Promise<TeacherAttendanceRecord> {
        const response = await apiClient.post('/teacher-attendance', data);
        return response.data;
    },

    async batchUpsert(data: TeacherAttendanceBatchDto): Promise<{ success: boolean; count: number; message: string }> {
        const response = await apiClient.post('/teacher-attendance/batch', data);
        return response.data;
    },

    async delete(id: number): Promise<void> {
        await apiClient.delete(`/teacher-attendance/${id}`);
    }
};

export default teacherAttendanceService;
