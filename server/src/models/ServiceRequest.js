import mongoose from 'mongoose';
const attachment = new mongoose.Schema(
  { id: String, name: String, size: Number, mimeType: String, storageName: String },
  { _id: false },
);
const schema = new mongoose.Schema(
  {
    requestId: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    serviceSlug: { type: String, required: true, index: true },
    serviceType: { type: String, required: true },
    title: { type: String, required: true, maxlength: 160 },
    description: { type: String, required: true, maxlength: 6000 },
    additionalInfo: { type: String, default: '', maxlength: 3000 },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Completed', 'Cancelled'],
      default: 'Pending',
      index: true,
    },
    adminNotes: { type: String, default: '', maxlength: 6000 },
    attachments: { type: [attachment], default: [] },
    integrityAcknowledgedAt: Date,
  },
  { timestamps: true, collection: 'local_service_requests_v2' },
);
schema.index({ createdAt: -1 });
export default mongoose.model('ServiceRequest', schema);
