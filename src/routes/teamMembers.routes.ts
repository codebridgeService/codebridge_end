import { Router } from 'express';
import { getAll, getOne, create, update, remove } from '../controllers/teamMembers.controller';
import { verifyToken, requireAdmin } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: TeamMembers
 *   description: Team Members Management
 */

/**
 * @swagger
 * /team-members:
 *   get:
 *     summary: Get all team members
 *     tags: [TeamMembers]
 *     responses:
 *       200:
 *         description: A list of team members
 */
router.get('/', getAll);

/**
 * @swagger
 * /team-members/{id}:
 *   get:
 *     summary: Get a specific team member
 *     tags: [TeamMembers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Team member details
 */
router.get('/:id', getOne);

/**
 * @swagger
 * /team-members:
 *   post:
 *     summary: Create a new team member
 *     tags: [TeamMembers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               role:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Created successfully
 */
router.post('/', verifyToken, requireAdmin, upload.single('image'), create);

/**
 * @swagger
 * /team-members/{id}:
 *   put:
 *     summary: Update a team member
 *     tags: [TeamMembers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Updated successfully
 */
router.put('/:id', verifyToken, requireAdmin, upload.single('image'), update);

/**
 * @swagger
 * /team-members/{id}:
 *   delete:
 *     summary: Delete a team member
 *     tags: [TeamMembers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted successfully
 */
router.delete('/:id', verifyToken, requireAdmin, remove);

export default router;

