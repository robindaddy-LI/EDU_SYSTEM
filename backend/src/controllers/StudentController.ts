import { Request, Response } from 'express';
import prisma from '../prisma';

export const StudentController = {
    // Get all students with optional filtering
    async getAllStudents(req: Request, res: Response) {
        try {
            const { classId, status, search } = req.query;

            const where: any = {};
            if (classId) where.classId = Number(classId);
            if (status) where.status = status as string;
            if (search) {
                where.fullName = { contains: search as string, mode: 'insensitive' };
            }

            const students = await prisma.student.findMany({
                where,
                orderBy: { fullName: 'asc' },
                include: { class: true }
            });
            res.json(students);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch students' });
        }
    },

    // Get single student by ID
    async getStudentById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const student = await prisma.student.findUnique({
                where: { id: Number(id) },
                include: {
                    class: true,
                    attendanceRecords: {
                        include: { session: true },
                        orderBy: { session: { date: 'desc' } },
                        take: 50
                    }
                }
            });

            if (!student) {
                return res.status(404).json({ error: 'Student not found' });
            }

            res.json(student);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch student' });
        }
    },

    // Create a new student
    async createStudent(req: Request, res: Response) {
        try {
            const {
                fullName, studentType, classId, status,
                dob, address, contactName, contactPhone,
                isBaptized, baptismDate, isSpiritBaptized, spiritBaptismDate, notes
            } = req.body;

            const newStudent = await prisma.student.create({
                data: {
                    fullName,
                    studentType,
                    classId: Number(classId),
                    status: status || 'active',
                    dob: dob ? new Date(dob) : null,
                    address,
                    contactName,
                    contactPhone,
                    isBaptized: isBaptized || false,
                    baptismDate: baptismDate ? new Date(baptismDate) : null,
                    isSpiritBaptized: isSpiritBaptized || false,
                    spiritBaptismDate: spiritBaptismDate ? new Date(spiritBaptismDate) : null,
                    notes
                }
            });

            res.status(201).json(newStudent);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to create student' });
        }
    },

    // Update student
    async updateStudent(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const {
                fullName, studentType, classId, status,
                dob, address, contactName, contactPhone,
                isBaptized, baptismDate, isSpiritBaptized, spiritBaptismDate,
                notes, enrollmentHistory, historicalAttendance
            } = req.body;

            const updated = await prisma.student.update({
                where: { id: Number(id) },
                data: {
                    fullName,
                    studentType,
                    classId: classId ? Number(classId) : undefined,
                    status,
                    dob: dob ? new Date(dob) : undefined,
                    address,
                    contactName,
                    contactPhone,
                    isBaptized,
                    baptismDate: baptismDate ? new Date(baptismDate) : undefined,
                    isSpiritBaptized,
                    spiritBaptismDate: spiritBaptismDate ? new Date(spiritBaptismDate) : undefined,
                    notes,
                    enrollmentHistory,
                    historicalAttendance
                }
            });

            res.json(updated);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to update student' });
        }
    },

    // Delete student (soft delete by setting status to inactive)
    async deleteStudent(req: Request, res: Response) {
        try {
            const { id } = req.params;

            const updated = await prisma.student.update({
                where: { id: Number(id) },
                data: { status: 'inactive' }
            });

            res.json({ success: true, message: 'Student deactivated', student: updated });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to delete student' });
        }
    }
};
