// routes/projects.js
const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const authMiddleware = require('../middleware/auth');

// Get all projects
router.get('/', authMiddleware, async (req, res) => {
  try {
    const projects = await Project.find();
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch projects' });
  }
});

// Add, update, delete routes already exist in your frontend — add them here if needed

module.exports = router;