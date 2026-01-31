import apiClient from './api';

export interface TeacherAssignment {
    id: number;
    academicYear: string;
    teacherId: number;
    classId: number;
    isLead: boolean;
    teacher?: {
        id: number;
        fullName: string;
        teacherType: string;
        status: string;
    };
    class?: {
        id: number;
        name: string;
    };
}

export interface TeacherAssignmentCreateData {
    academicYear: string;
    teacherId: number;
    classId: number;
    isLead?: boolean;
}

export interface BatchAssignmentData {
    academicYear: string;
    assignments: Array<{
        teacherId: number;
        classId: number;
        isLead: boolean;
    }>;
}

export const teacherAssignmentService = {
    // Get all assignments, optionally filtered by academic year and class
    async getAll(academicYear?: string, classId?: number): Promise<TeacherAssignment[]> {
        const params: any = {};
        if (academicYear) params.academicYear = academicYear;
        if (classId) params.classId = classId;

        const response = await apiClient.get('/teacher-assignments', { params });
        return response.data;
    },

    // Get single assignment by ID
    async getById(id: number): Promise<TeacherAssignment> {
        const response = await apiClient.get(`/teacher-assignments/${id}`);
        return response.data;
    },

    // Create a new assignment
    async create(data: TeacherAssignmentCreateData): Promise<TeacherAssignment> {
        const response = await apiClient.post('/teacher-assignments', data);
        return response.data;
    },

    // Batch upsert assignments for an academic year
    async batchUpsert(data: BatchAssignmentData): Promise<{ success: boolean; count: number; message: string }> {
        const response = await apiClient.post('/teacher-assignments/batch', data);
        return response.data;
    },

    // Update an assignment
    async update(id: number, data: Partial<TeacherAssignmentCreateData>): Promise<TeacherAssignment> {
        const response = await apiClient.put(`/teacher-assignments/${id}`, data);
        return response.data;
    },

    // Delete an assignment
    async delete(id: number): Promise<{ success: boolean; message: string }> {
        const response = await apiClient.delete(`/teacher-assignments/${id}`);
        return response.data;
    }
};

export default teacherAssignmentService;
