import { Router } from 'express';
import { StudentController } from '../controllers/StudentController';

const router = Router();

router.get('/', StudentController.getAllStudents);
router.get('/:id', StudentController.getStudentById);
router.post('/', StudentController.createStudent);
router.put('/:id', StudentController.updateStudent);
router.put('/:id', StudentController.updateStudent);
router.delete('/:id', StudentController.deleteStudent);

// Duplicates
router.get('/duplicates/search', StudentController.findDuplicates);
router.post('/duplicates/resolve', StudentController.resolveDuplicates);
router.post('/import', StudentController.batchImport);

export default router;
