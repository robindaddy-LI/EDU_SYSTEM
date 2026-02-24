import apiClient from './api';
import { OperationLog } from '../types';

export interface CreateOperationLogDto {
    type: string;
    description: string;
    userId?: number;
    metadata?: Record<string, unknown>;
}

export const operationLogService = {
    async getAll(params?: {
        type?: string;
        startDate?: string;
        endDate?: string;
        limit?: number;
    }): Promise<OperationLog[]> {
        const response = await apiClient.get('/operation-logs', { params });
        return response.data;
    },

    async getById(id: number): Promise<OperationLog> {
        const response = await apiClient.get(`/operation-logs/${id}`);
        return response.data;
    },

    async create(data: CreateOperationLogDto): Promise<OperationLog> {
        const response = await apiClient.post('/operation-logs', data);
        return response.data;
    },

    async delete(id: number): Promise<void> {
        await apiClient.delete(`/operation-logs/${id}`);
    }
};

export default operationLogService;
