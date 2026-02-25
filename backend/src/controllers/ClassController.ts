import { Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';
import { createAuditLog, diffFields } from '../utils/auditLog';

export const ClassController = {
    // Get all classes
    async getAllClasses(req: AuthRequest, res: Response) {
        try {
            const classes = await prisma.class.findMany({
                orderBy: { name: 'asc' },
                include: {
                    _count: {
                        select: { students: true, classSessions: true }
                    }
                }
            });
            res.json(classes);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch classes' });
        }
    },

    // Get single class by ID with students and teachers
    async getClassById(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const { academicYear } = req.query;

            const classData = await prisma.class.findUnique({
                where: { id: Number(id) },
                include: {
                    students: {
                        where: { status: 'active' },
                        orderBy: { fullName: 'asc' }
                    },
                    teacherClassAssignments: {
                        where: academicYear ? { academicYear: academicYear as string } : undefined,
                        include: { teacher: true },
                        orderBy: { isLead: 'desc' }
                    }
                }
            });

            if (!classData) {
                return res.status(404).json({ error: 'Class not found' });
            }

            res.json(classData);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch class' });
        }
    },

    // Create a new class
    async createClass(req: AuthRequest, res: Response) {
        try {
            const { name } = req.body;
            const operatorId = req.user?.id ?? null;

            const newClass = await prisma.class.create({
                data: { name }
            });

            await createAuditLog({
                type: '班級新增',
                description: `新增班級「${newClass.name}」`,
                userId: operatorId,
                metadata: {
                    classId: newClass.id,
                    name: newClass.name
                }
            });

            res.status(201).json(newClass);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to create class' });
        }
    },

    // Update class
    async updateClass(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const { name } = req.body;
            const operatorId = req.user?.id ?? null;

            // Capture before state
            const before = await prisma.class.findUnique({ where: { id: Number(id) } });
            if (!before) {
                return res.status(404).json({ error: 'Class not found' });
            }

            const updated = await prisma.class.update({
                where: { id: Number(id) },
                data: { name }
            });

            const diff = diffFields(
                before as unknown as Record<string, unknown>,
                updated as unknown as Record<string, unknown>,
                ['name']
            );

            await createAuditLog({
                type: '班級修改',
                description: `修改班級「${before.name}」→「${updated.name}」`,
                userId: operatorId,
                metadata: {
                    classId: updated.id,
                    diff
                }
            });

            res.json(updated);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to update class' });
        }
    },

    // Delete class (hard delete - be careful!)
    async deleteClass(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const operatorId = req.user?.id ?? null;

            // Check if class has students
            const studentCount = await prisma.student.count({
                where: { classId: Number(id) }
            });

            if (studentCount > 0) {
                return res.status(400).json({
                    error: 'Cannot delete class with active students. Please reassign or remove students first.'
                });
            }

            // Capture name before deletion for audit log
            const toDelete = await prisma.class.findUnique({ where: { id: Number(id) } });

            await prisma.class.delete({
                where: { id: Number(id) }
            });

            await createAuditLog({
                type: '班級刪除',
                description: `刪除班級「${toDelete?.name ?? id}」`,
                userId: operatorId,
                metadata: {
                    classId: Number(id),
                    name: toDelete?.name
                }
            });

            res.json({ success: true, message: 'Class deleted' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to delete class' });
        }
    }
};
