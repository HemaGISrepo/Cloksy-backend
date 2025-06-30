// routes/departments.js
const express = require('express');
const router = express.Router();
const Department = require('../models/Department');
const authMiddleware = require('../middleware/auth');

// GET /api/departments — accessible to all authenticated users
router.get('/', authMiddleware, async (req, res) => {
  try {
    const departments = await Department.find();
    res.json(departments);
  } catch (err) {
    console.error('❌ Failed to fetch departments:', err);
    res.status(500).json({ message: 'Server error while fetching departments' });
  }
});

module.exports = router;