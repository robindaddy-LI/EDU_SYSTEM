import { Response } from 'express';
import { AttendanceStatus } from '@prisma/client';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../utils/auditLog';

export const ClassSessionController = {
    // Get all sessions (with optional filtering)
    async getAllSessions(req: AuthRequest, res: Response) {
        try {
            const { classId, startDate, endDate } = req.query;

            const where: Record<string, unknown> = {};
            if (classId) where.classId = Number(classId);
            if (startDate && endDate) {
                where.date = {
                    gte: new Date(startDate as string),
                    lte: new Date(endDate as string),
                };
            }

            const sessions = await prisma.classSession.findMany({
                where,
                orderBy: { date: 'desc' },
                include: { class: true }
            });
            res.json(sessions);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch sessions' });
        }
    },

    // Get single session with attendance details
    async getSessionById(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const session = await prisma.classSession.findUnique({
                where: { id: Number(id) },
                include: {
                    class: true,
                    studentAttendance: { include: { student: true } },
                    teacherAttendance: { include: { teacher: true } }
                }
            });

            if (!session) {
                return res.status(404).json({ error: 'Session not found' });
            }

            const sessionDate = new Date(session.date);
            const academicYear = sessionDate.getMonth() >= 8
                ? sessionDate.getFullYear()
                : sessionDate.getFullYear() - 1;

            const allStudents = await prisma.student.findMany({
                where: { classId: session.classId, status: 'active' }
            });

            const assignedTeachers = await prisma.teacherClassAssignment.findMany({
                where: { classId: session.classId, academicYear: String(academicYear) },
                include: { teacher: true }
            });

            const studentAttendanceMap = new Map(session.studentAttendance.map(r => [r.studentId, r]));
            const studentList = [...allStudents];
            session.studentAttendance.forEach(r => {
                if (!studentList.find(s => s.id === r.studentId)) {
                    studentList.push(r.student);
                }
            });

            const mergedStudentAttendance = studentList.map(student => {
                const record = studentAttendanceMap.get(student.id);
                return {
                    id: record ? record.id : 0,
                    student,
                    status: record ? record.status : AttendanceStatus.present,
                    reason: record ? record.reason : undefined
                };
            });

            const teacherAttendanceMap = new Map(session.teacherAttendance.map(r => [r.teacherId, r]));
            let teacherList = assignedTeachers.map(a => a.teacher).filter(t => t.status === 'active');

            if (teacherList.length === 0) {
                teacherList = await prisma.teacher.findMany({ where: { status: 'active' } });
            }
            session.teacherAttendance.forEach(r => {
                if (!teacherList.find(t => t.id === r.teacherId)) {
                    teacherList.push(r.teacher);
                }
            });

            const mergedTeacherAttendance = teacherList.map(teacher => {
                const record = teacherAttendanceMap.get(teacher.id);
                return {
                    id: record ? record.id : 0,
                    teacher,
                    status: record ? record.status : AttendanceStatus.present,
                    reason: record ? record.reason : undefined
                };
            });

            res.json({
                session: {
                    id: session.id,
                    classId: session.classId,
                    sessionDate: session.date.toISOString().split('T')[0],
                    sessionType: session.sessionType,
                    worshipTopic: session.worshipTopic,
                    worshipTeacherName: session.worshipTeacherName,
                    activityTopic: session.activityTopic,
                    activityTeacherName: session.activityTeacherName,
                    auditorCount: session.auditorCount,
                    offeringAmount: Number(session.offeringAmount),
                    notes: session.notes,
                    isCancelled: session.isCancelled,
                    cancellationReason: session.cancellationReason,
                },
                attendingTeachers: mergedTeacherAttendance,
                studentAttendance: mergedStudentAttendance
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch session details' });
        }
    },

    // Create a new session
    async createSession(req: AuthRequest, res: Response) {
        try {
            const { classId, date, sessionType } = req.body;
            const operatorId = req.user?.id ?? null;

            const newSession = await prisma.classSession.create({
                data: {
                    classId: Number(classId),
                    date: new Date(date),
                    sessionType,
                    offeringAmount: 0,
                    auditorCount: 0
                }
            });

            const students = await prisma.student.findMany({
                where: { classId: Number(classId), status: 'active' }
            });

            if (students.length > 0) {
                await prisma.studentAttendance.createMany({
                    data: students.map(s => ({
                        sessionId: newSession.id,
                        studentId: s.id,
                        status: AttendanceStatus.present
                    }))
                });
            }

            const assignedTeachers = await prisma.teacherClassAssignment.findMany({
                where: { classId: Number(classId) },
                include: { teacher: true }
            });

            const activeTeacherData = assignedTeachers
                .filter(a => a.teacher.status === 'active')
                .map(a => ({
                    sessionId: newSession.id,
                    teacherId: a.teacherId,
                    status: AttendanceStatus.present
                }));

            if (activeTeacherData.length > 0) {
                await prisma.teacherAttendance.createMany({ data: activeTeacherData });
            }

            await createAuditLog({
                type: '課堂新增',
                description: `新增課堂（班級 #${classId}，日期 ${date}）`,
                userId: operatorId,
                metadata: { sessionId: newSession.id, classId: Number(classId), date, sessionType }
            });

            res.status(201).json(newSession);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to create session' });
        }
    },

    // Update session details
    async updateSession(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const operatorId = req.user?.id ?? null;
            const {
                worshipTopic, worshipTeacherName, activityTopic, activityTeacherName,
                auditorCount, offeringAmount, notes, isCancelled, cancellationReason
            } = req.body;

            const updated = await prisma.classSession.update({
                where: { id: Number(id) },
                data: {
                    worshipTopic,
                    worshipTeacherName,
                    activityTopic,
                    activityTeacherName,
                    auditorCount: auditorCount !== undefined ? Number(auditorCount) : undefined,
                    offeringAmount: offeringAmount !== undefined ? Number(offeringAmount) : undefined,
                    notes,
                    isCancelled,
                    cancellationReason
                }
            });

            await createAuditLog({
                type: '課堂修改',
                description: `修改課堂 #${id} 資料`,
                userId: operatorId,
                metadata: { sessionId: Number(id) }
            });

            res.json(updated);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to update session' });
        }
    },

    // Batch update attendance
    async updateAttendance(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const sessionId = Number(id);
            const { students, teachers } = req.body;
            const operatorId = req.user?.id ?? null;

            interface AttendanceInput { studentId?: number; teacherId?: number; status: AttendanceStatus; reason?: string; }

            const transactionOps = [];

            if (students && Array.isArray(students)) {
                for (const s of students as AttendanceInput[]) {
                    transactionOps.push(
                        prisma.studentAttendance.upsert({
                            where: { sessionId_studentId: { sessionId, studentId: s.studentId! } },
                            update: { status: s.status, reason: s.reason },
                            create: { sessionId, studentId: s.studentId!, status: s.status, reason: s.reason }
                        })
                    );
                }
            }

            if (teachers && Array.isArray(teachers)) {
                for (const t of teachers as AttendanceInput[]) {
                    transactionOps.push(
                        prisma.teacherAttendance.upsert({
                            where: { sessionId_teacherId: { sessionId, teacherId: t.teacherId! } },
                            update: { status: t.status, reason: t.reason },
                            create: { sessionId, teacherId: t.teacherId!, status: t.status, reason: t.reason }
                        })
                    );
                }
            }

            await prisma.$transaction(transactionOps);

            await createAuditLog({
                type: '出席記錄更新',
                description: `更新課堂 #${sessionId} 出席記錄`,
                userId: operatorId,
                metadata: {
                    sessionId,
                    studentCount: students?.length ?? 0,
                    teacherCount: teachers?.length ?? 0
                }
            });

            res.json({ success: true });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to update attendance' });
        }
    }
};
