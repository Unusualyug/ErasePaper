import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    dayKey: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    pageKey: { type: String, required: true, maxlength: 80 },
    pageViews: { type: Number, required: true, min: 0, default: 0 },
    retentionAt: { type: Date, required: true },
  },
  { versionKey: false },
);
schema.index({ dayKey: 1, pageKey: 1 }, { unique: true });
schema.index({ pageKey: 1, dayKey: -1 });
schema.index({ retentionAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.AnalyticsPageView || mongoose.model('AnalyticsPageView', schema);
