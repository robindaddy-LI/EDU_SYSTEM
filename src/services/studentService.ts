import apiClient from './api';
import { Student, StudentType } from '../types';

export interface StudentFilter {
    classId?: number;
    status?: 'active' | 'inactive';
    search?: string;
}

export interface StudentCreateData {
    fullName: string;
    studentType: StudentType;
    classId: number;
    status?: string;
    dob?: string;
    address?: string;
    contactName?: string;
    contactPhone?: string;
    isBaptized?: boolean;
    baptismDate?: string;
    isSpiritBaptized?: boolean;
    spiritBaptismDate?: string;
    notes?: string;
}

export const studentService = {
    // Get all students with optional filtering
    async getAll(filter?: StudentFilter): Promise<Student[]> {
        const response = await apiClient.get('/students', { params: filter });
        return response.data;
    },

    // Get single student by ID
    async getById(id: number): Promise<Student> {
        const response = await apiClient.get(`/students/${id}`);
        return response.data;
    },

    // Create a new student
    async create(data: StudentCreateData): Promise<Student> {
        const response = await apiClient.post('/students', data);
        return response.data;
    },

    // Update student
    async update(id: number, data: Partial<StudentCreateData>): Promise<Student> {
        const response = await apiClient.put(`/students/${id}`, data);
        return response.data;
    },

    // Delete student (soft delete)
    async delete(id: number): Promise<{ success: boolean; message: string }> {
        const response = await apiClient.delete(`/students/${id}`);
        return response.data;
    }
};

export default studentService;
