import { Router } from 'express';
import { TeacherController } from '../controllers/TeacherController';
import { verifyToken } from '../middleware/auth';

const router = Router();

router.get('/', TeacherController.getAllTeachers);
router.get('/:id', TeacherController.getTeacherById);
router.post('/', verifyToken, TeacherController.createTeacher);
router.put('/:id', verifyToken, TeacherController.updateTeacher);
router.delete('/:id', verifyToken, TeacherController.deleteTeacher);
router.post('/:id/assign', verifyToken, TeacherController.assignToClass);

export default router;
