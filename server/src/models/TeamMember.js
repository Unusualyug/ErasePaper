import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
    photoStorageName: {
      type: String,
      required: true,
      match: /^team-[0-9a-f-]{36}\.(?:jpe?g|png|webp)$/,
    },
    photoMimeType: { type: String, required: true, enum: ['image/jpeg', 'image/png', 'image/webp'] },
    photoUpdatedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true, collection: 'local_team_members_v1' },
);
schema.index({ createdAt: 1, _id: 1 });

export default mongoose.model('TeamMember', schema);
