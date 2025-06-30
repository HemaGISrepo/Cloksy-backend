// routes/timesheet.js

const express    = require('express');
const Timesheet  = require('../models/Timesheet');
const Department = require('../models/Department');
const Project    = require('../models/Project');
const ExcelJS    = require('exceljs');
const auth       = require('../middleware/auth');
const router     = express.Router();

// ─── Helpers ────────────────────────────────────────────────────────
// Normalize email (lowercase + trim)
function normalizeEmail(email) {
  return String(email || '').toLowerCase().trim();
}
// Align any YYYY-MM-DD string to its Monday (string)
function alignToMonday(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const wd = dt.getDay() || 7;       // Sunday=7
  dt.setDate(dt.getDate() - (wd - 1));
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

// ─── GET /departments ──────────────────────────────────────────────
router.get('/departments', auth, async (req, res) => {
  try {
    const depts = await Department.find();
    res.json(depts);
  } catch (err) {
    console.error('❌ Fetch departments failed:', err);
    res.status(500).json({ message: 'Server error while fetching departments' });
  }
});

// ─── POST / — Save or update a timesheet entry ──────────────────────
router.post('/', auth, async (req, res) => {
  const email      = normalizeEmail(req.user.email);
  let { weekStart, hours, project } = req.body;
  weekStart       = alignToMonday(weekStart);
  project         = String(project || '').trim();

  console.log('📥 POST /timesheet', { email, weekStart, project, hours });
  if (!weekStart || !project) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const projDoc    = await Project.findOne({ name: project });
    const department = projDoc?.department || 'Unknown';
    const existing   = await Timesheet.findOne({ email, weekStart, project });
    const isZero     = Array.isArray(hours) && hours.every(h => !h);

    if (existing) {
      if (isZero) {
        await existing.deleteOne();
        console.log('🗑️ Deleted zero-hour entry:', project);
        return res.json({ message: 'Timesheet entry deleted' });
      }
      existing.hours      = hours;
      existing.department = department;
      await existing.save();
      console.log('💾 Updated entry:', project);
      return res.json({ message: 'Timesheet updated' });
    }

    if (isZero) {
      console.log('⏩ Skipped zero-hour for new project:', project);
      return res.json({ message: 'No hours logged — nothing saved' });
    }

    const entry = new Timesheet({ email, weekStart, hours, project, department });
    await entry.save();
    console.log('💾 Saved new entry:', project);
    res.json({ message: 'Timesheet saved' });
  } catch (err) {
    console.error('❌ Save error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── GET / — Fetch a single project’s timesheet for the week ─────────
router.get('/', auth, async (req, res) => {
  const email      = normalizeEmail(req.user.email);
  let { weekStart, project } = req.query;
  weekStart       = alignToMonday(weekStart);
  project         = String(project || '').trim();

  console.log('🔎 GET /timesheet', { email, weekStart, project });
  try {
    const entry = await Timesheet.findOne({ email, weekStart, project });
    res.json(entry || {});
  } catch (err) {
    console.error('❌ Fetch single entry error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── GET /week-summary — Calculate total hours for the week ─────────
router.get('/week-summary', auth, async (req, res) => {
  const email      = normalizeEmail(req.user.email);
  let { weekStart } = req.query;
  weekStart       = alignToMonday(weekStart);

  console.log('🔎 GET /week-summary', { email, weekStart });
  try {
    const entries = await Timesheet.find({ email, weekStart });
    const total   = entries.reduce((sum, e) =>
      sum + (Array.isArray(e.hours) ? e.hours.reduce((a, b) => a + b, 0) : 0)
    , 0);
    res.json({ total: total.toFixed(1) });
  } catch (err) {
    console.error('❌ Week-summary error:', err);
    res.status(500).json({ message: 'Server error in summary' });
  }
});

// ─── GET /week-all — Fetch all entries for Copy Previous Week ───────
router.get('/week-all', auth, async (req, res) => {
  const rawWeek = req.query.weekStart;
  if (!rawWeek) {
    return res.status(400).json({ message: 'Missing weekStart' });
  }

  // treat weekStart as string-match (no Date conversion)
  const week  = rawWeek;
  const email = normalizeEmail(req.query.email || req.user.email);

  console.log('🔎 GET /week-all string-match', { week, email });

  try {
    const entries = await Timesheet.find({ email, weekStart: week }).lean();
    console.log('✅ /week-all found entries:', entries.length);
    return res.json(entries);
  } catch (err) {
    console.error('❌ /week-all error:', err);
    return res.status(500).json({ message: 'Failed to fetch week data' });
  }
});

// ─── GET /export — Export timesheet data to Excel ───────────────────
router.get('/export', auth, async (req, res) => {
  try {
    const { department, project, start, end } = req.query;
    const filter = { email: normalizeEmail(req.user.email) };
    if (department) filter.department = new RegExp(`^${department}$`, 'i');
    if (project)    filter.project    = new RegExp(`^${project}$`, 'i');
    if (start && end) filter.weekStart = { $gte: start, $lte: end };

    const entries = await Timesheet.find(filter)
      .sort({ project: 1 })
      .lean();
    if (!entries.length) {
      return res.status(404).json({ message: 'No timesheet data found' });
    }

    const allProjects = await Project.find({}, 'name department');
    const projMap = Object.fromEntries(
      allProjects.map(p => [p.name.trim().toLowerCase(), p.department])
    );

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Cloksy Admin';
    workbook.created = new Date();
    const sheet = workbook.addWorksheet('Timesheet Export');

    const isPTO = project?.toLowerCase() === 'pto';
    if (isPTO) {
      sheet.addRow(['Employee', 'PTO Date', 'Hrs']);
      entries.forEach(e => {
        const base = new Date(e.weekStart);
        e.hours.forEach((h, i) => {
          if (h > 0) {
            const d = new Date(base);
            d.setDate(d.getDate() + i);
            sheet.addRow([e.email, d.toLocaleDateString('en-GB'), h]);
          }
        });
      });
    } else {
      sheet.addRow(['Employee', 'Department', 'Project', 'Total Hrs']);
      entries.forEach(e => {
        const total = e.hours.reduce((a, b) => a + (b || 0), 0);
        if (!total) return;
        const dept = projMap[e.project.trim().toLowerCase()] || 'Unknown';
        sheet.addRow([e.email, dept, e.project, total]);
      });
    }

    sheet.columns.forEach(col => (col.width = 20));
    const filename = `Timesheet_${Date.now()}.xlsx`;
    res
      .type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .set('Content-Disposition', `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('❌ Export error:', err);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Failed to export timesheet' });
    } else {
      res.end();
    }
  }
});

module.exports = router;