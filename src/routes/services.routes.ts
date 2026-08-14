import { Router } from 'express';
import { getAll, getOne, create, update, remove } from '../controllers/services.controller';
import { verifyToken, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getAll);
router.get('/:id', getOne);
router.post('/', verifyToken, requireAdmin, create);
router.put('/:id', verifyToken, requireAdmin, update);
router.delete('/:id', verifyToken, requireAdmin, remove);

export default router;

