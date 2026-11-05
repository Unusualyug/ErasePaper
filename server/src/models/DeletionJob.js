import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true },
    studentId: String,
    actorId: String,
    stage: {
      type: String,
      enum: ['pending', 'database_deleted', 'files_deleted', 'completed'],
      default: 'pending',
    },
    attachmentKeys: [String],
    attempts: { type: Number, default: 0 },
    nextAttemptAt: { type: Date, default: Date.now },
    lastError: String,
    lockedAt: Date,
  },
  { timestamps: true, collection: 'local_deletion_jobs_v2' },
);
schema.index({ stage: 1, nextAttemptAt: 1 });
export default mongoose.model('DeletionJob', schema);
