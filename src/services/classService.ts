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
const mapToClass = (data: any): ClassWithCounts => ({
    id: data.id,
    className: data.name, // Backend uses 'name', frontend uses 'className'
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
        return { ...response.data, className: response.data.name };
    },

    // Create a new class
    async create(data: { className: string }): Promise<Class> {
        const response = await apiClient.post('/classes', { name: data.className });
        return mapToClass(response.data);
    },

    // Update class
    async update(id: number, data: { className: string }): Promise<Class> {
        const response = await apiClient.put(`/classes/${id}`, { name: data.className });
        return mapToClass(response.data);
    },

    // Delete class
    async delete(id: number): Promise<{ success: boolean; message: string }> {
        const response = await apiClient.delete(`/classes/${id}`);
        return response.data;
    }
};

export default classService;
