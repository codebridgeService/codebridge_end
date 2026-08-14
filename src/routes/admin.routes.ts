import { Router } from 'express';
import { getStats, getMessagesCount, getProjectRequestsCount, getMessages, getMessage, updateMessage, deleteMessage, initDb } from '../controllers/admin.controller';
import { reorderTeamMembers } from '../controllers/teamMembers.controller';
import { reorderProjects } from '../controllers/projects.controller';
import {
  getBlockedIPsController,
  blockIPController,
  unblockIPController,
  clearAllBlocksController,
  getSecurityStatsController,
} from '../controllers/security.controller';
import { verifyToken, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

router.get('/stats', verifyToken, requireAdmin, getStats);
router.get('/messages/count', verifyToken, requireAdmin, getMessagesCount);
router.get('/project-requests/count', verifyToken, requireAdmin, getProjectRequestsCount);
router.get('/messages', verifyToken, requireAdmin, getMessages);
router.get('/messages/:id', verifyToken, requireAdmin, getMessage);
router.patch('/messages/:id', verifyToken, requireAdmin, updateMessage);
router.delete('/messages/:id', verifyToken, requireAdmin, deleteMessage);
router.post('/team/reorder', verifyToken, requireAdmin, reorderTeamMembers);
router.post('/projects/reorder', verifyToken, requireAdmin, reorderProjects);
router.get('/init-db', verifyToken, requireAdmin, initDb);

// Security & Attack Shield IP Management
router.get('/blocked-ips', verifyToken, requireAdmin, getBlockedIPsController);
router.post('/blocked-ips', verifyToken, requireAdmin, blockIPController);
router.delete('/blocked-ips/:ip', verifyToken, requireAdmin, unblockIPController);
router.post('/blocked-ips/clear-all', verifyToken, requireAdmin, clearAllBlocksController);
router.get('/security-stats', verifyToken, requireAdmin, getSecurityStatsController);

export default router;

