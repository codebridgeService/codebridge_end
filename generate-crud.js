const fs = require('fs');
const path = require('path');

const models = [
  'packages',
  'services',
  'teamMembers',
  'users',
  'projects',
  'projectRequests',
];

const modelMap = {
  'packages': 'package',
  'services': 'service',
  'teamMembers': 'teamMember',
  'users': 'user',
  'projects': 'project',
  'projectRequests': 'projectRequest',
};

const controllersDir = path.join(__dirname, 'src', 'controllers');
const routesDir = path.join(__dirname, 'src', 'routes');

models.forEach(model => {
  const modelCamel = modelMap[model];
  const controllerCode = `import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const getAll = async (req: Request, res: Response) => {
  try {
    const items = await (prisma.${modelCamel} as any).findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(items);
  } catch (error) {
    console.error('Error fetching ${model}:', error);
    res.status(500).json({ error: 'Failed to fetch ${model}' });
  }
};

export const getOne = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const item = await (prisma.${modelCamel} as any).findUnique({ where: { id } });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (error) {
    console.error('Error fetching ${model}:', error);
    res.status(500).json({ error: 'Failed to fetch' });
  }
};

export const create = async (req: Request, res: Response) => {
  try {
    const item = await (prisma.${modelCamel} as any).create({
      data: req.body,
    });
    res.status(201).json(item);
  } catch (error) {
    console.error('Error creating ${model}:', error);
    res.status(500).json({ error: 'Failed to create' });
  }
};

export const update = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const item = await (prisma.${modelCamel} as any).update({
      where: { id },
      data: req.body,
    });
    res.json(item);
  } catch (error) {
    console.error('Error updating ${model}:', error);
    res.status(500).json({ error: 'Failed to update' });
  }
};

export const remove = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await (prisma.${modelCamel} as any).delete({ where: { id } });
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting ${model}:', error);
    res.status(500).json({ error: 'Failed to delete' });
  }
};
`;

  const routesCode = `import { Router } from 'express';
import { getAll, getOne, create, update, remove } from '../controllers/${model}.controller';
import { verifyToken } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getAll);
router.get('/:id', getOne);
router.post('/', verifyToken, create);
router.put('/:id', verifyToken, update);
router.delete('/:id', verifyToken, remove);

export default router;
`;

  fs.writeFileSync(path.join(controllersDir, `${model}.controller.ts`), controllerCode);
  fs.writeFileSync(path.join(routesDir, `${model}.routes.ts`), routesCode);
});
console.log('CRUD templates generated successfully.');
