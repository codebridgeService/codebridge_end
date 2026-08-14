import 'dotenv/config';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

jest.mock('../src/lib/prisma', () => {
  const mockProjects: any[] = [];
  return {
    prisma: {
      project: {
        findMany: jest.fn().mockImplementation(() => Promise.resolve(mockProjects)),
        findUnique: jest.fn().mockImplementation(({ where }: { where: { id: string } }) => {
          return Promise.resolve(mockProjects.find(p => p.id === where.id) || null);
        }),
        create: jest.fn().mockImplementation(({ data }: { data: any }) => {
          const newProject = { id: 'mock-proj-1', ...data, createdAt: new Date(), updatedAt: new Date() };
          mockProjects.push(newProject);
          return Promise.resolve(newProject);
        }),
        update: jest.fn().mockImplementation(({ where, data }: { where: { id: string }, data: any }) => {
          const item = mockProjects.find(p => p.id === where.id);
          if (item) {
            Object.assign(item, data);
            return Promise.resolve(item);
          }
          return Promise.resolve({ id: where.id, ...data });
        }),
        delete: jest.fn().mockImplementation(({ where }: { where: { id: string } }) => {
          const index = mockProjects.findIndex(p => p.id === where.id);
          if (index !== -1) mockProjects.splice(index, 1);
          return Promise.resolve({ id: where.id });
        }),
      },
      blockedIp: {
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    },
  };
});

import projectsRoutes from '../src/routes/projects.routes';
import adminRoutes from '../src/routes/admin.routes';
import { getJwtSecret } from '../src/middleware/auth.middleware';

const app = express();
app.use(express.json());
app.use('/api/projects', projectsRoutes);
app.use('/api/admin', adminRoutes);

describe('Projects Controller & API Integration Tests', () => {
  const adminToken = jwt.sign(
    { userId: 'admin-id', email: 'admin@codebridge.com', role: 'admin' },
    getJwtSecret(),
    { expiresIn: '15m' }
  );

  const userToken = jwt.sign(
    { userId: 'user-id', email: 'user@codebridge.com', role: 'user' },
    getJwtSecret(),
    { expiresIn: '15m' }
  );

  it('should allow public access to GET /api/projects', async () => {
    const res = await request(app).get('/api/projects');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should reject unauthenticated project creation', async () => {
    const res = await request(app)
      .post('/api/projects')
      .send({
        title: 'New Web App',
        description: 'A great platform',
        content: 'Long markdown description',
        category: 'Web Development',
      });
    expect(res.status).toBe(401);
  });

  it('should reject non-admin user project creation', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'New Web App',
        description: 'A great platform',
        content: 'Long markdown description',
        category: 'Web Development',
      });
    expect(res.status).toBe(403);
  });

  it('should successfully create a project with admin token', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('title', 'Super Project')
      .field('description', 'Description of super project')
      .field('content', 'Full case study content')
      .field('category', 'Web Development')
      .field('link', 'https://example.com');

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toBe('Super Project');
    expect(res.body.category).toBe('Web Development');
  });

  it('should successfully reorder projects via /api/admin/projects/reorder', async () => {
    const res = await request(app)
      .post('/api/admin/projects/reorder')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        orders: [
          { id: 'mock-proj-1', order: 0 },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Reordered successfully');
  });

  it('should successfully delete a project with admin token', async () => {
    const res = await request(app)
      .delete('/api/projects/mock-proj-1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Deleted successfully');
  });
});
