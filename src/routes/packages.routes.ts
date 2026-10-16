import { Router } from 'express';
import { getAll, getOne, create, update, remove } from '../controllers/packages.controller';
import { verifyToken, requireAdmin } from '../middleware/auth.middleware';
import { validateObjectId } from '../middleware/validateId.middleware';

const router = Router();

router.get('/', getAll);
router.get('/:id', validateObjectId(), getOne);
router.post('/', verifyToken, requireAdmin, create);
router.put('/:id', verifyToken, requireAdmin, validateObjectId(), update);
router.delete('/:id', verifyToken, requireAdmin, validateObjectId(), remove);

export default router;

