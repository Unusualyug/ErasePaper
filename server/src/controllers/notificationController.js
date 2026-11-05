import { z } from 'zod';
import { idSchema } from '../utils/validators.js';
export function createNotificationController(store) {
  const query = (req) => ({ role: req.user.role, userId: String(req.user._id) });
  const serialize = (n) => ({
    id: String(n._id),
    type: n.type,
    title: n.title,
    message: n.message,
    relatedRequestId: n.relatedRequestId,
    relatedUserId: n.relatedUserId,
    read: !!n.readAt,
    createdAt: n.createdAt,
  });
  return {
    async list(req, res) {
      const result = await store.notifications.list(query(req));
      res.json({ ...result, items: result.items.map(serialize) });
    },
    async read(req, res) {
      const { ids } = z
        .object({ ids: z.array(idSchema).max(50).optional() })
        .strict()
        .parse(req.body);
      await store.notifications.markRead(query(req), ids);
      res.json({ success: true });
    },
  };
}
