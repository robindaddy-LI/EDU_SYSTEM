import { Request, Response } from 'express';
import prisma from '../prisma';

export const StudentAttendanceController = {
    // Get all student attendance records with optional filtering
    async getAll(req: Request, res: Response) {
        try {
            const { sessionId, studentId, status } = req.query;

            const where: any = {};
            if (sessionId) where.sessionId = Number(sessionId);
            if (studentId) where.studentId = Number(studentId);
            if (status) where.status = status as string;

            const records = await prisma.studentAttendance.findMany({
                where,
                include: {
                    student: {
                        select: {
                            id: true,
                            fullName: true,
                            studentType: true
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
            res.status(500).json({ error: 'Failed to fetch student attendance records' });
        }
    },

    // Get single attendance record by ID
    async getById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const record = await prisma.studentAttendance.findUnique({
                where: { id: Number(id) },
                include: {
                    student: true,
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
            const { sessionId, studentId, status, reason } = req.body;

            if (!sessionId || !studentId || !status) {
                return res.status(400).json({
                    error: 'Missing required fields: sessionId, studentId, status'
                });
            }

            const record = await prisma.studentAttendance.upsert({
                where: {
                    sessionId_studentId: {
                        sessionId: Number(sessionId),
                        studentId: Number(studentId)
                    }
                },
                update: {
                    status,
                    reason: reason || null
                },
                create: {
                    sessionId: Number(sessionId),
                    studentId: Number(studentId),
                    status,
                    reason: reason || null
                },
                include: {
                    student: true,
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
                    prisma.studentAttendance.upsert({
                        where: {
                            sessionId_studentId: {
                                sessionId: Number(sessionId),
                                studentId: Number(record.studentId)
                            }
                        },
                        update: {
                            status: record.status,
                            reason: record.reason || null
                        },
                        create: {
                            sessionId: Number(sessionId),
                            studentId: Number(record.studentId),
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

            await prisma.studentAttendance.delete({
                where: { id: Number(id) }
            });

            res.json({ success: true, message: 'Attendance record deleted successfully' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to delete attendance record' });
        }
    }
};

export default StudentAttendanceController;
