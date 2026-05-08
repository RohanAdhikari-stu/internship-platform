const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, default: '' },
  phone: { type: String, default: '' },
  university: { type: String, default: '' },
  bio: { type: String, default: '' },
  skills: { type: [String], default: [] },
  appliedInternships: { type: [Number], default: [] },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() }
});

module.exports = mongoose.model('Student', studentSchema);
