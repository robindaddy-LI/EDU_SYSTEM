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
    },

    // Find duplicates based on name and DOB
    async findDuplicates(req: Request, res: Response) {
        try {
            // Find students with same name and DOB
            const duplicates = await prisma.student.groupBy({
                by: ['fullName', 'dob'],
                _count: {
                    id: true
                },
                having: {
                    id: {
                        _count: {
                            gt: 1
                        }
                    }
                },
                where: {
                    status: { not: 'inactive' }
                }
            });

            // Fetch details for these duplicates
            const result = [];
            for (const group of duplicates) {
                if (!group.dob) continue;

                const students = await prisma.student.findMany({
                    where: {
                        fullName: group.fullName,
                        dob: group.dob
                    },
                    include: {
                        _count: {
                            select: {
                                attendanceRecords: true
                                // enrollmentHistory is JSON, cannot count relation
                            }
                        },
                        class: true
                    },
                    orderBy: {
                        createdAt: 'asc' // Oldest first
                    }
                });
                result.push(students);
            }

            res.json(result);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to find duplicates' });
        }
    },

    // Resolve duplicates (Merge or Delete)
    async resolveDuplicates(req: Request, res: Response) {
        try {
            const { action, keepId, mergeIds, deleteIds } = req.body;
            // action: 'merge' | 'delete'

            if (action === 'merge') {
                if (!keepId || !mergeIds || !Array.isArray(mergeIds) || mergeIds.length === 0) {
                    return res.status(400).json({ error: 'Invalid merge parameters' });
                }

                const targetId = Number(keepId);
                const sourceIds = mergeIds.map((id: any) => Number(id));

                await prisma.$transaction(async (tx) => {
                    // 1. Merge Enrollment History & Historical Attendance (JSON fields)
                    const targetStudent = await tx.student.findUnique({ where: { id: targetId } });
                    const sourceStudents = await tx.student.findMany({ where: { id: { in: sourceIds } } });

                    if (!targetStudent) throw new Error('Target student not found');

                    let mergedEnrollment = (targetStudent.enrollmentHistory as any[]) || [];
                    let mergedHistorical = (targetStudent.historicalAttendance as any[]) || [];

                    for (const source of sourceStudents) {
                        if (source.enrollmentHistory && Array.isArray(source.enrollmentHistory)) {
                            // Append source history
                            mergedEnrollment = [...mergedEnrollment, ...(source.enrollmentHistory as any[])];
                        }
                        if (source.historicalAttendance && Array.isArray(source.historicalAttendance)) {
                            // Append source history
                            mergedHistorical = [...mergedHistorical, ...(source.historicalAttendance as any[])];
                        }
                    }

                    // Update target student with merged JSON
                    await tx.student.update({
                        where: { id: targetId },
                        data: {
                            enrollmentHistory: mergedEnrollment as any,
                            historicalAttendance: mergedHistorical as any
                        }
                    });

                    // 2. Move Attendance Records (Relational)
                    const targetAttendance = await tx.studentAttendance.findMany({
                        where: { studentId: targetId },
                        select: { sessionId: true }
                    });
                    const targetSessionIds = new Set(targetAttendance.map(a => a.sessionId));

                    const sourceAttendance = await tx.studentAttendance.findMany({
                        where: { studentId: { in: sourceIds } }
                    });

                    for (const record of sourceAttendance) {
                        if (targetSessionIds.has(record.sessionId)) {
                            // Conflict: Delete source record
                            await tx.studentAttendance.delete({
                                where: { id: record.id }
                            });
                        } else {
                            // No conflict: Move record
                            await tx.studentAttendance.update({
                                where: { id: record.id },
                                data: { studentId: targetId }
                            });
                            targetSessionIds.add(record.sessionId);
                        }
                    }

                    // 3. Delete source students (Hard delete)
                    await tx.student.deleteMany({
                        where: { id: { in: sourceIds } }
                    });
                });

                res.json({ success: true, message: `Successfully merged ${sourceIds.length} students into ID ${targetId}` });

            } else if (action === 'delete') {
                if (!deleteIds || !Array.isArray(deleteIds) || deleteIds.length === 0) {
                    return res.status(400).json({ error: 'Invalid delete parameters' });
                }

                const idsToDelete = deleteIds.map((id: any) => Number(id));

                await prisma.$transaction(async (tx) => {
                    // Attendance is relational, must be deleted
                    await tx.studentAttendance.deleteMany({
                        where: { studentId: { in: idsToDelete } }
                    });

                    // EnrollmentHistory is part of Student JSON, so just deleting Student is enough.
                    await tx.student.deleteMany({
                        where: { id: { in: idsToDelete } }
                    });
                });

                res.json({ success: true, message: `Successfully deleted ${idsToDelete.length} duplicate students` });
            } else {
                res.status(400).json({ error: 'Invalid action' });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to resolve duplicates' });
        }
    }
    ,
    // Batch Import with Smart Merge
    async batchImport(req: Request, res: Response) {
        try {
            const { students } = req.body; // Expects array of students
            if (!Array.isArray(students)) {
                return res.status(400).json({ error: 'Invalid input: expected array of students' });
            }

            let createdCount = 0;
            let mergedCount = 0;
            let errorCount = 0;

            // Process sequentially to handle duplicates within the import file itself if necessary, 
            // but usually we trust one file doesn't duplicate itself (or we let it merge).
            // sequential await is safer for logic than Promise.all with transaction race conditions.

            for (const s of students) {
                try {
                    // Check for existing student (Name + DOB)
                    const existing = await prisma.student.findFirst({
                        where: {
                            fullName: s.fullName,
                            dob: s.dob ? new Date(s.dob) : null
                        }
                    });

                    if (existing) {
                        // MERGE LOGIC
                        let mergedEnrollment = (existing.enrollmentHistory as any[]) || [];
                        let mergedHistorical = (existing.historicalAttendance as any[]) || [];

                        // Helper to checking existence
                        const enrollmentExists = (e: any) => mergedEnrollment.some((m: any) =>
                            m.enrollmentDate === e.enrollmentDate && m.className === e.className
                        );
                        const historyExists = (h: any) => mergedHistorical.some((m: any) =>
                            m.rowLabel === h.rowLabel && m.className === h.className
                        );

                        // Merge Enrollment
                        if (s.enrollmentHistory && Array.isArray(s.enrollmentHistory)) {
                            s.enrollmentHistory.forEach((newItem: any) => {
                                if (!enrollmentExists(newItem)) {
                                    mergedEnrollment.push(newItem);
                                }
                            });
                        }

                        // Merge Historical Attendance
                        if (s.historicalAttendance && Array.isArray(s.historicalAttendance)) {
                            s.historicalAttendance.forEach((newItem: any) => {
                                if (!historyExists(newItem)) {
                                    mergedHistorical.push(newItem);
                                }
                            });
                        }

                        // Update Student
                        await prisma.student.update({
                            where: { id: existing.id },
                            data: {
                                enrollmentHistory: mergedEnrollment as any,
                                historicalAttendance: mergedHistorical as any,
                                // Update other scalar fields if they are currently null/empty in DB?
                                // Let's keep existing scalars to avoid overwriting good data.
                                // But if 'dob' was null (unlikely since we matched on it) or address/phone...
                                address: existing.address || s.address,
                                contactName: existing.contactName || s.contactName,
                                contactPhone: existing.contactPhone || s.contactPhone,
                                isBaptized: existing.isBaptized || s.isBaptized,
                                baptismDate: existing.baptismDate || (s.baptismDate ? new Date(s.baptismDate) : null),
                                isSpiritBaptized: existing.isSpiritBaptized || s.isSpiritBaptized,
                                spiritBaptismDate: existing.spiritBaptismDate || (s.spiritBaptismDate ? new Date(s.spiritBaptismDate) : null),
                            }
                        });
                        mergedCount++;
                    } else {
                        // CREATE
                        await prisma.student.create({
                            data: {
                                fullName: s.fullName,
                                studentType: s.studentType || 'member',
                                classId: Number(s.classId) || 0,
                                status: s.status || 'active',
                                dob: s.dob ? new Date(s.dob) : null,
                                address: s.address,
                                contactName: s.contactName,
                                contactPhone: s.contactPhone,
                                isBaptized: s.isBaptized || false,
                                baptismDate: s.baptismDate ? new Date(s.baptismDate) : null,
                                isSpiritBaptized: s.isSpiritBaptized || false,
                                spiritBaptismDate: s.spiritBaptismDate ? new Date(s.spiritBaptismDate) : null,
                                notes: s.notes,
                                enrollmentHistory: s.enrollmentHistory as any,
                                historicalAttendance: s.historicalAttendance as any
                            }
                        });
                        createdCount++;
                    }
                } catch (err) {
                    console.error('Error importing student:', s.fullName, err);
                    errorCount++;
                }
            }

            res.json({
                success: true,
                created: createdCount,
                merged: mergedCount,
                errors: errorCount
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to batch import students' });
        }
    }
};

export default StudentController;
