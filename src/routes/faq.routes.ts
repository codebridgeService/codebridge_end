import { Router } from 'express';
import { getAll, getOne, create, update, remove, reorder } from '../controllers/faq.controller';
import { verifyToken, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getAll);
router.get('/:id', getOne);
router.post('/', verifyToken, requireAdmin, create);
router.put('/:id', verifyToken, requireAdmin, update);
router.delete('/:id', verifyToken, requireAdmin, remove);
router.post('/reorder', verifyToken, requireAdmin, reorder);

export default router;
