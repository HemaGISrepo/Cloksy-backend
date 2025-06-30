const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const timesheetRoutes = require('./routes/timesheet');
const adminRoutes = require('./routes/admin');
const departmentRoutes = require('./routes/departments'); // ✅ NEW
const projectRoutes = require('./routes/projects');
const userRoutes = require('./routes/users');


dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

app.use('/api/auth', authRoutes);
app.use('/api/timesheet', timesheetRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/departments', departmentRoutes); // ✅ NEW
app.use('/api/projects', projectRoutes);
app.use('/api/users', userRoutes);


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));