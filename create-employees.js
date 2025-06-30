const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const User = require('./models/User');

dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const employees = JSON.parse(fs.readFileSync('employees.json', 'utf-8'));

  for (const emp of employees) {
    const exists = await User.findOne({ email: emp.email });
    if (exists) {
      console.log(`⚠️  Skipping ${emp.email} (already exists)`);
      continue;
    }

    const user = new User({
      email: emp.email,
      password: emp.password,
      role: 'employee'
    });

    await user.save();
    console.log(`✅ Created: ${emp.email}`);
  }

  console.log('🎉 All users processed');
  process.exit();
}).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});