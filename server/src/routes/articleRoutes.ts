import { Router } from 'express';
import { 
  getArticles, 
  getArticleById, 
  markArticleAsRead,
  getArticleFetcherStatus,
  triggerArticleFetch
} from '../controllers/articleController';

const router = Router();

// Article routes
router.get('/', getArticles);
router.get('/:id', getArticleById);
router.patch('/:id/read', markArticleAsRead);

// Article fetcher routes
router.get('/fetcher/status', getArticleFetcherStatus);
router.post('/fetcher/fetch', triggerArticleFetch);

export default router;
