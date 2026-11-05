import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    visitorKey: { type: String, required: true, unique: true, select: false },
    firstSeenAt: { type: Date, required: true },
    lastSeenAt: { type: Date, required: true },
    retentionAt: { type: Date, required: true },
  },
  { versionKey: false },
);
schema.index({ retentionAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.AnalyticsVisitor || mongoose.model('AnalyticsVisitor', schema);
