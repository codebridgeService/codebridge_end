import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/siteSettings.controller';
import { verifyToken, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getSettings);
router.put('/', verifyToken, requireAdmin, updateSettings);

export default router;
