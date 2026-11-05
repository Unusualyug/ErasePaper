import { z } from 'zod';
import { createAnalyticsService, getAnalyticsRange } from '../services/analytics.js';

const serviceSlugs = [
  'literature-review',
  'research-paper',
  'survey-paper',
  'final-year-project',
  'bulk-printing',
];
const source = z.enum(['direct', 'search', 'social', 'referral', 'unknown']).default('unknown');
const collectionSchema = z
  .object({
    analyticsConsent: z.literal(true),
    visitorId: z.string().uuid(),
    sessionId: z.string().uuid(),
    path: z.string().startsWith('/').max(300),
    hash: z.string().max(100).default(''),
    serviceSlug: z.enum(serviceSlugs).optional(),
    source,
  })
  .strict();
const pageViewSchema = collectionSchema;
const visitorRemovalSchema = z.object({ visitorId: z.string().uuid() }).strict();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const reportQuerySchema = z
  .object({
    range: z
      .enum(['today', 'yesterday', 'last7days', 'last30days', 'thisMonth', 'last3months', 'custom'])
      .default('last7days'),
    from: dateSchema.optional(),
    to: dateSchema.optional(),
  })
  .strict();

export function createAnalyticsController(store) {
  const analytics = createAnalyticsService(store);

  return {
    heartbeat: async (req, res) => {
      const input = collectionSchema.parse(req.body);
      await analytics.heartbeat(input, req.user, req.get('user-agent'));
      res.status(204).end();
    },
    pageView: async (req, res) => {
      const input = pageViewSchema.parse(req.body);
      await analytics.pageView(input, req.user, req.get('user-agent'));
      res.status(204).end();
    },
    removeVisitor: async (req, res) => {
      const { visitorId } = visitorRemovalSchema.parse(req.body);
      await analytics.removeVisitor(visitorId);
      res.status(204).end();
    },
    report: async (req, res) => {
      const query = reportQuerySchema.parse(req.query);
      const range = getAnalyticsRange(query.range, query.from, query.to);
      res.json(await analytics.report(range));
    },
  };
}
