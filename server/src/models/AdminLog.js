import mongoose from 'mongoose';
// Audit entries deliberately contain opaque IDs, never names, contact details or request requirements.
const schema = new mongoose.Schema(
  {
    actorId: String,
    action: String,
    targetId: String,
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, collection: 'local_admin_logs_v2' },
);
schema.index({ createdAt: -1 });
export default mongoose.model('AdminLog', schema);
