import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    studentId: { type: String, required: true, unique: true },
    username: { type: String, required: true, trim: true, minlength: 3, maxlength: 32 },
    usernameNormalized: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true, select: false },
    fullName: { type: String, required: true, maxlength: 100 },
    phoneNumber: { type: String, required: true, unique: true },
    email: { type: String, default: '' },
    emailNormalized: { type: String, unique: true, sparse: true, maxlength: 254 },
    role: { type: String, enum: ['student', 'admin'], default: 'student' },
    state: { type: String, enum: ['active', 'deleting'], default: 'active' },
    lastLoginAt: Date,
  },
  { timestamps: true, collection: 'local_users_v2' },
);
schema.index({ fullName: 'text', username: 'text', email: 'text', phoneNumber: 'text' });
export default mongoose.model('User', schema);
