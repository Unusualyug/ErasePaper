import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    visitorKey: { type: String, required: true, unique: true, select: false },
    revokedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false },
);
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.AnalyticsRevocation || mongoose.model('AnalyticsRevocation', schema);
