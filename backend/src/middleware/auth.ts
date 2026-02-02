import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Express Request type to include user payload
export interface AuthRequest extends Request {
    user?: {
        id: number;
        username: string;
        role: string;
        classId: number | null;
    };
}

// JWT payload type
interface JwtPayload {
    id: number;
    username: string;
    role: string;
    classId: number | null;
}

/**
 * Middleware to verify JWT token
 * Extracts token from Authorization header: "Bearer <token>"
 */
export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
        req.user = decoded;  // Attach user info to request
        next();
    } catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ error: 'Token expired' });
        }
        if (err instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        return res.status(401).json({ error: 'Authentication failed' });
    }
};

/**
 * Middleware to require specific roles
 * Usage: requireRole('admin', 'teacher')
 */
export const requireRole = (...allowedRoles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        next();
    };
};

/**
 * Optional: Middleware to check if user can access specific class data
 * Admins can access all; others limited to their assigned class
 */
export const requireClassAccess = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    // Admin can access all classes
    if (req.user.role === 'admin') {
        return next();
    }

    // Get classId from params or body
    const targetClassId = Number(req.params.classId || req.body.classId);

    if (targetClassId && req.user.classId !== targetClassId) {
        return res.status(403).json({ error: 'Cannot access other class data' });
    }

    next();
};
