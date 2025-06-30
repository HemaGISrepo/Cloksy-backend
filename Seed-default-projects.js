// Backend/seed-default-projects.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Project = require('./models/Project');

dotenv.config();

const defaultProjects = [
  { name: 'PTO', department: 'general', status: 'Active' },
  { name: 'Company Holiday', department: 'general', status: 'Active' },
  { name: 'Company Event', department: 'general', status: 'Active' }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    for (const proj of defaultProjects) {
      const exists = await Project.findOne({ name: proj.name });
      if (!exists) {
        await new Project(proj).save();
        console.log(`✅ Inserted project: ${proj.name}`);
      } else {
        console.log(`ℹ️ Already exists: ${proj.name}`);
      }
    }
    process.exit();
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}
seed();
