import { Router } from 'express';
import { ClassSessionController } from '../controllers/ClassSessionController';
import { verifyToken } from '../middleware/auth';

const router = Router();

// Sessions
router.get('/', ClassSessionController.getAllSessions);
router.get('/:id', ClassSessionController.getSessionById);
router.post('/', verifyToken, ClassSessionController.createSession);
router.put('/:id', verifyToken, ClassSessionController.updateSession);

// Attendance
router.post('/:id/attendance', verifyToken, ClassSessionController.updateAttendance);

export default router;
