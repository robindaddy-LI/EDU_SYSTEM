import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';
import { createAuditLog } from '../utils/auditLog';

const SALT_ROUNDS = 10;


export const UserController = {
    // Get all users (admin only)
    async getAllUsers(req: Request, res: Response) {
        try {
            const { role, status, search } = req.query;

            const where: Record<string, unknown> = {};
            if (role) where.role = role as string;
            if (status) where.status = status as string;
            if (search) {
                where.OR = [
                    { fullName: { contains: search as string, mode: 'insensitive' } },
                    { username: { contains: search as string, mode: 'insensitive' } }
                ];
            }

            const users = await prisma.user.findMany({
                where,
                orderBy: { fullName: 'asc' },
                select: {
                    id: true, username: true, fullName: true,
                    role: true, classId: true, email: true,
                    status: true, createdAt: true, class: true
                }
            });
            res.json(users);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch users' });
        }
    },

    // Get single user by ID
    async getUserById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const user = await prisma.user.findUnique({
                where: { id: Number(id) },
                select: {
                    id: true, username: true, fullName: true,
                    role: true, classId: true, email: true,
                    status: true, createdAt: true, class: true
                }
            });
            if (!user) return res.status(404).json({ error: 'User not found' });
            res.json(user);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch user' });
        }
    },

    // Create a new user
    async createUser(req: AuthRequest, res: Response) {
        try {
            const { username, password, fullName, role, classId, email, status } = req.body;
            const operatorId = req.user?.id ?? null;

            const existing = await prisma.user.findUnique({ where: { username } });
            if (existing) return res.status(400).json({ error: 'Username already exists' });

            const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

            const newUser = await prisma.user.create({
                data: { username, passwordHash, fullName, role, classId: classId ? Number(classId) : null, email, status: status || 'active' },
                select: { id: true, username: true, fullName: true, role: true, classId: true, email: true, status: true }
            });

            await createAuditLog({
                type: '使用者新增',
                description: `新增使用者「${newUser.fullName}」(${newUser.username})`,
                userId: operatorId,
                metadata: { userId: newUser.id, username: newUser.username, role: newUser.role }
            });

            res.status(201).json(newUser);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to create user' });
        }
    },

    // Update user
    async updateUser(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const { username, password, fullName, role, classId, email, status } = req.body;
            const operatorId = req.user?.id ?? null;

            // Build update payload using spread to stay compatible with Prisma generated types
            let passwordHash: string | undefined;
            if (password) {
                passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
            }

            if (username) {
                const existing = await prisma.user.findFirst({ where: { username, NOT: { id: Number(id) } } });
                if (existing) return res.status(400).json({ error: 'Username already exists' });
            }

            const updated = await prisma.user.update({
                where: { id: Number(id) },
                data: {
                    ...(fullName !== undefined && { fullName }),
                    ...(role !== undefined && { role }),
                    ...(classId !== undefined && { classId: classId ? Number(classId) : null }),
                    ...(email !== undefined && { email }),
                    ...(status !== undefined && { status }),
                    ...(username !== undefined && { username }),
                    ...(passwordHash !== undefined && { passwordHash }),
                },
                select: { id: true, username: true, fullName: true, role: true, classId: true, email: true, status: true }
            });

            await createAuditLog({
                type: '使用者修改',
                description: `修改使用者「${updated.fullName}」(${updated.username})`,
                userId: operatorId,
                metadata: { userId: updated.id, passwordChanged: !!password }
            });

            res.json(updated);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to update user' });
        }
    },

    // Delete user (soft delete)
    async deleteUser(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const operatorId = req.user?.id ?? null;

            const updated = await prisma.user.update({
                where: { id: Number(id) },
                data: { status: 'inactive' },
                select: { id: true, fullName: true, username: true }
            });

            await createAuditLog({
                type: '使用者停用',
                description: `停用使用者「${updated.fullName}」(${updated.username})`,
                userId: operatorId,
                metadata: { userId: updated.id }
            });

            res.json({ success: true, message: 'User deactivated' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to delete user' });
        }
    },

    // Login — public endpoint, no AuthRequest needed
    async login(req: Request, res: Response) {
        try {
            const { username, password } = req.body;

            const user = await prisma.user.findUnique({ where: { username }, include: { class: true } });
            if (!user) return res.status(401).json({ error: 'Invalid credentials' });

            const isMatch = await bcrypt.compare(password, user.passwordHash);
            if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

            if (user.status !== 'active') return res.status(403).json({ error: 'Account is inactive' });

            const token = jwt.sign(
                { id: user.id, username: user.username, role: user.role, classId: user.classId },
                process.env.JWT_SECRET as string,
                { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'] }
            );

            res.json({
                token,
                user: { id: user.id, username: user.username, fullName: user.fullName, role: user.role, classId: user.classId, class: user.class }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Login failed' });
        }
    }
};
