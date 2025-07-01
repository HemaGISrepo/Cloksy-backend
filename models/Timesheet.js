// models/Timesheet.js
const mongoose = require('mongoose');

const TimesheetSchema = new mongoose.Schema({
  email: String,
  weekStart: String,
  department: String,
  project: String,
  hours: [Number]
});

module.exports = mongoose.model('Timesheet', TimesheetSchema);
