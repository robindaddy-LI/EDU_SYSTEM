import { Router } from 'express';
import { ClassController } from '../controllers/ClassController';

const router = Router();

router.get('/', ClassController.getAllClasses);
router.get('/:id', ClassController.getClassById);
router.post('/', ClassController.createClass);
router.put('/:id', ClassController.updateClass);
router.delete('/:id', ClassController.deleteClass);

export default router;
