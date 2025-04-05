import { Router } from 'express';
import { getArticles, getArticleById, markArticleAsRead } from '../controllers/articleController';

const router = Router();

// Article routes
router.get('/', getArticles);
router.get('/:id', getArticleById);
router.patch('/:id/read', markArticleAsRead);

export default router;
