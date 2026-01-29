import { Router } from 'express';
import { TeacherController } from '../controllers/TeacherController';

const router = Router();

router.get('/', TeacherController.getAllTeachers);
router.get('/:id', TeacherController.getTeacherById);
router.post('/', TeacherController.createTeacher);
router.put('/:id', TeacherController.updateTeacher);
router.delete('/:id', TeacherController.deleteTeacher);
router.post('/:id/assign', TeacherController.assignToClass);

export default router;
