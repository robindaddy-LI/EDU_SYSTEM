import axios from 'axios';

const API_BASE_URL = '/api/v1';

export interface StudentAttendanceRecord {
    id: number;
    sessionId: number;
    studentId: number;
    status: 'present' | 'absent' | 'late' | 'excused';
    reason?: string | null;
    student?: {
        id: number;
        fullName: string;
        studentType: string;
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
        const response = await axios.get(`${API_BASE_URL}/student-attendance`, { params });
        return response.data;
    },

    async getById(id: number): Promise<StudentAttendanceRecord> {
        const response = await axios.get(`${API_BASE_URL}/student-attendance/${id}`);
        return response.data;
    },

    async upsert(data: StudentAttendanceUpsertDto): Promise<StudentAttendanceRecord> {
        const response = await axios.post(`${API_BASE_URL}/student-attendance`, data);
        return response.data;
    },

    async batchUpsert(data: StudentAttendanceBatchDto): Promise<{ success: boolean; count: number; message: string }> {
        const response = await axios.post(`${API_BASE_URL}/student-attendance/batch`, data);
        return response.data;
    },

    async delete(id: number): Promise<void> {
        await axios.delete(`${API_BASE_URL}/student-attendance/${id}`);
    }
};

export default studentAttendanceService;
