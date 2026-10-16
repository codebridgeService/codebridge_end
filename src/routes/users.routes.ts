import { Router } from 'express';
import { getAll, getOne, create, update, remove } from '../controllers/users.controller';
import { verifyToken, requireAdmin } from '../middleware/auth.middleware';
import { validateObjectId } from '../middleware/validateId.middleware';

const router = Router();

router.get('/', verifyToken, requireAdmin, getAll);
router.get('/:id', verifyToken, requireAdmin, validateObjectId(), getOne);
router.post('/', verifyToken, requireAdmin, create);
router.put('/:id', verifyToken, requireAdmin, validateObjectId(), update);
router.delete('/:id', verifyToken, requireAdmin, validateObjectId(), remove);

export default router;

