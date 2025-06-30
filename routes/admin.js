const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Department = require('../models/Department');
const Project = require('../models/Project');
const Timesheet = require('../models/Timesheet');
const authenticate = require('../middleware/authenticate');
const ExcelJS = require('exceljs');

// --- Admin Access Middleware ---
function checkAdmin(req, res, next) {
  if (req.user && req.user.isAdmin && req.user.email.endsWith('@axial.energy')) {
    return next();
  }
  return res.status(403).json({ message: 'Admin access only' });
}

// ===================
// Department Routes
// ===================
router.get('/departments', authenticate, checkAdmin, async (req, res) => {
  const list = await Department.find().sort('name');
  res.json(list);
});

router.post('/departments', authenticate, checkAdmin, async (req, res) => {
  const dept = new Department({ name: req.body.name });
  await dept.save();
  res.json(dept);
});

router.put('/departments/:id', authenticate, checkAdmin, async (req, res) => {
  const d = await Department.findByIdAndUpdate(req.params.id, { name: req.body.name }, { new: true });
  res.json(d);
});

router.delete('/departments/:id', authenticate, checkAdmin, async (req, res) => {
  await Department.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

// ===================
// Project Routes
// ===================
router.get('/projects', authenticate, async (req, res) => {
  try {
    const list = await Project.find().sort('department name');
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load projects' });
  }
});

router.post('/projects', authenticate, checkAdmin, async (req, res) => {
  const proj = new Project({
    name: req.body.name,
    client: req.body.client || '',
    department: req.body.department,
    status: req.body.status
  });
  await proj.save();
  res.json(proj);
});

router.put('/projects/:id', authenticate, checkAdmin, async (req, res) => {
  const p = await Project.findByIdAndUpdate(req.params.id, {
    name: req.body.name,
    client: req.body.client || '',
    department: req.body.department,
    status: req.body.status
  }, { new: true });
  res.json(p);
});

router.delete('/projects/:id', authenticate, checkAdmin, async (req, res) => {
  await Project.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

// ==========================
// Admin: List All Users
// ==========================
router.get('/users', authenticate, checkAdmin, async (req, res) => {
  try {
    const users = await User.find({}, 'email role isAdmin');
    res.json(users);
  } catch (err) {
    console.error('Failed to fetch users:', err);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// ==========================
// Cleanup Duplicate Default Projects
// ==========================
router.get('/cleanup-duplicates', authenticate, checkAdmin, async (req, res) => {
  try {
    const defaultNames = ['PTO', 'Company Holiday', 'Company Event'];
    const all = await Project.find({ name: { $in: defaultNames } });

    const toKeep = {};
    const toDelete = [];

    for (const proj of all) {
      const name = proj.name;
      if (!toKeep[name]) {
        toKeep[name] = proj;
      } else {
        if (proj.department === 'general' && toKeep[name].department !== 'general') {
          toDelete.push(toKeep[name]._id);
          toKeep[name] = proj;
        } else {
          toDelete.push(proj._id);
        }
      }
    }

    await Project.deleteMany({ _id: { $in: toDelete } });
    res.json({ message: `🧹 Removed ${toDelete.length} duplicate special projects.` });
  } catch (err) {
    console.error('Cleanup error:', err);
    res.status(500).json({ message: 'Cleanup failed' });
  }
});

// ==========================
// Test Route
// ==========================
router.get('/test', (req, res) => res.send('✅ Admin routes connected'));

module.exports = router;