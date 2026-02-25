import { Request, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../utils/auditLog';
import { AttendanceStatus } from '@prisma/client';

interface AttendanceRecordInput {
    teacherId: number | string;
    status: AttendanceStatus;
    reason?: string;
}

export const TeacherAttendanceController = {
    // Get all teacher attendance records with optional filtering
    async getAll(req: Request, res: Response) {
        try {
            const { sessionId, teacherId, status } = req.query;

            const where: Record<string, unknown> = {};
            if (sessionId) where.sessionId = Number(sessionId);
            if (teacherId) where.teacherId = Number(teacherId);
            if (status) where.status = status as string;

            const records = await prisma.teacherAttendance.findMany({
                where,
                include: {
                    teacher: { select: { id: true, fullName: true, teacherType: true } },
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
            res.status(500).json({ error: 'Failed to fetch teacher attendance records' });
        }
    },

    // Get single attendance record by ID
    async getById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const record = await prisma.teacherAttendance.findUnique({
                where: { id: Number(id) },
                include: { teacher: true, session: { include: { class: true } } }
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
            const { sessionId, teacherId, status, reason } = req.body;
            const operatorId = req.user?.id ?? null;

            if (!sessionId || !teacherId || !status) {
                return res.status(400).json({ error: 'Missing required fields: sessionId, teacherId, status' });
            }

            const record = await prisma.teacherAttendance.upsert({
                where: { sessionId_teacherId: { sessionId: Number(sessionId), teacherId: Number(teacherId) } },
                update: { status, reason: reason || null },
                create: { sessionId: Number(sessionId), teacherId: Number(teacherId), status, reason: reason || null },
                include: { teacher: true, session: true }
            });

            await createAuditLog({
                type: '教師出席記錄',
                description: `記錄教師 #${teacherId} 於課堂 #${sessionId} 出席狀態：${status}`,
                userId: operatorId,
                metadata: { sessionId: Number(sessionId), teacherId: Number(teacherId), status }
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
                    prisma.teacherAttendance.upsert({
                        where: { sessionId_teacherId: { sessionId: Number(sessionId), teacherId: Number(record.teacherId) } },
                        update: { status: record.status, reason: record.reason || null },
                        create: { sessionId: Number(sessionId), teacherId: Number(record.teacherId), status: record.status, reason: record.reason || null }
                    })
                )
            );

            await createAuditLog({
                type: '教師出席批次記錄',
                description: `批次記錄課堂 #${sessionId} 教師出席，共 ${results.length} 筆`,
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

            await prisma.teacherAttendance.delete({ where: { id: Number(id) } });

            await createAuditLog({
                type: '教師出席刪除',
                description: `刪除教師出席記錄 #${id}`,
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

export default TeacherAttendanceController;
