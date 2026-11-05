import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    sessionKey: { type: String, required: true, unique: true, select: false },
    visitorKey: { type: String, required: true, index: true, select: false },
    userType: { type: String, enum: ['anonymous', 'student', 'admin'], required: true },
    lastSeenAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false },
);
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
schema.index({ lastSeenAt: -1 });

export default mongoose.models.AnalyticsPresence || mongoose.model('AnalyticsPresence', schema);
