import { Request, Response } from 'express';
import prisma from '../prisma';

// Note: This is a simplified version without proper password hashing.
// In production, use bcrypt for password hashing and JWT for authentication.

export const UserController = {
    // Get all users (admin only)
    async getAllUsers(req: Request, res: Response) {
        try {
            const { role, status, search } = req.query;

            const where: any = {};
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
                    id: true,
                    username: true,
                    fullName: true,
                    role: true,
                    classId: true,
                    email: true,
                    status: true,
                    createdAt: true,
                    class: true
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
                    id: true,
                    username: true,
                    fullName: true,
                    role: true,
                    classId: true,
                    email: true,
                    status: true,
                    createdAt: true,
                    class: true
                }
            });

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            res.json(user);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch user' });
        }
    },

    // Create a new user
    async createUser(req: Request, res: Response) {
        try {
            const { username, password, fullName, role, classId, email, status } = req.body;

            // Check if username already exists
            const existing = await prisma.user.findUnique({ where: { username } });
            if (existing) {
                return res.status(400).json({ error: 'Username already exists' });
            }

            // In production, hash the password with bcrypt
            const passwordHash = password; // TODO: Use bcrypt.hash(password, 10)

            const newUser = await prisma.user.create({
                data: {
                    username,
                    passwordHash,
                    fullName,
                    role,
                    classId: classId ? Number(classId) : null,
                    email,
                    status: status || 'active'
                },
                select: {
                    id: true,
                    username: true,
                    fullName: true,
                    role: true,
                    classId: true,
                    email: true,
                    status: true
                }
            });

            res.status(201).json(newUser);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to create user' });
        }
    },

    // Update user
    async updateUser(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { username, password, fullName, role, classId, email, status } = req.body;

            const updateData: any = {
                fullName,
                role,
                classId: classId !== undefined ? (classId ? Number(classId) : null) : undefined,
                email,
                status
            };

            // Only update password if provided
            if (password) {
                updateData.passwordHash = password; // TODO: Use bcrypt.hash(password, 10)
            }

            // Only update username if provided and different
            if (username) {
                const existing = await prisma.user.findFirst({
                    where: { username, NOT: { id: Number(id) } }
                });
                if (existing) {
                    return res.status(400).json({ error: 'Username already exists' });
                }
                updateData.username = username;
            }

            const updated = await prisma.user.update({
                where: { id: Number(id) },
                data: updateData,
                select: {
                    id: true,
                    username: true,
                    fullName: true,
                    role: true,
                    classId: true,
                    email: true,
                    status: true
                }
            });

            res.json(updated);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to update user' });
        }
    },

    // Delete user (soft delete)
    async deleteUser(req: Request, res: Response) {
        try {
            const { id } = req.params;

            const updated = await prisma.user.update({
                where: { id: Number(id) },
                data: { status: 'inactive' }
            });

            res.json({ success: true, message: 'User deactivated' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to delete user' });
        }
    },

    // Simple login (for demo purposes - use JWT in production)
    async login(req: Request, res: Response) {
        try {
            const { username, password } = req.body;

            const user = await prisma.user.findUnique({
                where: { username },
                include: { class: true }
            });

            if (!user) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // In production, compare with bcrypt.compare(password, user.passwordHash)
            if (user.passwordHash !== password) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            if (user.status !== 'active') {
                return res.status(403).json({ error: 'Account is inactive' });
            }

            // In production, return a JWT token
            res.json({
                id: user.id,
                username: user.username,
                fullName: user.fullName,
                role: user.role,
                classId: user.classId,
                class: user.class
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Login failed' });
        }
    }
};
