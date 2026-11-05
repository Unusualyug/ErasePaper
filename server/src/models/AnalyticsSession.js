import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    sessionKey: { type: String, required: true, unique: true, select: false },
    visitorKey: { type: String, required: true, select: false },
    startedAt: { type: Date, required: true },
    lastSeenAt: { type: Date, required: true },
    userType: { type: String, enum: ['anonymous', 'student', 'admin'], required: true },
    device: { type: String, enum: ['mobile', 'tablet', 'desktop'], required: true },
    source: { type: String, enum: ['direct', 'search', 'social', 'referral', 'unknown'], required: true },
    expiresAt: { type: Date, required: true },
    retentionAt: { type: Date, required: true },
  },
  { versionKey: false },
);
schema.index({ startedAt: -1 });
schema.index({ visitorKey: 1, startedAt: -1 });
schema.index({ retentionAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.AnalyticsSession || mongoose.model('AnalyticsSession', schema);
