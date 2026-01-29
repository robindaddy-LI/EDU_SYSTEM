import axios from 'axios';

const API_BASE_URL = '/api/v1';

export interface TeacherAttendanceRecord {
    id: number;
    sessionId: number;
    teacherId: number;
    status: 'present' | 'absent' | 'late' | 'excused';
    reason?: string | null;
    teacher?: {
        id: number;
        fullName: string;
        teacherType: string;
    };
    session?: {
        id: number;
        date: Date | string;
        sessionType: string;
        class: {
            id: number;
            name: string;
        };
    };
}

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
        const response = await axios.get(`${API_BASE_URL}/teacher-attendance`, { params });
        return response.data;
    },

    async getById(id: number): Promise<TeacherAttendanceRecord> {
        const response = await axios.get(`${API_BASE_URL}/teacher-attendance/${id}`);
        return response.data;
    },

    async upsert(data: TeacherAttendanceUpsertDto): Promise<TeacherAttendanceRecord> {
        const response = await axios.post(`${API_BASE_URL}/teacher-attendance`, data);
        return response.data;
    },

    async batchUpsert(data: TeacherAttendanceBatchDto): Promise<{ success: boolean; count: number; message: string }> {
        const response = await axios.post(`${API_BASE_URL}/teacher-attendance/batch`, data);
        return response.data;
    },

    async delete(id: number): Promise<void> {
        await axios.delete(`${API_BASE_URL}/teacher-attendance/${id}`);
    }
};

export default teacherAttendanceService;
