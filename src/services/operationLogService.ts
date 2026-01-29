import axios from 'axios';

const API_BASE_URL = '/api/v1';

export interface OperationLog {
    id: number;
    timestamp: Date | string;
    type: string;
    description: string;
    userId: number | null;
    metadata?: any;
    createdAt: Date | string;
    user?: {
        id: number;
        fullName: string;
        username: string;
    };
}

export interface CreateOperationLogDto {
    type: string;
    description: string;
    userId?: number;
    metadata?: any;
}

export const operationLogService = {
    async getAll(params?: {
        type?: string;
        startDate?: string;
        endDate?: string;
        limit?: number;
    }): Promise<OperationLog[]> {
        const response = await axios.get(`${API_BASE_URL}/operation-logs`, { params });
        return response.data;
    },

    async getById(id: number): Promise<OperationLog> {
        const response = await axios.get(`${API_BASE_URL}/operation-logs/${id}`);
        return response.data;
    },

    async create(data: CreateOperationLogDto): Promise<OperationLog> {
        const response = await axios.post(`${API_BASE_URL}/operation-logs`, data);
        return response.data;
    },

    async delete(id: number): Promise<void> {
        await axios.delete(`${API_BASE_URL}/operation-logs/${id}`);
    }
};

export default operationLogService;
