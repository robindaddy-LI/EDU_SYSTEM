import express from 'express';
import TeacherAssignmentController from '../controllers/TeacherAssignmentController';

const router = express.Router();

// GET /api/v1/teacher-assignments?academicYear=2025
router.get('/', TeacherAssignmentController.getAll);

// GET /api/v1/teacher-assignments/:id
router.get('/:id', TeacherAssignmentController.getById);

// POST /api/v1/teacher-assignments
router.post('/', TeacherAssignmentController.create);

// POST /api/v1/teacher-assignments/batch
router.post('/batch', TeacherAssignmentController.batchUpsert);

// PUT /api/v1/teacher-assignments/:id
router.put('/:id', TeacherAssignmentController.update);

// DELETE /api/v1/teacher-assignments/:id
router.delete('/:id', TeacherAssignmentController.delete);

export default router;
