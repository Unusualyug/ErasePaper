import { z } from 'zod';
import { AppError } from '../utils/errors.js';
import { idSchema } from '../utils/validators.js';
import { readTeamPhoto, removeTeamPhoto, saveTeamPhoto } from '../services/teamPhotos.js';

const nameSchema = z.string().trim().min(1, 'Enter a team member name').max(100);
const createSchema = z.object({ name: nameSchema }).strict();
const updateSchema = z.object({ name: nameSchema.optional() }).strict();

function serializeMember(member) {
  const id = String(member._id);
  const version = new Date(member.photoUpdatedAt || member.updatedAt || member.createdAt).getTime();
  return {
    id,
    name: member.name,
    photoUrl: `/api/team/${encodeURIComponent(id)}/photo?v=${version}`,
    createdAt: member.createdAt,
    updatedAt: member.updatedAt,
  };
}

function logEntry(req, action, targetId, metadata = {}) {
  return {
    actorId: String(req.user._id),
    action,
    targetId: String(targetId),
    metadata,
  };
}

function logCleanupFailure(memberId) {
  return (error) =>
    console.error(
      JSON.stringify({
        level: 'error',
        event: 'team_photo_cleanup_failed',
        ...(memberId ? { teamMemberId: String(memberId) } : {}),
        code: error.code || 'FILE_CLEANUP_FAILED',
      }),
    );
}

export function createTeamController(store) {
  return {
    async publicList(req, res) {
      const members = await store.teamMembers.list();
      res.json({ members: members.map(serializeMember) });
    },

    async adminList(req, res) {
      const members = await store.teamMembers.list();
      res.json({ members: members.map(serializeMember) });
    },

    async photo(req, res) {
      const id = idSchema.parse(req.params.id);
      const member = await store.teamMembers.findById(id);
      if (!member) throw new AppError(404, 'Team photo not found.', 'NOT_FOUND');
      const image = await readTeamPhoto(member.photoStorageName);
      res.set({
        'Cache-Control': 'public, max-age=86400',
        'Content-Type': member.photoMimeType,
        'Content-Disposition': 'inline',
        'Last-Modified': new Date(member.photoUpdatedAt).toUTCString(),
        'X-Content-Type-Options': 'nosniff',
      });
      res.send(image);
    },

    async create(req, res) {
      const { name } = createSchema.parse(req.body || {});
      if (!req.file) throw new AppError(400, 'Choose a team member photo.', 'PHOTO_REQUIRED');
      const photo = await saveTeamPhoto(req.file);
      let member;
      try {
        member = await store.withTransaction(async (tx) => {
          const created = await store.teamMembers.create({ name, ...photo }, tx);
          await store.logs.create(logEntry(req, 'team.member_created', created._id), tx);
          return created;
        });
      } catch (error) {
        await removeTeamPhoto(photo.photoStorageName).catch(logCleanupFailure(null));
        throw error;
      }
      res.status(201).json({ member: serializeMember(member) });
    },

    async update(req, res) {
      const id = idSchema.parse(req.params.id);
      const values = updateSchema.parse(req.body || {});
      const current = await store.teamMembers.findById(id);
      if (!current) throw new AppError(404, 'Team member not found.', 'NOT_FOUND');

      const nameChanged = values.name !== undefined && values.name !== current.name;
      if (!nameChanged && !req.file) {
        res.json({ member: serializeMember(current) });
        return;
      }

      const photo = req.file ? await saveTeamPhoto(req.file) : null;
      const changes = {
        ...(nameChanged ? { name: values.name } : {}),
        ...(photo || {}),
      };
      let member;
      try {
        member = await store.withTransaction(async (tx) => {
          const updated = await store.teamMembers.update(id, changes, tx);
          if (!updated) throw new AppError(404, 'Team member not found.', 'NOT_FOUND');
          await store.logs.create(
            logEntry(req, 'team.member_updated', id, { photoReplaced: Boolean(photo) }),
            tx,
          );
          return updated;
        });
      } catch (error) {
        if (photo) await removeTeamPhoto(photo.photoStorageName).catch(logCleanupFailure(id));
        throw error;
      }
      if (photo) await removeTeamPhoto(current.photoStorageName).catch(logCleanupFailure(id));
      res.json({ member: serializeMember(member) });
    },

    async remove(req, res) {
      const id = idSchema.parse(req.params.id);
      const current = await store.teamMembers.findById(id);
      if (!current) throw new AppError(404, 'Team member not found.', 'NOT_FOUND');
      await store.withTransaction(async (tx) => {
        const removed = await store.teamMembers.remove(id, tx);
        if (!removed) throw new AppError(404, 'Team member not found.', 'NOT_FOUND');
        await store.logs.create(logEntry(req, 'team.member_deleted', id), tx);
      });
      await removeTeamPhoto(current.photoStorageName).catch(logCleanupFailure(id));
      res.json({ removed: true });
    },
  };
}
