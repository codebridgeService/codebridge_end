import { Router } from 'express';
import { getAll, getOne, create, update, remove } from '../controllers/users.controller';
import { verifyToken, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

router.get('/', verifyToken, requireAdmin, getAll);
router.get('/:id', verifyToken, requireAdmin, getOne);
router.post('/', verifyToken, requireAdmin, create);
router.put('/:id', verifyToken, requireAdmin, update);
router.delete('/:id', verifyToken, requireAdmin, remove);

export default router;

