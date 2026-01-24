
import { Router } from 'express';
import { ClassSessionController } from '../controllers/ClassSessionController';

const router = Router();

// Sessions
router.get('/', ClassSessionController.getAllSessions);
router.get('/:id', ClassSessionController.getSessionById);
router.post('/', ClassSessionController.createSession);
router.put('/:id', ClassSessionController.updateSession);

// Attendance
router.post('/:id/attendance', ClassSessionController.updateAttendance);

export default router;
