import apiClient from './api';
import { Class } from '../types';

export interface ClassWithCounts extends Class {
    _count?: {
        students: number;
        classSessions: number;
    };
}

export interface ClassDetail extends Class {
    students?: Array<{ id: number; fullName: string; status: string }>;
    teacherClassAssignments?: Array<{
        id: number;
        academicYear: string;
        isLead: boolean;
        teacher: { id: number; fullName: string };
    }>;
}

// Helper to map backend response to frontend Class type
// Now frontend uses 'name' too, so we just pass it through
const mapToClass = (data: { id: number; name: string; _count?: { students: number; classSessions: number } }): ClassWithCounts => ({
    id: data.id,
    name: data.name,
    _count: data._count
});

export const classService = {
    // Get all classes with counts
    async getAll(): Promise<ClassWithCounts[]> {
        const response = await apiClient.get('/classes');
        return response.data.map(mapToClass);
    },

    // Get single class by ID with students and teachers
    async getById(id: number, academicYear?: string): Promise<ClassDetail> {
        const response = await apiClient.get(`/classes/${id}`, {
            params: academicYear ? { academicYear } : undefined
        });
        return response.data; // Backend returns 'name', which matches ClassDetail
    },

    // Create a new class
    async create(data: { name: string }): Promise<Class> {
        const response = await apiClient.post('/classes', { name: data.name });
        return mapToClass(response.data);
    },

    // Update class
    async update(id: number, data: { name: string }): Promise<Class> {
        const response = await apiClient.put(`/classes/${id}`, { name: data.name });
        return mapToClass(response.data);
    },

    // Delete class
    async delete(id: number): Promise<{ success: boolean; message: string }> {
        const response = await apiClient.delete(`/classes/${id}`);
        return response.data;
    }
};

export default classService;
