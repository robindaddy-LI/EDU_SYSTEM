import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { StudentController } from '../StudentController';
import prisma from '../../prisma';
import { AuthRequest } from '../../middleware/auth';

// Mock prisma client
vi.mock('../../prisma', () => {
    return {
        default: {
            student: {
                findUnique: vi.fn(),
                update: vi.fn(),
            },
            operationLog: {
                create: vi.fn(),
            }
        }
    };
});

describe('StudentController - updateStudent', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should verify that modifying student data triggers createAuditLog and creates a record in operation_logs', async () => {
        // Arrange
        const mockReq = {
            params: { id: '1' },
            body: {
                fullName: 'New Name',
                notes: 'Updated notes'
            },
            user: { id: 99 } // Mock AuthRequest operator
        } as unknown as AuthRequest;

        const mockRes = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        } as unknown as Response;

        const existingStudent = {
            id: 1,
            fullName: 'Old Name',
            studentType: 'member',
            classId: 2,
            status: 'active',
            notes: 'Old notes'
        };

        const updatedStudent = {
            ...existingStudent,
            fullName: 'New Name',
            notes: 'Updated notes'
        };

        (prisma.student.findUnique as any).mockResolvedValue(existingStudent);
        (prisma.student.update as any).mockResolvedValue(updatedStudent);
        (prisma.operationLog.create as any).mockResolvedValue({ id: 100 });

        // Act
        await StudentController.updateStudent(mockReq, mockRes);

        // wait for fire-and-forget async audit log to be called
        await new Promise(resolve => setTimeout(resolve, 50));

        // Assert
        expect(prisma.student.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
        expect(prisma.student.update).toHaveBeenCalled();
        expect(mockRes.json).toHaveBeenCalledWith(updatedStudent);

        // Verify audit log creation
        expect(prisma.operationLog.create).toHaveBeenCalledTimes(1);
        expect(prisma.operationLog.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    type: '學生修改',
                    description: expect.stringContaining('修改學生「New Name」(ID: 1)'),
                    userId: 99,
                    metadata: expect.objectContaining({
                        studentId: 1,
                        changes: expect.objectContaining({
                            fullName: expect.objectContaining({
                                before: 'Old Name',
                                after: 'New Name'
                            }),
                            notes: expect.objectContaining({
                                before: 'Old notes',
                                after: 'Updated notes'
                            })
                        })
                    })
                })
            })
        );
    });
});
