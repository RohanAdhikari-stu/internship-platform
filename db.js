// ============================================================
//  db.js  —  Single source of truth for CIHE Internship App
//  All reads/writes go through these helpers so data stays
//  consistent between localStorage and in-memory state.
// ============================================================

const DB_KEYS = {
  USER:         'cihe_user',
  STUDENTS:     'cihe_students',
  INTERNSHIPS:  'cihe_internships',
};

// ---------- seed data (used only on first load) ----------
const SEED_INTERNSHIPS = [
  { id: 1, title: 'Frontend Developer Intern', company: 'TechNova',      status: 'Approved', skills: ['React','CSS','JavaScript'],       match: 94, salary: '$2000–$2500/month', type: 'Full Time', schedule: 'Weekdays',             duration: '3–6 months', description: 'Join our frontend team to build responsive, modern web applications using React. You\'ll work alongside senior devs and ship real features.', requirements: 'Basic knowledge of React, HTML, CSS, and JavaScript.', location: 'San Francisco, CA', postedDate: '2026-04-15' },
  { id: 2, title: 'Business Analyst',          company: 'DataBridge',     status: 'Approved', skills: ['SQL','Excel','Analytics'],         match: 82, salary: '$1800–$2200/month', type: 'Part Time', schedule: 'Weekdays & Weekends', duration: '2–4 months', description: 'Analyse business processes and data to surface actionable insights. Work directly with our analytics team on live client projects.', requirements: 'Knowledge of SQL, Excel, and data analysis fundamentals.', location: 'New York, NY',     postedDate: '2026-04-10' },
  { id: 3, title: 'UI/UX Designer Intern',     company: 'Creative Co',    status: 'Pending',  skills: ['Figma','Adobe XD','Design'],       match: 75, salary: '$1500–$1900/month', type: 'Casual',    schedule: 'Flexible',             duration: '1–3 months', description: 'Create beautiful, user-friendly interfaces for mobile and web. Collaborate closely with our product designers on high-visibility features.',   requirements: 'Proficiency in Figma or Adobe XD and strong UI/UX principles.',  location: 'Los Angeles, CA',  postedDate: '2026-04-12' },
  { id: 4, title: 'Backend Developer Intern',  company: 'CloudSystems',   status: 'Approved', skills: ['Node.js','MongoDB','REST API'],    match: 88, salary: '$2200–$2700/month', type: 'Full Time', schedule: 'Weekdays',             duration: '4–6 months', description: 'Build robust backend services and REST APIs. Contribute to a modern microservices architecture and grow your skills fast.',                   requirements: 'Familiarity with Node.js, a database (SQL or NoSQL), and REST APIs.', location: 'Austin, TX',       postedDate: '2026-04-18' },
  { id: 5, title: 'Marketing Analyst Intern',  company: 'BrandSync',      status: 'Approved', skills: ['Marketing','Analytics','Social'],  match: 79, salary: '$1600–$2000/month', type: 'Part Time', schedule: 'Weekdays & Weekends', duration: '2–3 months', description: 'Support live marketing campaigns and measure their effectiveness. Learn digital strategy from an experienced growth team.',                  requirements: 'Interest in marketing and basic analytics knowledge.',           location: 'Boston, MA',       postedDate: '2026-04-20' },
];

// ---------- internships ----------
function getInternships() {
  const stored = localStorage.getItem(DB_KEYS.INTERNSHIPS);
  return stored ? JSON.parse(stored) : [...SEED_INTERNSHIPS];
}
function saveInternships(list) {
  localStorage.setItem(DB_KEYS.INTERNSHIPS, JSON.stringify(list));
}
function addInternship(job) {
  const list = getInternships();
  list.push(job);
  saveInternships(list);
  return list;
}
function updateInternship(id, patch) {
  const list = getInternships().map(i => i.id === id ? { ...i, ...patch } : i);
  saveInternships(list);
  return list;
}

// ---------- students ----------
function getStudents() {
  const stored = localStorage.getItem(DB_KEYS.STUDENTS);
  return stored ? JSON.parse(stored) : {};
}
function saveStudents(map) {
  localStorage.setItem(DB_KEYS.STUDENTS, JSON.stringify(map));
}
function getStudent(email) {
  return getStudents()[email] || null;
}
function upsertStudent(email, patch) {
  const map = getStudents();
  map[email] = { ...(map[email] || { email, appliedInternships: [], createdAt: new Date().toISOString() }), ...patch, updatedAt: new Date().toISOString() };
  saveStudents(map);
  return map[email];
}
function applyToInternship(email, internshipId) {
  const map = getStudents();
  if (!map[email]) return { ok: false, msg: 'Profile not found.' };
  if (!map[email].appliedInternships) map[email].appliedInternships = [];
  if (map[email].appliedInternships.includes(internshipId)) return { ok: false, msg: 'Already applied.' };
  map[email].appliedInternships.push(internshipId);
  saveStudents(map);
  return { ok: true };
}

// ---------- session ----------
function getUser() {
  const stored = localStorage.getItem(DB_KEYS.USER);
  return stored ? JSON.parse(stored) : null;
}
function saveUser(user) {
  localStorage.setItem(DB_KEYS.USER, JSON.stringify(user));
}
function clearUser() {
  localStorage.removeItem(DB_KEYS.USER);
}

// ---------- role detection ----------
function detectRoleFromEmail(email) {
  const e = email.toLowerCase();
  if (e.includes('admin'))    return 'admin';
  if (e.includes('employer')) return 'employer';
  return 'student';
}
