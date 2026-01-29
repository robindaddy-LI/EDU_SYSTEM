import { Request, Response } from 'express';
import prisma from '../prisma';

export const OperationLogController = {
    // Get all operation logs with optional filtering
    async getAll(req: Request, res: Response) {
        try {
            const { type, startDate, endDate, limit } = req.query;

            const where: any = {};

            if (type) {
                where.type = type as string;
            }

            if (startDate || endDate) {
                where.timestamp = {};
                if (startDate) {
                    where.timestamp.gte = new Date(startDate as string);
                }
                if (endDate) {
                    where.timestamp.lte = new Date(endDate as string);
                }
            }

            const logs = await prisma.operationLog.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            fullName: true,
                            username: true
                        }
                    }
                },
                orderBy: { timestamp: 'desc' },
                take: limit ? parseInt(limit as string) : 100
            });

            res.json(logs);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch operation logs' });
        }
    },

    // Get single log by ID
    async getById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const log = await prisma.operationLog.findUnique({
                where: { id: Number(id) },
                include: {
                    user: true
                }
            });

            if (!log) {
                return res.status(404).json({ error: 'Operation log not found' });
            }

            res.json(log);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch operation log' });
        }
    },

    // Create a new operation log
    async create(req: Request, res: Response) {
        try {
            const { type, description, userId, metadata } = req.body;

            if (!type || !description) {
                return res.status(400).json({
                    error: 'Missing required fields: type, description'
                });
            }

            const newLog = await prisma.operationLog.create({
                data: {
                    type,
                    description,
                    userId: userId ? Number(userId) : null,
                    metadata: metadata || null
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            fullName: true,
                            username: true
                        }
                    }
                }
            });

            res.status(201).json(newLog);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to create operation log' });
        }
    },

    // Delete an operation log
    async delete(req: Request, res: Response) {
        try {
            const { id } = req.params;

            await prisma.operationLog.delete({
                where: { id: Number(id) }
            });

            res.json({ success: true, message: 'Operation log deleted successfully' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to delete operation log' });
        }
    }
};

export default OperationLogController;
