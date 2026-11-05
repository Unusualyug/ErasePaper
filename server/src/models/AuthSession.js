import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true, collection: 'auth_sessions_v2' },
);

export default mongoose.model('AuthSession', schema);
