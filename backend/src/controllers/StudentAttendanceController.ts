import { Request, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../utils/auditLog';
import { AttendanceStatus } from '@prisma/client';

interface AttendanceRecordInput {
    studentId: number | string;
    status: AttendanceStatus;
    reason?: string;
}

export const StudentAttendanceController = {
    // Get all student attendance records with optional filtering
    async getAll(req: Request, res: Response) {
        try {
            const { sessionId, studentId, status } = req.query;

            const where: Record<string, unknown> = {};
            if (sessionId) where.sessionId = Number(sessionId);
            if (studentId) where.studentId = Number(studentId);
            if (status) where.status = status as string;

            const records = await prisma.studentAttendance.findMany({
                where,
                include: {
                    student: { select: { id: true, fullName: true, studentType: true } },
                    session: {
                        select: {
                            id: true, date: true, sessionType: true,
                            class: { select: { id: true, name: true } }
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
                include: { student: true, session: { include: { class: true } } }
            });
            if (!record) return res.status(404).json({ error: 'Attendance record not found' });
            res.json(record);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch attendance record' });
        }
    },

    // Create or update attendance record
    async upsert(req: AuthRequest, res: Response) {
        try {
            const { sessionId, studentId, status, reason } = req.body;
            const operatorId = req.user?.id ?? null;

            if (!sessionId || !studentId || !status) {
                return res.status(400).json({ error: 'Missing required fields: sessionId, studentId, status' });
            }

            const record = await prisma.studentAttendance.upsert({
                where: { sessionId_studentId: { sessionId: Number(sessionId), studentId: Number(studentId) } },
                update: { status, reason: reason || null },
                create: { sessionId: Number(sessionId), studentId: Number(studentId), status, reason: reason || null },
                include: { student: true, session: true }
            });

            await createAuditLog({
                type: '學生出席記錄',
                description: `記錄學生 #${studentId} 於課堂 #${sessionId} 出席狀態：${status}`,
                userId: operatorId,
                metadata: { sessionId: Number(sessionId), studentId: Number(studentId), status }
            });

            res.json(record);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to upsert attendance record' });
        }
    },

    // Batch upsert attendance records for a session
    async batchUpsert(req: AuthRequest, res: Response) {
        try {
            const { sessionId, records } = req.body;
            const operatorId = req.user?.id ?? null;

            if (!sessionId || !Array.isArray(records)) {
                return res.status(400).json({ error: 'Missing required fields: sessionId, records (array)' });
            }

            const results = await prisma.$transaction(
                (records as AttendanceRecordInput[]).map(record =>
                    prisma.studentAttendance.upsert({
                        where: { sessionId_studentId: { sessionId: Number(sessionId), studentId: Number(record.studentId) } },
                        update: { status: record.status, reason: record.reason || null },
                        create: { sessionId: Number(sessionId), studentId: Number(record.studentId), status: record.status, reason: record.reason || null }
                    })
                )
            );

            await createAuditLog({
                type: '學生出席批次記錄',
                description: `批次記錄課堂 #${sessionId} 學生出席，共 ${results.length} 筆`,
                userId: operatorId,
                metadata: { sessionId: Number(sessionId), count: results.length }
            });

            res.json({ success: true, count: results.length, message: `Successfully saved ${results.length} attendance records` });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to batch upsert attendance records' });
        }
    },

    // Delete an attendance record
    async delete(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const operatorId = req.user?.id ?? null;

            await prisma.studentAttendance.delete({ where: { id: Number(id) } });

            await createAuditLog({
                type: '學生出席刪除',
                description: `刪除學生出席記錄 #${id}`,
                userId: operatorId,
                metadata: { attendanceId: Number(id) }
            });

            res.json({ success: true, message: 'Attendance record deleted successfully' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to delete attendance record' });
        }
    }
};

export default StudentAttendanceController;
