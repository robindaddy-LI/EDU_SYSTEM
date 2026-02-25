import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';
import { createAuditLog, diffFields } from '../utils/auditLog';

export const StudentController = {
    // Get all students with optional filtering
    async getAllStudents(req: Request, res: Response) {
        try {
            const { classId, status, search } = req.query;

            const where: Record<string, unknown> = {};
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
    async createStudent(req: AuthRequest, res: Response) {
        try {
            const {
                fullName, studentType, classId, status,
                dob, address, contactName, contactPhone,
                isBaptized, baptismDate, isSpiritBaptized, spiritBaptismDate, notes
            } = req.body;
            const operatorId = req.user?.id ?? null;

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

            await createAuditLog({
                type: '學生新增',
                description: `新增學生「${newStudent.fullName}」(ID: ${newStudent.id})`,
                userId: operatorId,
                metadata: { studentId: newStudent.id, fullName: newStudent.fullName, classId: newStudent.classId }
            });

            res.status(201).json(newStudent);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to create student' });
        }
    },

    // Update student
    async updateStudent(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const studentId = Number(id);

            // 取得修改前的資料（用於 diff）
            const before = await prisma.student.findUnique({ where: { id: studentId } });
            if (!before) {
                return res.status(404).json({ error: 'Student not found' });
            }

            const {
                fullName, studentType, classId, status,
                dob, address, contactName, contactPhone,
                isBaptized, baptismDate, isSpiritBaptized, spiritBaptismDate,
                notes, enrollmentHistory, historicalAttendance
            } = req.body;

            const updated = await prisma.student.update({
                where: { id: studentId },
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

            // 審計記錄（fire-and-forget）
            const changes = diffFields(
                before as unknown as Record<string, unknown>,
                updated as unknown as Record<string, unknown>,
                ['fullName', 'studentType', 'classId', 'status', 'dob', 'address',
                    'contactName', 'contactPhone', 'isBaptized', 'baptismDate',
                    'isSpiritBaptized', 'spiritBaptismDate', 'notes']
            );
            if (Object.keys(changes).length > 0) {
                createAuditLog({
                    type: '學生修改',
                    description: `修改學生「${updated.fullName}」(ID: ${studentId})`,
                    userId: req.user?.id ?? null,
                    metadata: { studentId, changes },
                });
            }

            res.json(updated);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to update student' });
        }
    },

    // Delete student (soft delete by setting status to inactive)
    async deleteStudent(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const studentId = Number(id);

            const updated = await prisma.student.update({
                where: { id: studentId },
                data: { status: 'inactive' }
            });

            // 審計記錄（fire-and-forget）
            createAuditLog({
                type: '學生刪除',
                description: `停用學生「${updated.fullName}」(ID: ${studentId})`,
                userId: req.user?.id ?? null,
                metadata: { studentId, studentName: updated.fullName, action: 'soft_delete' },
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
    async resolveDuplicates(req: AuthRequest, res: Response) {
        try {
            const { action, keepId, mergeIds, deleteIds } = req.body;
            // action: 'merge' | 'delete'

            if (action === 'merge') {
                if (!keepId || !mergeIds || !Array.isArray(mergeIds) || mergeIds.length === 0) {
                    return res.status(400).json({ error: 'Invalid merge parameters' });
                }

                const targetId = Number(keepId);
                const sourceIds = (mergeIds as (number | string)[]).map(id => Number(id));

                await prisma.$transaction(async (tx) => {
                    // 1. Merge Enrollment History & Historical Attendance (JSON fields)
                    const targetStudent = await tx.student.findUnique({ where: { id: targetId } });
                    const sourceStudents = await tx.student.findMany({ where: { id: { in: sourceIds } } });

                    if (!targetStudent) throw new Error('Target student not found');

                    let mergedEnrollment = (targetStudent.enrollmentHistory as unknown[]) || [];
                    let mergedHistorical = (targetStudent.historicalAttendance as unknown[]) || [];

                    for (const source of sourceStudents) {
                        if (source.enrollmentHistory && Array.isArray(source.enrollmentHistory)) {
                            mergedEnrollment = [...mergedEnrollment, ...(source.enrollmentHistory as unknown[])];
                        }
                        if (source.historicalAttendance && Array.isArray(source.historicalAttendance)) {
                            mergedHistorical = [...mergedHistorical, ...(source.historicalAttendance as unknown[])];
                        }
                    }

                    // Update target student with merged JSON
                    await tx.student.update({
                        where: { id: targetId },
                        data: {
                            enrollmentHistory: mergedEnrollment as Prisma.InputJsonValue,
                            historicalAttendance: mergedHistorical as Prisma.InputJsonValue
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
                            await tx.studentAttendance.delete({
                                where: { id: record.id }
                            });
                        } else {
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

                // 審計記錄（fire-and-forget）
                createAuditLog({
                    type: '學生合併',
                    description: `合併 ${sourceIds.length} 筆學生至 ID ${targetId}`,
                    userId: req.user?.id ?? null,
                    metadata: { action: 'merge', keepId: targetId, mergedIds: sourceIds },
                });

                res.json({ success: true, message: `Successfully merged ${sourceIds.length} students into ID ${targetId}` });

            } else if (action === 'delete') {
                if (!deleteIds || !Array.isArray(deleteIds) || deleteIds.length === 0) {
                    return res.status(400).json({ error: 'Invalid delete parameters' });
                }

                const idsToDelete = (deleteIds as (number | string)[]).map(id => Number(id));

                await prisma.$transaction(async (tx) => {
                    await tx.studentAttendance.deleteMany({
                        where: { studentId: { in: idsToDelete } }
                    });

                    await tx.student.deleteMany({
                        where: { id: { in: idsToDelete } }
                    });
                });

                // 審計記錄（fire-and-forget）
                createAuditLog({
                    type: '學生刪除',
                    description: `刪除 ${idsToDelete.length} 筆重複學生`,
                    userId: req.user?.id ?? null,
                    metadata: { action: 'hard_delete', deletedIds: idsToDelete },
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
    async batchImport(req: AuthRequest, res: Response) {
        try {
            const { students } = req.body; // Expects array of students
            if (!Array.isArray(students)) {
                return res.status(400).json({ error: 'Invalid input: expected array of students' });
            }

            let createdCount = 0;
            let mergedCount = 0;
            let errorCount = 0;

            for (const s of students) {
                try {
                    const existing = await prisma.student.findFirst({
                        where: {
                            fullName: s.fullName,
                            dob: s.dob ? new Date(s.dob) : null
                        }
                    });

                    if (existing) {
                        // MERGE LOGIC
                        let mergedEnrollment = (existing.enrollmentHistory as unknown[]) || [];
                        let mergedHistorical = (existing.historicalAttendance as unknown[]) || [];

                        type EnrollItem = { enrollmentDate: string; classTitle: string };
                        type HistItem = { rowLabel: string; classTitle: string };
                        const enrollmentExists = (e: EnrollItem) => (mergedEnrollment as EnrollItem[]).some(m =>
                            m.enrollmentDate === e.enrollmentDate && m.classTitle === e.classTitle
                        );
                        const historyExists = (h: HistItem) => (mergedHistorical as HistItem[]).some(m =>
                            m.rowLabel === h.rowLabel && m.classTitle === h.classTitle
                        );

                        if (s.enrollmentHistory && Array.isArray(s.enrollmentHistory)) {
                            (s.enrollmentHistory as EnrollItem[]).forEach(newItem => {
                                if (!enrollmentExists(newItem)) {
                                    mergedEnrollment.push(newItem);
                                }
                            });
                        }

                        if (s.historicalAttendance && Array.isArray(s.historicalAttendance)) {
                            (s.historicalAttendance as HistItem[]).forEach(newItem => {
                                if (!historyExists(newItem)) {
                                    mergedHistorical.push(newItem);
                                }
                            });
                        }

                        await prisma.student.update({
                            where: { id: existing.id },
                            data: {
                                enrollmentHistory: mergedEnrollment as Prisma.InputJsonValue,
                                historicalAttendance: mergedHistorical as Prisma.InputJsonValue,
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
                                enrollmentHistory: s.enrollmentHistory as Prisma.InputJsonValue,
                                historicalAttendance: s.historicalAttendance as Prisma.InputJsonValue
                            }
                        });
                        createdCount++;
                    }
                } catch (err) {
                    console.error('Error importing student:', s.fullName, err);
                    errorCount++;
                }
            }

            // 審計記錄（fire-and-forget）
            createAuditLog({
                type: '學生匯入',
                description: `批次匯入學生：新增 ${createdCount}、合併 ${mergedCount}、失敗 ${errorCount}`,
                userId: req.user?.id ?? null,
                metadata: { totalRecords: students.length, created: createdCount, merged: mergedCount, errors: errorCount },
            });

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
