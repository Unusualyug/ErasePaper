import { createHmac, randomBytes } from 'node:crypto';
import config from '../config/env.js';
import { AppError, asyncHandler } from '../utils/errors.js';

export const SESSION_COOKIE = 'ep_session';
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const cookieOptions = () => ({
  httpOnly: true,
  secure: config.production,
  sameSite: 'lax',
  path: '/api',
});
const tokenHash = (token) => createHmac('sha256', config.sessionSecret).update(token).digest('hex');

function readCookie(req, name) {
  const cookies = req.headers.cookie || '';
  for (const item of cookies.split(';')) {
    const separator = item.indexOf('=');
    if (separator < 0 || item.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(item.slice(separator + 1).trim());
    } catch {
      return '';
    }
  }
  return '';
}

export function createAuthProvider(store) {
  async function resolve(req) {
    const token = readCookie(req, SESSION_COOKIE);
    if (!token || token.length > 256) return null;
    const hash = tokenHash(token);
    const session = await store.sessions.findByTokenHash(hash);
    if (!session) return null;
    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      await store.sessions.removeByTokenHash(hash);
      return null;
    }
    const user = await store.users.findById(session.userId);
    if (!user || user.state !== 'active') {
      await store.sessions.removeByTokenHash(hash);
      return null;
    }
    return { token, hash, user };
  }

  return {
    async createSession(user, res) {
      const token = randomBytes(32).toString('base64url');
      const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
      await store.sessions.create({ tokenHash: tokenHash(token), userId: user._id, expiresAt });
      res.cookie(SESSION_COOKIE, token, { ...cookieOptions(), expires: expiresAt });
    },
    async destroySession(req, res) {
      const token = readCookie(req, SESSION_COOKIE);
      if (token && token.length <= 256) await store.sessions.removeByTokenHash(tokenHash(token));
      res.clearCookie(SESSION_COOKIE, cookieOptions());
    },
    optionalAuthenticate: asyncHandler(async (req, res, next) => {
      const session = await resolve(req);
      req.user = session?.user || null;
      next();
    }),
    authenticate: asyncHandler(async (req, res, next) => {
      const session = await resolve(req);
      if (!session) throw new AppError(401, 'Please sign in to continue.', 'AUTH_REQUIRED');
      req.user = session.user;
      next();
    }),
    requireAdmin: (req, res, next) => {
      if (!req.user || req.user.state !== 'active')
        return next(new AppError(401, 'Please sign in to continue.', 'AUTH_REQUIRED'));
      if (req.user.role !== 'admin')
        return next(new AppError(403, 'Administrator access required.', 'ADMIN_REQUIRED'));
      next();
    },
  };
}
