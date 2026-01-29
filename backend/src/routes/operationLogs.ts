import express from 'express';
import { OperationLogController } from '../controllers/OperationLogController';

const router = express.Router();

// Get all operation logs (with optional filters)
router.get('/', OperationLogController.getAll);

// Get single operation log by ID
router.get('/:id', OperationLogController.getById);

// Create new operation log
router.post('/', OperationLogController.create);

// Delete operation log
router.delete('/:id', OperationLogController.delete);

export default router;
