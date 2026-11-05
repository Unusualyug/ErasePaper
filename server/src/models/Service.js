import mongoose from 'mongoose';
const schema = new mongoose.Schema(
  {
    slug: { type: String, unique: true },
    number: String,
    name: String,
    shortName: String,
    description: String,
    icon: String,
    color: String,
    tagline: String,
    features: [String],
    highlight: String,
    fields: [mongoose.Schema.Types.Mixed],
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);
export default mongoose.model('Service', schema);
