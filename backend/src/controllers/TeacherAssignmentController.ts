import { Request, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../utils/auditLog';

interface AssignmentInput {
    teacherId: number | string;
    classId: number | string;
    isLead?: boolean;
}

export const TeacherAssignmentController = {
    // Get all teacher assignments, optionally filtered by academic year
    async getAll(req: Request, res: Response) {
        try {
            const { academicYear, classId } = req.query;
            const where: Record<string, unknown> = {};
            if (academicYear) where.academicYear = academicYear as string;
            if (classId) where.classId = Number(classId);

            const assignments = await prisma.teacherClassAssignment.findMany({
                where,
                include: {
                    teacher: { select: { id: true, fullName: true, teacherType: true, status: true } },
                    class: { select: { id: true, name: true } }
                },
                orderBy: [{ academicYear: 'desc' }, { classId: 'asc' }, { isLead: 'desc' }]
            });

            res.json(assignments);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch teacher assignments' });
        }
    },

    // Get single assignment by ID
    async getById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const assignment = await prisma.teacherClassAssignment.findUnique({
                where: { id: Number(id) },
                include: { teacher: true, class: true }
            });
            if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
            res.json(assignment);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch assignment' });
        }
    },

    // Create a new assignment
    async create(req: AuthRequest, res: Response) {
        try {
            const { academicYear, teacherId, classId, isLead } = req.body;
            const operatorId = req.user?.id ?? null;

            if (!academicYear || !teacherId || !classId) {
                return res.status(400).json({ error: 'Missing required fields: academicYear, teacherId, classId' });
            }

            const newAssignment = await prisma.teacherClassAssignment.create({
                data: { academicYear, teacherId: Number(teacherId), classId: Number(classId), isLead: isLead || false },
                include: { teacher: true, class: true }
            });

            await createAuditLog({
                type: '教師指派新增',
                description: `新增教師 #${teacherId} 指派至班級 #${classId}（${academicYear}學年）`,
                userId: operatorId,
                metadata: { assignmentId: newAssignment.id, teacherId: Number(teacherId), classId: Number(classId), academicYear, isLead }
            });

            res.status(201).json(newAssignment);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to create assignment' });
        }
    },

    // Batch create/update assignments for an academic year
    async batchUpsert(req: AuthRequest, res: Response) {
        try {
            const { academicYear, assignments } = req.body;
            const operatorId = req.user?.id ?? null;

            if (!academicYear || !Array.isArray(assignments)) {
                return res.status(400).json({ error: 'Missing required fields: academicYear, assignments (array)' });
            }

            await prisma.teacherClassAssignment.deleteMany({ where: { academicYear } });

            // Reset sequence to prevent P2002 errors from seed data
            try {
                await prisma.$executeRawUnsafe(`
                    SELECT setval(
                        pg_get_serial_sequence('teacher_class_assignments', 'id'),
                        COALESCE((SELECT MAX(id) + 1 FROM teacher_class_assignments), 1),
                        false
                    );
                `);
            } catch (seqError) {
                console.warn('Failed to reset sequence, ignoring:', seqError);
            }

            const created = await prisma.teacherClassAssignment.createMany({
                data: (assignments as AssignmentInput[]).map(a => ({
                    academicYear,
                    teacherId: Number(a.teacherId),
                    classId: Number(a.classId),
                    isLead: a.isLead || false
                }))
            });

            await createAuditLog({
                type: '教師指派批次更新',
                description: `批次更新 ${academicYear} 學年教師指派，共 ${created.count} 筆`,
                userId: operatorId,
                metadata: { academicYear, count: created.count }
            });

            res.json({ success: true, count: created.count, message: `Successfully saved ${created.count} assignments for ${academicYear}` });
        } catch (error) {
            const err = error as { message: string; code?: string; meta?: unknown };
            console.error(error);
            res.status(500).json({ error: 'Failed to batch upsert assignments', details: err.message, code: err.code, meta: err.meta });
        }
    },

    // Update an assignment
    async update(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const operatorId = req.user?.id ?? null;
            const { teacherId, classId, academicYear, isLead } = req.body as Partial<AssignmentInput & { academicYear: string; isLead: boolean }>;

            const updatedAssignment = await prisma.teacherClassAssignment.update({
                where: { id: Number(id) },
                data: {
                    ...(academicYear !== undefined && { academicYear }),
                    ...(teacherId !== undefined && { teacherId: Number(teacherId) }),
                    ...(classId !== undefined && { classId: Number(classId) }),
                    ...(isLead !== undefined && { isLead }),
                },
                include: { teacher: true, class: true }
            });

            await createAuditLog({
                type: '教師指派修改',
                description: `修改教師指派 #${id}`,
                userId: operatorId,
                metadata: { assignmentId: Number(id) }
            });

            res.json(updatedAssignment);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to update assignment' });
        }
    },

    // Delete an assignment
    async delete(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const operatorId = req.user?.id ?? null;

            await prisma.teacherClassAssignment.delete({ where: { id: Number(id) } });

            await createAuditLog({
                type: '教師指派刪除',
                description: `刪除教師指派 #${id}`,
                userId: operatorId,
                metadata: { assignmentId: Number(id) }
            });

            res.json({ success: true, message: 'Assignment deleted successfully' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to delete assignment' });
        }
    }
};

export default TeacherAssignmentController;
