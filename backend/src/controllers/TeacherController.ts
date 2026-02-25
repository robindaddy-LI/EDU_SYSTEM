import { Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';
import { createAuditLog, diffFields } from '../utils/auditLog';

export const TeacherController = {
    // Get all teachers with optional filtering
    async getAllTeachers(req: AuthRequest, res: Response) {
        try {
            const { status, search, academicYear } = req.query;

            const where: Record<string, unknown> = {};
            if (status) where.status = status as string;
            if (search) {
                where.fullName = { contains: search as string, mode: 'insensitive' };
            }

            // Calculate current academic year (Taiwan school year: Sep 1 - Aug 31)
            let currentYear: string;
            if (academicYear) {
                currentYear = academicYear as string;
            } else {
                const now = new Date();
                const year = now.getFullYear();
                const month = now.getMonth(); // 0-indexed (0 = Jan, 8 = Sep)
                // If before September, use previous year as academic year
                currentYear = (month < 8 ? year - 1 : year).toString();
            }

            const teachers = await prisma.teacher.findMany({
                where,
                include: {
                    classAssignments: {
                        where: { academicYear: currentYear },
                        include: {
                            class: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        },
                        orderBy: { isLead: 'desc' }
                    }
                },
                orderBy: { fullName: 'asc' }
            });
            res.json(teachers);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch teachers' });
        }
    },

    // Get single teacher by ID with class assignments
    async getTeacherById(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const teacher = await prisma.teacher.findUnique({
                where: { id: Number(id) },
                include: {
                    classAssignments: {
                        include: { class: true },
                        orderBy: { academicYear: 'desc' }
                    },
                    attendanceRecords: {
                        include: { session: true },
                        orderBy: { session: { date: 'desc' } },
                        take: 50
                    }
                }
            });

            if (!teacher) {
                return res.status(404).json({ error: 'Teacher not found' });
            }

            res.json(teacher);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch teacher' });
        }
    },

    // Create a new teacher
    async createTeacher(req: AuthRequest, res: Response) {
        try {
            const { fullName, teacherType, status, phone, email, notes } = req.body;
            const operatorId = req.user?.id ?? null;

            const newTeacher = await prisma.teacher.create({
                data: {
                    fullName,
                    teacherType,
                    status: status || 'active',
                    phone,
                    email,
                    notes
                }
            });

            await createAuditLog({
                type: '教師新增',
                description: `新增教師「${newTeacher.fullName}」`,
                userId: operatorId,
                metadata: {
                    teacherId: newTeacher.id,
                    fullName: newTeacher.fullName,
                    teacherType: newTeacher.teacherType,
                    status: newTeacher.status
                }
            });

            res.status(201).json(newTeacher);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to create teacher', details: String(error) });
        }
    },

    // Update teacher
    async updateTeacher(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const { fullName, teacherType, status, phone, email, notes } = req.body;
            const operatorId = req.user?.id ?? null;

            // Capture before state
            const before = await prisma.teacher.findUnique({ where: { id: Number(id) } });
            if (!before) {
                return res.status(404).json({ error: 'Teacher not found' });
            }

            const updated = await prisma.teacher.update({
                where: { id: Number(id) },
                data: { fullName, teacherType, status, phone, email, notes }
            });

            const diff = diffFields(
                before as unknown as Record<string, unknown>,
                updated as unknown as Record<string, unknown>,
                ['fullName', 'teacherType', 'status', 'phone', 'email', 'notes']
            );

            await createAuditLog({
                type: '教師修改',
                description: `修改教師「${updated.fullName}」資料`,
                userId: operatorId,
                metadata: {
                    teacherId: updated.id,
                    diff
                }
            });

            res.json(updated);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to update teacher' });
        }
    },

    // Delete teacher (soft delete)
    async deleteTeacher(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const operatorId = req.user?.id ?? null;

            const updated = await prisma.teacher.update({
                where: { id: Number(id) },
                data: { status: 'inactive' }
            });

            await createAuditLog({
                type: '教師停用',
                description: `停用教師「${updated.fullName}」`,
                userId: operatorId,
                metadata: {
                    teacherId: updated.id,
                    fullName: updated.fullName
                }
            });

            res.json({ success: true, message: 'Teacher deactivated', teacher: updated });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to delete teacher' });
        }
    },

    // Assign teacher to class
    async assignToClass(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const { classId, academicYear, isLead } = req.body;
            const operatorId = req.user?.id ?? null;

            const assignment = await prisma.teacherClassAssignment.create({
                data: {
                    teacherId: Number(id),
                    classId: Number(classId),
                    academicYear,
                    isLead: isLead || false
                }
            });

            await createAuditLog({
                type: '教師班級指派',
                description: `指派教師 #${id} 至班級 #${classId}（${academicYear}學年）`,
                userId: operatorId,
                metadata: {
                    assignmentId: assignment.id,
                    teacherId: Number(id),
                    classId: Number(classId),
                    academicYear,
                    isLead: assignment.isLead
                }
            });

            res.status(201).json(assignment);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to assign teacher to class' });
        }
    }
};
