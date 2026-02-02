import apiClient from './api';
import { User, UserRole } from '../types';

export interface UserFilter {
    role?: UserRole;
    status?: 'active' | 'inactive';
    search?: string;
}

export interface UserCreateData {
    username: string;
    password: string;
    fullName: string;
    role: UserRole;
    classId?: number;
    email?: string;
    status?: 'active' | 'inactive';
}

export interface UserUpdateData {
    username?: string;
    password?: string;
    fullName?: string;
    role?: UserRole;
    classId?: number | null;
    email?: string;
    status?: 'active' | 'inactive';
}

export interface LoginResponse {
    token: string;
    user: {
        id: number;
        username: string;
        fullName: string;
        role: UserRole;
        classId?: number;
        class?: { id: number; name: string };
    };
}

export const userService = {
    // Get all users with optional filtering
    async getAll(filter?: UserFilter): Promise<User[]> {
        const response = await apiClient.get('/users', { params: filter });
        return response.data;
    },

    // Get single user by ID
    async getById(id: number): Promise<User> {
        const response = await apiClient.get(`/users/${id}`);
        return response.data;
    },

    // Create a new user
    async create(data: UserCreateData): Promise<User> {
        const response = await apiClient.post('/users', data);
        return response.data;
    },

    // Update user
    async update(id: number, data: UserUpdateData): Promise<User> {
        const response = await apiClient.put(`/users/${id}`, data);
        return response.data;
    },

    // Delete user (soft delete)
    async delete(id: number): Promise<{ success: boolean; message: string }> {
        const response = await apiClient.delete(`/users/${id}`);
        return response.data;
    },

    // Login
    async login(username: string, password: string): Promise<LoginResponse> {
        const response = await apiClient.post('/users/login', { username, password });
        return response.data;
    }
};

export default userService;
