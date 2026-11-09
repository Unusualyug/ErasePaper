import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import config from '../config/env.js';
import { AppError } from '../utils/errors.js';
import { hashPassword, verifyPassword } from '../utils/passwords.js';
import { phoneSchema } from '../utils/validators.js';
import { publicUser } from '../utils/serializers.js';
import { sendPasswordResetEmail, sendWelcomeEmail } from '../services/email.js';

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
const forgotPasswordSchema = z.object({ email: emailSchema }).strict();
const isStrongResetPassword = (password) => {
  const categories = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9\s]/].filter((pattern) => pattern.test(password));
  return /\S/.test(password) && (password.length >= 12 || (password.length >= 8 && categories.length >= 3));
};
const resetPasswordSchema = z
  .object({
    token: z.string().min(1).max(128),
    newPassword: z
      .string()
      .min(8, 'Use a password with at least 8 characters.')
      .max(128, 'Use no more than 128 characters.')
      .refine(
        isStrongResetPassword,
        'Use 12+ characters, or use 8+ characters with at least three of lowercase, uppercase, number, and symbol.',
      ),
    confirmPassword: z.string().min(1).max(128),
  })
  .strict()
  .refine((input) => input.newPassword === input.confirmPassword, {
    path: ['confirmPassword'],
    message: 'The passwords do not match.',
  });
const PASSWORD_RESET_TTL_MS = 20 * 60 * 1000;
const PASSWORD_RESET_CONFIRMATION =
  'If an account exists for that email, we will send a password reset link shortly.';

export function createAuthController(store, auth) {
  const dummyHashPromise = hashPassword(randomBytes(24).toString('hex'));

  return {
    async register(req, res) {
      const input = registerSchema.parse(req.body);
      const usernameNormalized = input.username.toLocaleLowerCase('en-US');
      const email = input.email.trim();
      const emailNormalized = email.toLocaleLowerCase('en-US');
      const [existingUsername, existingEmails] = await Promise.all([
        store.users.findByUsernameNormalized(usernameNormalized),
        store.users.findByEmailNormalized(emailNormalized),
      ]);
      if (existingUsername || existingEmails.length)
        throw new AppError(409, 'That username or email is already registered.', 'ACCOUNT_CONFLICT');

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
          throw new AppError(409, 'That username or email is already registered.', 'ACCOUNT_CONFLICT');
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
      void sendWelcomeEmail(user);
      res.status(201).json({ user: publicUser(user), mode: config.demo ? 'demo' : 'live' });
    },

    async forgotPassword(req, res) {
      const startedAt = Date.now();
      const input = forgotPasswordSchema.parse(req.body);
      const emailNormalized = input.email.trim().toLocaleLowerCase('en-US');
      const matches = await store.users.findByEmailNormalized(emailNormalized);
      const user = matches.length === 1 ? matches[0] : null;

      if (user?.email && user.state === 'active') {
        try {
          const token = randomBytes(32).toString('base64url');
          const tokenHash = createHash('sha256').update(token).digest('hex');
          const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
          await store.passwordResetTokens.replaceForUser(user._id, { tokenHash, expiresAt });
          const origin = config.origins[0] || 'https://erasepaper.online';
          const resetUrl = new URL('/reset-password', origin);
          resetUrl.searchParams.set('token', token);
          void sendPasswordResetEmail({
            user: { username: user.username, email: user.email },
            resetUrl: resetUrl.toString(),
            expiresMinutes: 20,
          }).catch(() => {});
        } catch {
          console.error(
            JSON.stringify({
              level: 'error',
              event: 'password_reset_request_failed',
              reason: 'reset_setup_failed',
            }),
          );
        }
      }

      // Keep the response shape and minimum response time the same for known and unknown addresses.
      const remainingDelay = 200 - (Date.now() - startedAt);
      if (remainingDelay > 0) await new Promise((resolve) => setTimeout(resolve, remainingDelay));
      res.json({ message: PASSWORD_RESET_CONFIRMATION });
    },

    async resetPassword(req, res) {
      const input = resetPasswordSchema.parse(req.body);
      const tokenHash = createHash('sha256').update(input.token).digest('hex');
      const passwordHash = await hashPassword(input.newPassword);
      const now = new Date();

      const userId = await store.withTransaction(async (tx) => {
        const resetToken = await store.passwordResetTokens.consume(tokenHash, now, tx);
        if (!resetToken) return null;
        const user = await store.users.findById(resetToken.userId, tx);
        if (!user || user.state !== 'active') return null;

        const updated = await store.users.update(user._id, { passwordHash }, tx);
        if (!updated) return null;
        await store.sessions.removeForUser(user._id, tx);
        await store.passwordResetTokens.deleteForUser(user._id, tx);
        return String(user._id);
      });

      if (!userId)
        throw new AppError(
          400,
          'This password reset link is invalid or has expired. Request a new one.',
          'INVALID_RESET_TOKEN',
        );

      res.json({ success: true, message: 'Your password has been successfully updated.' });
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
