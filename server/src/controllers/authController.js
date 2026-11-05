import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import config from '../config/env.js';
import { AppError } from '../utils/errors.js';
import { hashPassword, verifyPassword } from '../utils/passwords.js';
import { phoneSchema } from '../utils/validators.js';
import { publicUser } from '../utils/serializers.js';

const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(32)
  .regex(/^[A-Za-z0-9][A-Za-z0-9_.-]{2,31}$/, 'Use 3–32 letters, numbers, dots, underscores, or hyphens.');
const emailSchema = z.string().trim().email().max(254);
const registerSchema = z
  .object({
    username: usernameSchema,
    email: emailSchema,
    phoneNumber: phoneSchema,
    password: z.string().min(7, 'Use a password with at least 7 characters.').max(128),
  })
  .strict();
const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1).max(128),
  })
  .strict();

export function createAuthController(store, auth) {
  const dummyHashPromise = hashPassword(randomBytes(24).toString('hex'));

  return {
    async register(req, res) {
      const input = registerSchema.parse(req.body);
      const usernameNormalized = input.username.toLocaleLowerCase('en-US');
      const email = input.email.trim();
      const emailNormalized = email.toLocaleLowerCase('en-US');
      const [existingUsername, existingPhone, existingEmails] = await Promise.all([
        store.users.findByUsernameNormalized(usernameNormalized),
        store.users.findByPhone(input.phoneNumber),
        store.users.findByEmailNormalized(emailNormalized),
      ]);
      if (existingUsername || existingPhone || existingEmails.length)
        throw new AppError(
          409,
          'That username, email, or mobile number is already registered.',
          'ACCOUNT_CONFLICT',
        );

      let user;
      try {
        const passwordHash = await hashPassword(input.password);
        user = await store.users.create({
          username: input.username,
          usernameNormalized,
          passwordHash,
          fullName: input.username,
          phoneNumber: input.phoneNumber,
          email,
          emailNormalized,
          role: 'student',
          state: 'active',
          lastLoginAt: new Date(),
        });
      } catch (error) {
        if (error.code === 11000)
          throw new AppError(
            409,
            'That username, email, or mobile number is already registered.',
            'ACCOUNT_CONFLICT',
          );
        throw error;
      }

      await store.notifications.create({
        type: 'registration',
        title: 'A new student joined',
        message: 'A new student account was created.',
        relatedUserId: String(user._id),
      });
      await store.logs.create({
        actorId: String(user._id),
        action: 'student.registered',
        targetId: user.studentId,
      });
      await auth.createSession(user, res);
      res.status(201).json({ user: publicUser(user), mode: config.demo ? 'demo' : 'live' });
    },

    async login(req, res) {
      const input = loginSchema.parse(req.body);
      const emailNormalized = input.email.trim().toLocaleLowerCase('en-US');
      const emailMatches = await store.users.findByEmailNormalized(emailNormalized);
      const user = emailMatches.length === 1 ? emailMatches[0] : null;
      const passwordHash = user?.passwordHash || (await dummyHashPromise);
      const matches = await verifyPassword(input.password, passwordHash);
      if (!user || !matches || user.state !== 'active')
        throw new AppError(401, 'Incorrect email or password.', 'INVALID_CREDENTIALS');

      const updated = await store.users.update(user._id, { lastLoginAt: new Date() });
      await auth.createSession(updated || user, res);
      res.json({ user: publicUser(updated || user), mode: config.demo ? 'demo' : 'live' });
    },

    async logout(req, res) {
      await auth.destroySession(req, res);
      res.json({ success: true });
    },

    async quickDemo(req, res) {
      if (!config.demo) throw new AppError(404, 'Not found.');
      z.object({ persona: z.literal('student') })
        .strict()
        .parse(req.body);
      const usernameNormalized = 'student_demo';
      const user = await store.users.findByUsernameNormalized(usernameNormalized);
      if (!user || user.state !== 'active') throw new AppError(404, 'Demo account is unavailable.');
      const updated = await store.users.update(user._id, { lastLoginAt: new Date() });
      await auth.createSession(updated || user, res);
      res.json({ user: publicUser(updated || user), mode: 'demo' });
    },
  };
}
