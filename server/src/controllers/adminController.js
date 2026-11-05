import { z } from 'zod';
import { studentQuerySchema, idSchema } from '../utils/validators.js';
import { publicUser, publicRequest } from '../utils/serializers.js';
import { AppError } from '../utils/errors.js';

export function createAdminController(store, deletion) {
  return {
    async overview(req, res) {
      const [stats, students, requests, activities, deletions] = await Promise.all([
        store.dashboard(),
        store.users.recent(5),
        store.requests.list({ page: 1, limit: 5 }),
        store.logs.list(8),
        store.jobs.pending(),
      ]);
      res.json({
        stats,
        students: students.map((u) => publicUser(u, true)),
        requests: requests.items.map((r) => publicRequest(r, true)),
        activities,
        deletions,
      });
    },
    async students(req, res) {
      const query = studentQuerySchema.parse(req.query);
      const result = await store.users.list(query);
      res.json({ ...result, items: result.items.map((u) => publicUser(u, true)) });
    },
    async student(req, res) {
      idSchema.parse(req.params.id);
      const user = await store.users.findById(req.params.id);
      if (!user || user.role !== 'student' || user.state !== 'active')
        throw new AppError(404, 'Student not found.');
      const requests = await store.requests.allForUser(user._id);
      res.json({
        user: publicUser(user, true),
        requests: requests.map((r) => publicRequest(r, true)),
        stats: {
          total: requests.length,
          pending: requests.filter((r) => r.status === 'Pending').length,
          inProgress: requests.filter((r) => r.status === 'In Progress').length,
          completed: requests.filter((r) => r.status === 'Completed').length,
        },
      });
    },
    async deleteStudent(req, res) {
      idSchema.parse(req.params.id);
      const { confirmation } = z
        .object({ confirmation: z.string().min(2).max(100) })
        .strict()
        .parse(req.body);
      const user = await store.users.findById(req.params.id);
      const job = await store.jobs.findForUser(req.params.id);
      if (!user && job)
        return res
          .status(202)
          .json({ message: 'Account deletion is already being processed.', status: 'processing' });
      if (user?.role === 'admin')
        throw new AppError(403, 'Administrator accounts cannot be deleted here.', 'PROTECTED_ACCOUNT');
      if (!user) throw new AppError(404, 'Student not found.');
      if (confirmation.trim() !== user.fullName)
        throw new AppError(400, 'The confirmation name does not match.', 'CONFIRMATION_MISMATCH');
      const result = await deletion.deleteStudent(user, req.user._id);
      res.status(result.status === 'completed' ? 200 : 202).json({
        message:
          result.status === 'completed'
            ? 'Student account and related records deleted.'
            : 'Account access and database records have been removed. Private-file cleanup will retry automatically.',
        ...result,
      });
    },
    async activities(req, res) {
      res.json({ items: await store.logs.list(100) });
    },
    async deletions(req, res) {
      res.json({ items: await store.jobs.pending() });
    },
    async retryDeletion(req, res) {
      const id = idSchema.parse(req.params.id);
      await store.jobs.update(id, { nextAttemptAt: new Date(), lockedAt: null });
      const result = await deletion.processJob(id);
      if (!result) throw new AppError(409, 'This job is already being processed.');
      res.json(result);
    },
  };
}
