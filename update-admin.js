// update-admin.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const result = await User.findOneAndUpdate(
      { email: 'admin@cloksy.com' },
      { email: 'admin@axial.energy', isAdmin: true },
      { new: true }
    );

    console.log('✅ Admin user updated:', result);
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('❌ Update failed:', err);
    mongoose.disconnect();
  });
