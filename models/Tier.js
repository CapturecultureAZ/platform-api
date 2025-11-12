const mongoose = require('mongoose');
const TierSchema = new mongoose.Schema({
  tier: { type: String, required: true, unique: true, lowercase: true, trim: true },
  url:  { type: String, required: true, trim: true }
}, { timestamps: true });
module.exports = mongoose.models.Tier || mongoose.model('Tier', TierSchema);
