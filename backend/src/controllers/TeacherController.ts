import { Request, Response } from 'express';
import prisma from '../prisma';

export const TeacherController = {
    // Get all teachers with optional filtering
    async getAllTeachers(req: Request, res: Response) {
        try {
            const { status, search } = req.query;

            const where: any = {};
            if (status) where.status = status as string;
            if (search) {
                where.fullName = { contains: search as string, mode: 'insensitive' };
            }

            const teachers = await prisma.teacher.findMany({
                where,
                orderBy: { fullName: 'asc' }
            });
            res.json(teachers);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch teachers' });
        }
    },

    // Get single teacher by ID with class assignments
    async getTeacherById(req: Request, res: Response) {
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
    async createTeacher(req: Request, res: Response) {
        try {
            const { fullName, teacherType, status, phone, email, notes } = req.body;

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

            res.status(201).json(newTeacher);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to create teacher' });
        }
    },

    // Update teacher
    async updateTeacher(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { fullName, teacherType, status, phone, email, notes } = req.body;

            const updated = await prisma.teacher.update({
                where: { id: Number(id) },
                data: { fullName, teacherType, status, phone, email, notes }
            });

            res.json(updated);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to update teacher' });
        }
    },

    // Delete teacher (soft delete)
    async deleteTeacher(req: Request, res: Response) {
        try {
            const { id } = req.params;

            const updated = await prisma.teacher.update({
                where: { id: Number(id) },
                data: { status: 'inactive' }
            });

            res.json({ success: true, message: 'Teacher deactivated', teacher: updated });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to delete teacher' });
        }
    },

    // Assign teacher to class
    async assignToClass(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { classId, academicYear, isLead } = req.body;

            const assignment = await prisma.teacherClassAssignment.create({
                data: {
                    teacherId: Number(id),
                    classId: Number(classId),
                    academicYear,
                    isLead: isLead || false
                }
            });

            res.status(201).json(assignment);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to assign teacher to class' });
        }
    }
};
