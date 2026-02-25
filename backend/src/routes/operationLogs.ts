import express from 'express';
import { OperationLogController } from '../controllers/OperationLogController';
import { verifyToken } from '../middleware/auth';

const router = express.Router();

// Get all operation logs (with optional filters) - admin read
router.get('/', OperationLogController.getAll);

// Get single operation log by ID
router.get('/:id', OperationLogController.getById);

// Create new operation log (protected)
router.post('/', verifyToken, OperationLogController.create);

// Delete operation log (protected - admin only action)
router.delete('/:id', verifyToken, OperationLogController.delete);

export default router;
