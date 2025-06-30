const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const user = new User({
    email: 'admin@axial.energy',
    password: 'password123',
    role: 'employee'
  });
  await user.save();
  console.log('✅ User created');
  process.exit();
});
