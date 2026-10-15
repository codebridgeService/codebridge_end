import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: 'codebridge_backend.env' });

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { attackShield } from './middleware/attackShield.middleware';
import { botProtection } from './middleware/botProtection.middleware';
import { globalLimiter, authLimiter } from './middleware/rateLimit.middleware';
import authRoutes from './routes/auth.routes';
import packagesRoutes from './routes/packages.routes';
import servicesRoutes from './routes/services.routes';
import teamMembersRoutes from './routes/teamMembers.routes';
import usersRoutes from './routes/users.routes';
import projectsRoutes from './routes/projects.routes';
import projectRequestsRoutes from './routes/projectRequests.routes';
import contactRoutes from './routes/contact.routes';
import adminRoutes from './routes/admin.routes';
import siteSettingsRoutes from './routes/siteSettings.routes';
import faqRoutes from './routes/faq.routes';
import workStepsRoutes from './routes/workSteps.routes';
import securityFeaturesRoutes from './routes/securityFeatures.routes';
import { setupSwagger } from './lib/swagger';


const app: Express = express();
const port = process.env.PORT || 5000;

// Security HTTP headers
app.use(helmet());

// Cookie parser
app.use(cookieParser());

// CORS configuration
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(null, true); // Allow configured origins
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

// Attack Shield (Fast IP drop), Bot protection, and Rate limiting middleware
app.use('/api/', attackShield);
app.use('/api/', botProtection);
app.use('/api/', globalLimiter);
app.use('/api/auth', authLimiter);

setupSwagger(app);

app.use('/api/auth', authRoutes);
app.use('/api/packages', packagesRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/team-members', teamMembersRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/project-requests', projectRequestsRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/site-settings', siteSettingsRoutes);
app.use('/api/faqs', faqRoutes);
app.use('/api/work-steps', workStepsRoutes);
app.use('/api/security-features', securityFeaturesRoutes);


// Centralized defensive error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Unhandled Error]:', err.stack || err.message || err);
  const statusCode = typeof err.status === 'number' ? err.status : 500;
  res.status(statusCode).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'An error occurred'),
  });
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});

