import { Router } from 'express';
import articleRoutes from './articleRoutes';

const router = Router();

// Mount routes
router.use('/articles', articleRoutes);

export default router;
