import apiClient from './api';
import { StudentAttendanceRecord } from '../types';

export interface StudentAttendanceUpsertDto {
    sessionId: number;
    studentId: number;
    status: 'present' | 'absent' | 'late' | 'excused';
    reason?: string;
}

export interface StudentAttendanceBatchDto {
    sessionId: number;
    records: Array<{
        studentId: number;
        status: 'present' | 'absent' | 'late' | 'excused';
        reason?: string;
    }>;
}

export const studentAttendanceService = {
    async getAll(params?: {
        sessionId?: number;
        studentId?: number;
        status?: string;
    }): Promise<StudentAttendanceRecord[]> {
        const response = await apiClient.get('/student-attendance', { params });
        return response.data;
    },

    async getById(id: number): Promise<StudentAttendanceRecord> {
        const response = await apiClient.get(`/student-attendance/${id}`);
        return response.data;
    },

    async upsert(data: StudentAttendanceUpsertDto): Promise<StudentAttendanceRecord> {
        const response = await apiClient.post('/student-attendance', data);
        return response.data;
    },

    async batchUpsert(data: StudentAttendanceBatchDto): Promise<{ success: boolean; count: number; message: string }> {
        const response = await apiClient.post('/student-attendance/batch', data);
        return response.data;
    },

    async delete(id: number): Promise<void> {
        await apiClient.delete(`/student-attendance/${id}`);
    }
};

export default studentAttendanceService;

