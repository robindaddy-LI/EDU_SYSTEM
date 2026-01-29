import { Router } from 'express';
import { StatisticsController } from '../controllers/StatisticsController';

const router = Router();

// Student Statistics (Individual)
router.get('/student/:id', StatisticsController.getStudentStats);

// Class Statistics (Per Academic Year)
router.get('/class/:id', StatisticsController.getClassStats);

// School-wide Statistics (Dashboard)
router.get('/school', StatisticsController.getSchoolStats);

export default router;
