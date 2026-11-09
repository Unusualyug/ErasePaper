import { createHash } from 'node:crypto';
import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import config from '../config/env.js';
import { asyncHandler } from '../utils/errors.js';
import { createAuthController } from '../controllers/authController.js';
import { createProfileController } from '../controllers/profileController.js';
import { createRequestController } from '../controllers/requestController.js';
import { createAdminController } from '../controllers/adminController.js';
import { createNotificationController } from '../controllers/notificationController.js';
import { createAnalyticsController } from '../controllers/analyticsController.js';
import { upload } from '../services/uploads.js';

export function createRoutes({ store, auth, deletion }) {
  const router = Router();
  const account = createAuthController(store, auth);
  const profile = createProfileController(store);
  const requests = createRequestController(store);
  const admin = createAdminController(store, deletion);
  const notifications = createNotificationController(store);
  const analytics = createAnalyticsController(store);
  const analyticsLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.demo ? 1200 : 300,
    keyGenerator: (req) => {
      const id = req.body?.visitorId;
      return typeof id === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
        ? `analytics:${id}`
        : ipKeyGenerator(req.ip);
    },
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many analytics events. Please try again later.' },
  });
  const writeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.demo ? 300 : 40,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many submissions. Please try again later.' },
  });
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.demo ? 300 : 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many sign-in attempts. Please try again later.' },
  });
  const forgotPasswordIpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many password reset requests. Please wait and try again later.' },
  });
  const forgotPasswordEmailLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 3,
    keyGenerator: (req) => {
      const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
      return email
        ? `reset-email:${createHash('sha256').update(email).digest('hex')}`
        : `reset-invalid:${ipKeyGenerator(req.ip)}`;
    },
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many password reset requests. Please wait and try again later.' },
  });
  const resetPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many password reset attempts. Please wait and try again later.' },
  });

  router.get('/health', (req, res) =>
    res.json({ status: 'ok', mode: config.demo ? 'demo' : 'live', database: store.kind }),
  );
  router.get('/config', (req, res) =>
    res.json({ mode: config.demo ? 'demo' : 'live', whatsappNumber: config.whatsapp }),
  );
  router.post('/auth/register', authLimiter, asyncHandler(account.register));
  router.post('/auth/login', authLimiter, asyncHandler(account.login));
  router.post(
    '/auth/forgot-password',
    forgotPasswordIpLimiter,
    forgotPasswordEmailLimiter,
    asyncHandler(account.forgotPassword),
  );
  router.post('/auth/reset-password', resetPasswordLimiter, asyncHandler(account.resetPassword));
  router.post('/auth/logout', asyncHandler(account.logout));
  if (config.demo) router.post('/auth/demo/quick', asyncHandler(account.quickDemo));

  router.get('/services', asyncHandler(requests.services));
  router.post(
    '/analytics/heartbeat',
    analyticsLimiter,
    auth.optionalAuthenticate,
    asyncHandler(analytics.heartbeat),
  );
  router.post(
    '/analytics/page-view',
    analyticsLimiter,
    auth.optionalAuthenticate,
    asyncHandler(analytics.pageView),
  );
  router.delete('/analytics/visitor', analyticsLimiter, asyncHandler(analytics.removeVisitor));

  router.use(auth.authenticate);
  router.get('/me', asyncHandler(profile.me));
  router.patch('/me', writeLimiter, asyncHandler(profile.update));
  router.get('/requests', asyncHandler(requests.list));
  router.post('/requests', writeLimiter, upload.array('attachments', 3), asyncHandler(requests.create));
  router.get('/requests/summary', asyncHandler(requests.summary));
  router.get('/requests/:id', asyncHandler(requests.detail));
  router.post('/requests/:id/cancel', writeLimiter, asyncHandler(requests.cancel));
  router.get('/requests/:id/attachments/:attachmentId', asyncHandler(requests.attachment));
  router.get('/notifications', asyncHandler(notifications.list));
  router.post('/notifications/read', asyncHandler(notifications.read));
  router.use('/admin', auth.requireAdmin);
  router.get('/admin/analytics', asyncHandler(analytics.report));
  router.get('/admin/overview', asyncHandler(admin.overview));
  router.get('/admin/students', asyncHandler(admin.students));
  router.get('/admin/students/:id', asyncHandler(admin.student));
  router.delete('/admin/students/:id', writeLimiter, asyncHandler(admin.deleteStudent));
  router.get('/admin/requests', asyncHandler(requests.adminList));
  router.get('/admin/requests/:id', asyncHandler(requests.detail));
  router.patch('/admin/requests/:id', writeLimiter, asyncHandler(requests.adminUpdate));
  router.get('/admin/activities', asyncHandler(admin.activities));
  router.get('/admin/deletions', asyncHandler(admin.deletions));
  router.post('/admin/deletions/:id/retry', asyncHandler(admin.retryDeletion));
  return router;
}
