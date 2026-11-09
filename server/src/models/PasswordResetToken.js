import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true, unique: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true, collection: 'password_reset_tokens_v1' },
);

export default mongoose.model('PasswordResetToken', schema);
