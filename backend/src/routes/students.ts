import { Router } from 'express';
import { StudentController } from '../controllers/StudentController';
import { verifyToken } from '../middleware/auth';

const router = Router();

// 讀取路由（不需認證）
router.get('/', StudentController.getAllStudents);
router.get('/duplicates/search', StudentController.findDuplicates);
router.get('/:id', StudentController.getStudentById);

// 寫入路由（需認證，審計記錄需要 req.user）
router.post('/', verifyToken, StudentController.createStudent);
router.put('/:id', verifyToken, StudentController.updateStudent);
router.delete('/:id', verifyToken, StudentController.deleteStudent);
router.post('/duplicates/resolve', verifyToken, StudentController.resolveDuplicates);
router.post('/import', verifyToken, StudentController.batchImport);

export default router;

