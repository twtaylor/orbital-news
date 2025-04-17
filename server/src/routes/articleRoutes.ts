import { Router } from 'express';
import { 
  getArticles, 
  getArticleById, 
  getArticleFetcherStatus,
  triggerArticleFetch
} from '../controllers/articleController';

const router = Router();

// Article routes
router.get('/', getArticles);
router.get('/:id', getArticleById);
// Read status route removed as we no longer track read status

// Article fetcher routes
router.get('/fetcher/status', getArticleFetcherStatus);
router.post('/fetcher/fetch', triggerArticleFetch);

export default router;
