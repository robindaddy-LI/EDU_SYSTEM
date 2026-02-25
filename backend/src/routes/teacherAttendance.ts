import express from 'express';
import { TeacherAttendanceController } from '../controllers/TeacherAttendanceController';
import { verifyToken } from '../middleware/auth';

const router = express.Router();

// Get all teacher attendance records (with optional filters)
router.get('/', TeacherAttendanceController.getAll);

// Get single teacher attendance record by ID
router.get('/:id', TeacherAttendanceController.getById);

// Create or update teacher attendance record
router.post('/', verifyToken, TeacherAttendanceController.upsert);

// Batch upsert teacher attendance records
router.post('/batch', verifyToken, TeacherAttendanceController.batchUpsert);

// Delete teacher attendance record
router.delete('/:id', verifyToken, TeacherAttendanceController.delete);

export default router;
