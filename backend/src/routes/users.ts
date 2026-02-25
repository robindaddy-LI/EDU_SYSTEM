import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { verifyToken } from '../middleware/auth';

const router = Router();

// 公開路由（不需認證）
router.post('/login', UserController.login);

// 讀取路由
router.get('/', UserController.getAllUsers);
router.get('/:id', UserController.getUserById);

// 寫入路由（需認證）
router.post('/', verifyToken, UserController.createUser);
router.put('/:id', verifyToken, UserController.updateUser);
router.delete('/:id', verifyToken, UserController.deleteUser);

export default router;
