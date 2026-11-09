import config from '../config/env.js';
import { AppError } from '../utils/errors.js';
import { profileSchema } from '../utils/validators.js';
import { publicUser } from '../utils/serializers.js';

export function createProfileController(store) {
  return {
    async me(req, res) {
      res.json({ user: publicUser(req.user), mode: config.demo ? 'demo' : 'live' });
    },
    async update(req, res) {
      const input = profileSchema.parse(req.body);
      const values = { fullName: input.fullName };
      if (input.email !== undefined && input.email !== req.user.email) {
        const email = input.email.trim();
        if (!email) {
          if (req.user.email)
            throw new AppError(400, 'An email address is required for sign-in.', 'EMAIL_REQUIRED');
        } else {
          const emailNormalized = email.toLocaleLowerCase('en-US');
          const matches = await store.users.findByEmailNormalized(emailNormalized);
          if (matches.some((match) => String(match._id) !== String(req.user._id)))
            throw new AppError(409, 'That email is already registered.', 'EMAIL_CONFLICT');
          values.email = email;
          values.emailNormalized = emailNormalized;
        }
      }
      let user;
      try {
        if (values.emailNormalized !== undefined) {
          user = await store.withTransaction(async (tx) => {
            const updated = await store.users.update(req.user._id, values, tx);
            await store.passwordResetTokens.deleteForUser(req.user._id, tx);
            return updated;
          });
        } else {
          user = await store.users.update(req.user._id, values);
        }
      } catch (error) {
        if (error.code === 11000)
          throw new AppError(409, 'That email is already registered.', 'EMAIL_CONFLICT');
        throw error;
      }
      res.json({ user: publicUser(user) });
    },
  };
}
