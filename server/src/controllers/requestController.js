import path from 'node:path';
import { z } from 'zod';
import config from '../config/env.js';
import { SERVICES, getService } from '../config/services.js';
import {
  newRequestSchema,
  requestQuerySchema,
  updateRequestSchema,
  idSchema,
  validateRequestFields,
} from '../utils/validators.js';
import { publicRequest } from '../utils/serializers.js';
import { AppError } from '../utils/errors.js';
import { saveAttachments, removeAttachments } from '../services/uploads.js';

export function createRequestController(store) {
  async function accessible(id, user) {
    idSchema.parse(id);
    const request = await store.requests.findById(id, true);
    if (
      !request ||
      (user.role !== 'admin' && String(request.userId?._id || request.userId) !== String(user._id))
    )
      throw new AppError(404, 'Request not found.', 'NOT_FOUND');
    return request;
  }
  return {
    async services(req, res) {
      res.json({ services: await store.services.list() });
    },
    async create(req, res) {
      let attachments = [];
      try {
        let details = req.body.details;
        if (typeof details === 'string') {
          try {
            details = JSON.parse(details);
          } catch {
            throw new AppError(400, 'Invalid request details.');
          }
        }
        const input = newRequestSchema.parse({
          ...req.body,
          details,
          integrityAcknowledged:
            req.body.integrityAcknowledged === true || req.body.integrityAcknowledged === 'true',
        });
        const service = getService(input.serviceSlug);
        if (!service) throw new AppError(400, 'Choose an available service.');
        try {
          validateRequestFields(service, input.details);
        } catch (error) {
          throw new AppError(400, error.message);
        }
        const allowed = Object.fromEntries(service.fields.map((f) => [f.key, input.details[f.key]]));
        attachments = await saveAttachments(req.files);
        const request = await store.withTransaction(async (tx) => {
          // Serialize with account deletion: the deletion transaction changes active -> deleting.
          const activeUser = await store.users.findById(req.user._id, tx);
          if (!activeUser || activeUser.state !== 'active')
            throw new AppError(401, 'This account is no longer available.', 'ACCOUNT_UNAVAILABLE');
          await store.users.update(activeUser._id, { updatedAt: new Date() }, tx);
          const created = await store.requests.create(
            {
              ...input,
              details: Object.fromEntries(Object.entries(allowed).filter(([, v]) => v !== undefined)),
              userId: String(req.user._id),
              serviceType: service.name,
              attachments,
              integrityAcknowledgedAt: new Date(),
            },
            tx,
          );
          await store.notifications.create(
            {
              type: 'request',
              title: 'New service request',
              message: `${service.shortName} · ${created.requestId}`,
              relatedRequestId: String(created._id),
              relatedUserId: String(req.user._id),
            },
            tx,
          );
          await store.logs.create(
            {
              actorId: String(req.user._id),
              action: 'request.created',
              targetId: created.requestId,
              metadata: { service: service.slug },
            },
            tx,
          );
          return created;
        });
        res.status(201).json({ request: publicRequest(request) });
      } catch (error) {
        await removeAttachments(attachments);
        throw error;
      }
    },
    async list(req, res) {
      const query = requestQuerySchema.parse(req.query);
      const result = await store.requests.list({ ...query, userId: String(req.user._id) });
      res.json({ ...result, items: result.items.map((r) => publicRequest(r)) });
    },
    async summary(req, res) {
      res.json({ stats: await store.requestSummary(req.user._id) });
    },
    async detail(req, res) {
      res.json({
        request: publicRequest(await accessible(req.params.id, req.user), req.user.role === 'admin'),
      });
    },
    async cancel(req, res) {
      idSchema.parse(req.params.id);
      const updated = await store.withTransaction(async (tx) => {
        const request = await store.requests.findById(req.params.id, true, tx);
        if (!request || String(request.userId?._id || request.userId) !== String(req.user._id))
          throw new AppError(404, 'Request not found.', 'NOT_FOUND');
        if (request.status !== 'Pending')
          throw new AppError(
            409,
            'Only pending requests can be cancelled. Contact the administrator for help.',
          );
        const result = await store.requests.update(request._id, { status: 'Cancelled' }, tx);
        await store.notifications.create(
          {
            type: 'status',
            title: 'Request cancelled',
            message: `${request.requestId} was cancelled by the student.`,
            relatedRequestId: String(request._id),
            relatedUserId: String(req.user._id),
          },
          tx,
        );
        await store.logs.create(
          { actorId: String(req.user._id), action: 'request.cancelled', targetId: request.requestId },
          tx,
        );
        return result;
      });
      res.json({ request: publicRequest(updated) });
    },
    async attachment(req, res) {
      const request = await accessible(req.params.id, req.user);
      const attachment = request.attachments?.find((a) => a.id === req.params.attachmentId);
      if (!attachment) throw new AppError(404, 'Attachment not found.');
      const key = attachment.storageName;
      if (!/^[a-f0-9-]+\.(pdf|docx|doc|png|jpg|txt)$/.test(key))
        throw new AppError(400, 'Invalid attachment.');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
      res.download(path.join(config.uploadDir, key), attachment.name, (error) => {
        if (error && !res.headersSent) res.status(404).json({ error: 'Attachment not available.' });
      });
    },
    async adminList(req, res) {
      const query = requestQuerySchema.parse(req.query);
      const result = await store.requests.list(query);
      res.json({ ...result, items: result.items.map((r) => publicRequest(r, true)) });
    },
    async adminUpdate(req, res) {
      idSchema.parse(req.params.id);
      const input = updateRequestSchema.parse(req.body);
      const updated = await store.withTransaction(async (tx) => {
        const request = await store.requests.findById(req.params.id, true, tx);
        if (!request) throw new AppError(404, 'Request not found.', 'NOT_FOUND');
        const result = await store.requests.update(request._id, input, tx);
        if (input.status && input.status !== request.status) {
          await store.notifications.create(
            {
              recipientRole: 'student',
              recipientId: String(request.userId?._id || request.userId),
              type: 'status',
              title: `Your request is ${input.status.toLowerCase()}`,
              message: `${request.requestId} · ${request.serviceType}`,
              relatedRequestId: String(request._id),
              relatedUserId: String(request.userId?._id || request.userId),
            },
            tx,
          );
          await store.logs.create(
            {
              actorId: String(req.user._id),
              action: 'request.status_updated',
              targetId: request.requestId,
              metadata: { from: request.status, to: input.status },
            },
            tx,
          );
        }
        if (input.adminNotes !== undefined && input.adminNotes !== request.adminNotes)
          await store.logs.create(
            { actorId: String(req.user._id), action: 'request.notes_updated', targetId: request.requestId },
            tx,
          );
        return result;
      });
      res.json({ request: publicRequest(updated, true) });
    },
  };
}
