// routes/users.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// Get all users (for export dropdown)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const users = await User.find({}, 'email'); // only return email
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

module.exports = router;