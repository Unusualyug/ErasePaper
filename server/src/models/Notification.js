import mongoose from 'mongoose';
const schema = new mongoose.Schema(
  {
    recipientRole: { type: String, enum: ['admin', 'student'], default: 'admin' },
    recipientId: { type: String, default: null },
    type: String,
    title: String,
    message: String,
    relatedRequestId: String,
    relatedUserId: String,
    readAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'local_notifications_v2' },
);
schema.index({ recipientRole: 1, readAt: 1, createdAt: -1 });
export default mongoose.model('Notification', schema);
