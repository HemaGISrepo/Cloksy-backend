// routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid email' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid password' });

    const token = jwt.sign(
      { email: user.email, isAdmin: user.isAdmin },
      process.env.JWT_SECRET
    );

    // ✅ Return `isAdmin` in the response JSON too
    res.json({
      token,
      email: user.email,
      role: user.role,
      isAdmin: user.isAdmin  // <-- This is what frontend checks
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
