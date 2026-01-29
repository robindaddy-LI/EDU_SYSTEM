import { Request, Response } from 'express';
import prisma from '../prisma';

export const TeacherAttendanceController = {
    // Get all teacher attendance records with optional filtering
    async getAll(req: Request, res: Response) {
        try {
            const { sessionId, teacherId, status } = req.query;

            const where: any = {};
            if (sessionId) where.sessionId = Number(sessionId);
            if (teacherId) where.teacherId = Number(teacherId);
            if (status) where.status = status as string;

            const records = await prisma.teacherAttendance.findMany({
                where,
                include: {
                    teacher: {
                        select: {
                            id: true,
                            fullName: true,
                            teacherType: true
                        }
                    },
                    session: {
                        select: {
                            id: true,
                            date: true,
                            sessionType: true,
                            class: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        }
                    }
                },
                orderBy: { id: 'desc' }
            });

            res.json(records);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch teacher attendance records' });
        }
    },

    // Get single attendance record by ID
    async getById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const record = await prisma.teacherAttendance.findUnique({
                where: { id: Number(id) },
                include: {
                    teacher: true,
                    session: {
                        include: {
                            class: true
                        }
                    }
                }
            });

            if (!record) {
                return res.status(404).json({ error: 'Attendance record not found' });
            }

            res.json(record);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch attendance record' });
        }
    },

    // Create or update attendance record
    async upsert(req: Request, res: Response) {
        try {
            const { sessionId, teacherId, status, reason } = req.body;

            if (!sessionId || !teacherId || !status) {
                return res.status(400).json({
                    error: 'Missing required fields: sessionId, teacherId, status'
                });
            }

            const record = await prisma.teacherAttendance.upsert({
                where: {
                    sessionId_teacherId: {
                        sessionId: Number(sessionId),
                        teacherId: Number(teacherId)
                    }
                },
                update: {
                    status,
                    reason: reason || null
                },
                create: {
                    sessionId: Number(sessionId),
                    teacherId: Number(teacherId),
                    status,
                    reason: reason || null
                },
                include: {
                    teacher: true,
                    session: true
                }
            });

            res.json(record);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to upsert attendance record' });
        }
    },

    // Batch upsert attendance records for a session
    async batchUpsert(req: Request, res: Response) {
        try {
            const { sessionId, records } = req.body;

            if (!sessionId || !Array.isArray(records)) {
                return res.status(400).json({
                    error: 'Missing required fields: sessionId, records (array)'
                });
            }

            // Use transaction to ensure all records are created/updated together
            const results = await prisma.$transaction(
                records.map((record: any) =>
                    prisma.teacherAttendance.upsert({
                        where: {
                            sessionId_teacherId: {
                                sessionId: Number(sessionId),
                                teacherId: Number(record.teacherId)
                            }
                        },
                        update: {
                            status: record.status,
                            reason: record.reason || null
                        },
                        create: {
                            sessionId: Number(sessionId),
                            teacherId: Number(record.teacherId),
                            status: record.status,
                            reason: record.reason || null
                        }
                    })
                )
            );

            res.json({
                success: true,
                count: results.length,
                message: `Successfully saved ${results.length} attendance records`
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to batch upsert attendance records' });
        }
    },

    // Delete an attendance record
    async delete(req: Request, res: Response) {
        try {
            const { id } = req.params;

            await prisma.teacherAttendance.delete({
                where: { id: Number(id) }
            });

            res.json({ success: true, message: 'Attendance record deleted successfully' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to delete attendance record' });
        }
    }
};

export default TeacherAttendanceController;
