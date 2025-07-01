const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  client: { type: String },
  department: { type: String, required: true },
  status: { type: String, enum: ['Active', 'Hold', 'Complete'], default: 'Active' }
});

module.exports = mongoose.model('Project', ProjectSchema);
