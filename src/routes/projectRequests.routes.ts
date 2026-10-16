import { Router } from 'express';
import { getAll, getOne, create, update, remove } from '../controllers/projectRequests.controller';
import { verifyToken, requireAdmin } from '../middleware/auth.middleware';
import { validateObjectId } from '../middleware/validateId.middleware';
import { quoteLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

router.get('/', verifyToken, getAll);
router.get('/:id', verifyToken, validateObjectId(), getOne);
router.post('/', quoteLimiter, create);
router.put('/:id', verifyToken, requireAdmin, validateObjectId(), update);
router.delete('/:id', verifyToken, requireAdmin, validateObjectId(), remove);

export default router;

