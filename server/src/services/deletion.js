import fs from 'node:fs/promises';
import path from 'node:path';
import config from '../config/env.js';
import { AppError } from '../utils/errors.js';

// Durable, idempotent cleanup: revoke sessions, remove database records, then delete private files.
export function createDeletionService(store) {
  let running = false;
  let timer;

  async function enqueue(user, actorId) {
    if (user.role !== 'student')
      throw new AppError(403, 'Administrator accounts cannot be deleted here.', 'PROTECTED_ACCOUNT');
    const result = await store.withTransaction(async (tx) => {
      const current = await store.users.findById(user._id, tx);
      if (!current) return store.jobs.findForUser(String(user._id));
      if (current.role !== 'student')
        throw new AppError(403, 'This account is protected.', 'PROTECTED_ACCOUNT');
      await store.users.update(user._id, { state: 'deleting' }, tx);
      const { job, created } = await store.jobs.enqueue(
        {
          userId: String(user._id),
          studentId: user.studentId,
          actorId: String(actorId),
          attachmentKeys: [],
        },
        tx,
      );
      if (created)
        await store.logs.create(
          { actorId: String(actorId), action: 'student.deletion_requested', targetId: user.studentId },
          tx,
        );
      return job;
    });
    return result;
  }

  async function processJob(id) {
    const job = await store.jobs.claim(id);
    if (!job) return null;
    try {
      if (job.stage === 'pending') {
        await store.withTransaction(async (tx) => {
          const requests = await store.requests.allForUser(job.userId, tx);
          job.attachmentKeys = [
            ...new Set([
              ...(job.attachmentKeys || []),
              ...requests.flatMap((r) => (r.attachments || []).map((a) => a.storageName)),
            ]),
          ];
          await store.sessions.removeForUser(job.userId, tx);
          await store.notifications.removeForUser(job.userId, tx);
          await store.requests.removeForUser(job.userId, tx);
          await store.users.remove(job.userId, tx);
          await store.jobs.update(
            job._id,
            { stage: 'database_deleted', attachmentKeys: job.attachmentKeys, lastError: null },
            tx,
          );
          await store.logs.create(
            { actorId: job.actorId, action: 'student.database_deleted', targetId: job.studentId },
            tx,
          );
        });
        job.stage = 'database_deleted';
      }
      if (job.stage === 'database_deleted') {
        for (const key of job.attachmentKeys || []) {
          if (!/^[a-f0-9-]+\.(pdf|docx|doc|png|jpg|txt)$/.test(key))
            throw new Error('Invalid attachment key');
          await fs.rm(path.join(config.uploadDir, key), { force: true });
        }
        await store.jobs.update(job._id, { stage: 'files_deleted' });
        job.stage = 'files_deleted';
      }
      if (job.stage === 'files_deleted') {
        await store.logs.create({
          actorId: job.actorId,
          action: 'student.deleted',
          targetId: job.studentId,
          metadata: { databaseDeleted: true, filesDeleted: true },
        });
        await store.jobs.remove(job._id);
      }
      return { id: String(id), status: 'completed' };
    } catch (error) {
      const attempts = (job.attempts || 0) + 1;
      await store.jobs.update(job._id, {
        attempts,
        lockedAt: null,
        nextAttemptAt: new Date(Date.now() + Math.min(900000, 15000 * 2 ** Math.min(attempts, 6))),
        lastError: 'Cleanup step failed; automatic retry scheduled. No contact details retained.',
      });
      console.error(
        JSON.stringify({
          level: 'error',
          event: 'account_deletion_retry',
          jobId: String(id),
          attempts,
          stage: job.stage,
        }),
      );
      return { id: String(id), status: 'processing', retryScheduled: true };
    }
  }

  async function processDue() {
    if (running) return;
    running = true;
    try {
      for (const job of await store.jobs.due()) await processJob(job._id);
    } finally {
      running = false;
    }
  }

  return {
    enqueue,
    processJob,
    processDue,
    async deleteStudent(user, actorId) {
      const job = await enqueue(user, actorId);
      const result = await processJob(job._id);
      return result || { id: String(job._id), status: 'processing' };
    },
    start() {
      if (!timer) {
        timer = setInterval(() => processDue().catch(() => {}), 15000);
        timer.unref();
      }
    },
    stop() {
      clearInterval(timer);
      timer = null;
    },
  };
}
