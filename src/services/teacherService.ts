import apiClient from './api';
import { Teacher, TeacherType } from '../types';

export interface TeacherFilter {
    status?: 'active' | 'inactive';
    search?: string;
}

export interface TeacherCreateData {
    fullName: string;
    teacherType: TeacherType;
    status?: string;
    phone?: string;
    email?: string;
    notes?: string;
}

export interface ClassAssignmentData {
    classId: number;
    academicYear: string;
    isLead?: boolean;
}

export const teacherService = {
    // Get all teachers with optional filtering
    async getAll(filter?: TeacherFilter): Promise<Teacher[]> {
        const response = await apiClient.get('/teachers', { params: filter });
        return response.data;
    },

    // Get single teacher by ID
    async getById(id: number): Promise<Teacher> {
        const response = await apiClient.get(`/teachers/${id}`);
        return response.data;
    },

    // Create a new teacher
    async create(data: TeacherCreateData): Promise<Teacher> {
        const response = await apiClient.post('/teachers', data);
        return response.data;
    },

    // Update teacher
    async update(id: number, data: Partial<TeacherCreateData>): Promise<Teacher> {
        const response = await apiClient.put(`/teachers/${id}`, data);
        return response.data;
    },

    // Delete teacher (soft delete)
    async delete(id: number): Promise<{ success: boolean; message: string }> {
        const response = await apiClient.delete(`/teachers/${id}`);
        return response.data;
    },

    // Assign teacher to class
    async assignToClass(id: number, data: ClassAssignmentData): Promise<any> {
        const response = await apiClient.post(`/teachers/${id}/assign`, data);
        return response.data;
    }
};

export default teacherService;
