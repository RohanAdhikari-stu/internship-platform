const mongoose = require('mongoose');

const internshipSchema = new mongoose.Schema({
    title: { type: String, required: true },
    company: { type: String, required: true },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    skills: [String],
    description: String,
    location: String,
    postedDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Internship', internshipSchema);
