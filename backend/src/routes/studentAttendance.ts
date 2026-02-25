import express from 'express';
import { StudentAttendanceController } from '../controllers/StudentAttendanceController';
import { verifyToken } from '../middleware/auth';

const router = express.Router();

// Get all student attendance records (with optional filters)
router.get('/', StudentAttendanceController.getAll);

// Get single student attendance record by ID
router.get('/:id', StudentAttendanceController.getById);

// Create or update student attendance record
router.post('/', verifyToken, StudentAttendanceController.upsert);

// Batch upsert student attendance records
router.post('/batch', verifyToken, StudentAttendanceController.batchUpsert);

// Delete student attendance record
router.delete('/:id', verifyToken, StudentAttendanceController.delete);

export default router;
