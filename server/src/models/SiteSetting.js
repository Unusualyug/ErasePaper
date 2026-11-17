import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    value: { type: String, required: true },
  },
  { timestamps: true, collection: 'local_site_settings_v1' },
);
schema.index({ key: 1 }, { unique: true });

export default mongoose.model('SiteSetting', schema);
