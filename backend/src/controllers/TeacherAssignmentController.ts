import { Request, Response } from 'express';
import prisma from '../prisma';

export const TeacherAssignmentController = {
    // Get all teacher assignments, optionally filtered by academic year
    async getAll(req: Request, res: Response) {
        try {
            const { academicYear } = req.query;
            const where: any = {};

            if (academicYear) {
                where.academicYear = academicYear as string;
            }

            const assignments = await prisma.teacherClassAssignment.findMany({
                where,
                include: {
                    teacher: {
                        select: {
                            id: true,
                            fullName: true,
                            teacherType: true,
                            status: true
                        }
                    },
                    class: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                },
                orderBy: [
                    { academicYear: 'desc' },
                    { classId: 'asc' },
                    { isLead: 'desc' }
                ]
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
                include: {
                    teacher: true,
                    class: true
                }
            });

            if (!assignment) {
                return res.status(404).json({ error: 'Assignment not found' });
            }

            res.json(assignment);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch assignment' });
        }
    },

    // Create a new assignment
    async create(req: Request, res: Response) {
        try {
            const { academicYear, teacherId, classId, isLead } = req.body;

            // Validate required fields
            if (!academicYear || !teacherId || !classId) {
                return res.status(400).json({
                    error: 'Missing required fields: academicYear, teacherId, classId'
                });
            }

            const newAssignment = await prisma.teacherClassAssignment.create({
                data: {
                    academicYear,
                    teacherId: Number(teacherId),
                    classId: Number(classId),
                    isLead: isLead || false
                },
                include: {
                    teacher: true,
                    class: true
                }
            });

            res.status(201).json(newAssignment);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to create assignment' });
        }
    },

    // Batch create/update assignments for an academic year
    async batchUpsert(req: Request, res: Response) {
        try {
            const { academicYear, assignments } = req.body;

            if (!academicYear || !Array.isArray(assignments)) {
                return res.status(400).json({
                    error: 'Missing required fields: academicYear, assignments (array)'
                });
            }

            // Delete existing assignments for this academic year
            await prisma.teacherClassAssignment.deleteMany({
                where: { academicYear }
            });

            // Create new assignments
            const created = await prisma.teacherClassAssignment.createMany({
                data: assignments.map((a: any) => ({
                    academicYear,
                    teacherId: Number(a.teacherId),
                    classId: Number(a.classId),
                    isLead: a.isLead || false
                }))
            });

            res.json({
                success: true,
                count: created.count,
                message: `Successfully saved ${created.count} assignments for ${academicYear}`
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to batch upsert assignments' });
        }
    },

    // Update an assignment
    async update(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const updateData = req.body;

            const updatedAssignment = await prisma.teacherClassAssignment.update({
                where: { id: Number(id) },
                data: updateData,
                include: {
                    teacher: true,
                    class: true
                }
            });

            res.json(updatedAssignment);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to update assignment' });
        }
    },

    // Delete an assignment
    async delete(req: Request, res: Response) {
        try {
            const { id } = req.params;

            await prisma.teacherClassAssignment.delete({
                where: { id: Number(id) }
            });

            res.json({ success: true, message: 'Assignment deleted successfully' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to delete assignment' });
        }
    }
};

export default TeacherAssignmentController;
