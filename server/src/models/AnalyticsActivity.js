import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    visitorKey: { type: String, required: true, select: false },
    dayKey: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    firstSeenAt: { type: Date, required: true },
    retentionAt: { type: Date, required: true },
  },
  { versionKey: false },
);
schema.index({ visitorKey: 1, dayKey: 1 }, { unique: true });
schema.index({ dayKey: 1 });
schema.index({ retentionAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.AnalyticsActivity || mongoose.model('AnalyticsActivity', schema);
