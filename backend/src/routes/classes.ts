import { Router } from 'express';
import { ClassController } from '../controllers/ClassController';
import { verifyToken } from '../middleware/auth';

const router = Router();

router.get('/', ClassController.getAllClasses);
router.get('/:id', ClassController.getClassById);
router.post('/', verifyToken, ClassController.createClass);
router.put('/:id', verifyToken, ClassController.updateClass);
router.delete('/:id', verifyToken, ClassController.deleteClass);

export default router;
