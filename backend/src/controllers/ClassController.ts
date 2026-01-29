import { Request, Response } from 'express';
import prisma from '../prisma';

export const ClassController = {
    // Get all classes
    async getAllClasses(req: Request, res: Response) {
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
    async getClassById(req: Request, res: Response) {
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
    async createClass(req: Request, res: Response) {
        try {
            const { name } = req.body;

            const newClass = await prisma.class.create({
                data: { name }
            });

            res.status(201).json(newClass);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to create class' });
        }
    },

    // Update class
    async updateClass(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { name } = req.body;

            const updated = await prisma.class.update({
                where: { id: Number(id) },
                data: { name }
            });

            res.json(updated);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to update class' });
        }
    },

    // Delete class (hard delete - be careful!)
    async deleteClass(req: Request, res: Response) {
        try {
            const { id } = req.params;

            // Check if class has students
            const studentCount = await prisma.student.count({
                where: { classId: Number(id) }
            });

            if (studentCount > 0) {
                return res.status(400).json({
                    error: 'Cannot delete class with active students. Please reassign or remove students first.'
                });
            }

            await prisma.class.delete({
                where: { id: Number(id) }
            });

            res.json({ success: true, message: 'Class deleted' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to delete class' });
        }
    }
};
