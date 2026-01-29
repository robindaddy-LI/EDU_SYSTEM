
import { Request, Response } from 'express';
import { AttendanceStatus } from '@prisma/client';
import prisma from '../prisma';

export const ClassSessionController = {
    // Get all sessions (with optional filtering)
    async getAllSessions(req: Request, res: Response) {
        try {
            const { classId, startDate, endDate } = req.query;

            const where: any = {};
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
                include: {
                    class: true,
                }
            });
            res.json(sessions);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch sessions' });
        }
    },

    // Get single session with updated details
    async getSessionById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const session = await prisma.classSession.findUnique({
                where: { id: Number(id) },
                include: {
                    class: true,
                    studentAttendance: {
                        include: { student: true }
                    },
                    teacherAttendance: {
                        include: { teacher: true }
                    }
                }
            });

            if (!session) {
                return res.status(404).json({ error: 'Session not found' });
            }

            // Format response to match frontend expectations nicely
            const response = {
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
                attendingTeachers: session.teacherAttendance.map((r: any) => ({
                    id: r.id, // record id
                    teacher: r.teacher,
                    status: r.status,
                    reason: r.reason
                })),
                studentAttendance: session.studentAttendance.map((r: any) => ({
                    id: r.id, // record id
                    student: r.student,
                    status: r.status,
                    reason: r.reason
                }))
            };

            res.json(response);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch session details' });
        }
    },

    // Create a new session
    async createSession(req: Request, res: Response) {
        try {
            const { classId, date, sessionType } = req.body;

            const newSession = await prisma.classSession.create({
                data: {
                    classId: Number(classId),
                    date: new Date(date),
                    sessionType,
                    offeringAmount: 0,
                    auditorCount: 0
                }
            });

            // Automatically initialize attendance records for all active students in this class
            const students = await prisma.student.findMany({
                where: { classId: Number(classId), status: 'active' }
            });

            const studentAttendanceData = students.map((s: any) => ({
                sessionId: newSession.id,
                studentId: s.id,
                status: AttendanceStatus.present // Default to present? Or leave for user to set?
            }));

            if (studentAttendanceData.length > 0) {
                await prisma.studentAttendance.createMany({
                    data: studentAttendanceData
                });
            }

            // Initialize for teachers assigned to this class for the current year
            // (Simplified logic: taking all 'active' teachers associated with this class)
            // For accurate year mapping, we'd need to check the academic year of the session date.
            // Ignoring year check for MVP or assuming a current 'active' assignment view.
            const assignedTeachers = await prisma.teacherClassAssignment.findMany({
                where: { classId: Number(classId) },
                include: { teacher: true }
            });

            const teacherAttendanceData = assignedTeachers
                .filter((a: any) => a.teacher.status === 'active')
                .map((a: any) => ({
                    sessionId: newSession.id,
                    teacherId: a.teacherId,
                    status: AttendanceStatus.present
                }));

            if (teacherAttendanceData.length > 0) {
                await prisma.teacherAttendance.createMany({
                    data: teacherAttendanceData
                });
            }

            res.status(201).json(newSession);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to create session' });
        }
    },

    // Update session details
    async updateSession(req: Request, res: Response) {
        try {
            const { id } = req.params;
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

            res.json(updated);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to update session' });
        }
    },

    // Batch update attendance
    async updateAttendance(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const sessionId = Number(id);
            const { students, teachers } = req.body;
            // Expected format: 
            // students: [{ studentId: 1, status: 'present', reason: '' }, ...]
            // teachers: [{ teacherId: 1, status: 'present', reason: '' }, ...]

            const transactionOps = [];

            // Update Students
            if (students && Array.isArray(students)) {
                for (const s of students) {
                    // Upsert logic: update if exists, insert if not (e.g. new student joined class late)
                    transactionOps.push(
                        prisma.studentAttendance.upsert({
                            where: {
                                sessionId_studentId: {
                                    sessionId,
                                    studentId: s.studentId
                                }
                            },
                            update: {
                                status: s.status,
                                reason: s.reason
                            },
                            create: {
                                sessionId,
                                studentId: s.studentId,
                                status: s.status,
                                reason: s.reason
                            }
                        })
                    );
                }
            }

            // Update Teachers
            if (teachers && Array.isArray(teachers)) {
                for (const t of teachers) {
                    transactionOps.push(
                        prisma.teacherAttendance.upsert({
                            where: {
                                sessionId_teacherId: {
                                    sessionId,
                                    teacherId: t.teacherId
                                }
                            },
                            update: {
                                status: t.status,
                                reason: t.reason
                            },
                            create: {
                                sessionId,
                                teacherId: t.teacherId,
                                status: t.status,
                                reason: t.reason
                            }
                        })
                    );
                }
            }

            await prisma.$transaction(transactionOps);
            res.json({ success: true });

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to update attendance' });
        }
    }
};
