import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import config from './config/env.js';
import { createCsp } from './config/security.js';
import { createAuthProvider } from './middleware/auth.js';
import { createDeletionService } from './services/deletion.js';
import { createRoutes } from './routes/index.js';
import { asyncHandler, errorHandler, AppError } from './utils/errors.js';

export function createApp(store) {
  const app = express();
  const auth = createAuthProvider(store);
  const deletion = createDeletionService(store);
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', config.trustProxy);
  app.use(compression());
  app.use((req, res, next) => {
    req.requestId = randomUUID();
    res.setHeader('X-Request-Id', req.requestId);
    next();
  });
  // API responses can contain student records, private notes and admin data. Never let
  // browser or intermediary caches retain them after a tab/session is closed or signed out.
  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use(
    helmet({
      contentSecurityPolicy: createCsp(),
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(
    cors({
      origin(origin, callback) {
        const preview = config.demo && origin && /^https:\/\/[a-zA-Z0-9-]+\.e2b\.app$/.test(origin);
        if (!origin || config.origins.includes(origin) || preview) callback(null, true);
        else callback(new AppError(403, 'Origin is not allowed.', 'ORIGIN_DENIED'));
      },
      credentials: true,
      allowedHeaders: ['Content-Type'],
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    }),
  );
  app.use(
    '/api',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: config.demo ? 3000 : 600,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { error: 'Too many requests. Please try again shortly.' },
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use('/api', createRoutes({ store, auth, deletion }));
  app.use('/api', (req, res) => res.status(404).json({ error: 'API endpoint not found.' }));
  const dist = path.resolve(config.root, '../client/dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist, { maxAge: config.production ? '1h' : 0, index: false }));
    app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
  }
  app.use(errorHandler);
  return { app, auth, deletion };
}
