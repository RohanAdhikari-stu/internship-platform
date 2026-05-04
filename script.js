// ============================================================
//  script.js  —  CIHE Internship Platform  (all logic)
//  Depends on db.js being loaded first.
// ============================================================

// ── App state (runtime only; persistence lives in db.js) ──
let APP = {
  user:         null,
  internships:  [],
  activeNav:    null,   // label of the currently active nav button
};

// ── Boot ──────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  // Load internships from server instead of localStorage
  try {
    const response = await fetch('/api/internships');
    const data = await response.json();
    APP.internships = data;
    // Keep a local copy in sync so existing helpers still work
    saveInternships(data);
  } catch (err) {
    console.warn('Server unavailable, falling back to localStorage seed.');
    if (!localStorage.getItem('cihe_internships')) {
      saveInternships([...SEED_INTERNSHIPS]);
    }
    APP.internships = getInternships();
  }

  APP.user = getUser();

  // Wire up login form
  document.getElementById('loginForm').onsubmit = handleLogin;

  if (APP.user) {
    initDashboard();
  } else {
    showPage('landingPage');
  }
});

// ── Navigation ────────────────────────────────────────────
function showPage(id) {
  ['landingPage','loginPage','dashboardPage','internshipDetailsPage','profilePage']
    .forEach(p => document.getElementById(p)?.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
  window.scrollTo(0, 0);
}

function showLogin() { showPage('loginPage'); }

function goBack() {
  APP.user ? initDashboard() : showPage('landingPage');
}

// ── Auth ──────────────────────────────────────────────────
function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('emailInput').value.trim();
  if (!email) return;

  const role = detectRoleFromEmail(email);
  APP.user = { email, role };
  saveUser(APP.user);

  // Auto-create student profile on first login
  if (role === 'student' && !getStudent(email)) {
    upsertStudent(email, { name: '', phone: '', bio: '', skills: [] });
  }

  initDashboard();
}

function logout() {
  clearUser();
  APP.user = null;
  const btn = document.getElementById('authBtn');
  btn.textContent = 'Login';
  btn.onclick = showLogin;
  showPage('landingPage');
}

// Role detection display while typing
function detectRole() {
  const email = document.getElementById('emailInput').value;
  const box   = document.getElementById('roleDetectionContainer');
  const disp  = document.getElementById('detectedRoleDisplay');
  if (email.length > 3) {
    box.classList.add('active');
    const labels = { admin: 'Career Services', employer: 'Employer', student: 'Student' };
    disp.textContent = labels[detectRoleFromEmail(email)];
  } else {
    box.classList.remove('active');
  }
}

// ── Dashboard shell ───────────────────────────────────────
function initDashboard() {
  APP.internships = getInternships();
  showPage('dashboardPage');
  const btn = document.getElementById('authBtn');
  btn.textContent = 'Logout';
  btn.onclick = logout;
  renderSidebar();
  renderDefaultContent();
}

function renderSidebar() {
  const NAV = {
    student:  [
      { label: 'Discover',         fn: renderDiscoverPage },
      { label: 'My Applications',  fn: renderMyApplications },
      { label: 'My Profile',       fn: showProfilePage },
    ],
    employer: [
      { label: 'Post Internship',  fn: renderPostInternship },
      { label: 'My Postings',      fn: renderMyPostings },
      { label: 'Candidates',       fn: renderCandidates },
    ],
    admin: [
      { label: 'Pending Approvals',fn: renderPendingApprovals },
      { label: 'Active Listings',  fn: renderActiveListings },
      { label: 'User Management',  fn: renderUserManagement },
    ],
  };

  const items = NAV[APP.user.role] || [];
  document.getElementById('navContainer').innerHTML = items.map(({ label }) =>
    `<button class="nav-item" onclick="activateNav(this, '${label}')">${label}</button>`
  ).join('');

  // Store fn references so activateNav can call them
  window._navFns = {};
  items.forEach(({ label, fn }) => { window._navFns[label] = fn; });
}

function activateNav(btn, label) {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  APP.activeNav = label;
  window._navFns[label]?.();
}

function renderDefaultContent() {
  // Click the first nav item programmatically
  const first = document.querySelector('.nav-item');
  if (first) first.click();
}

// ── STUDENT: Discover ─────────────────────────────────────
function renderDiscoverPage() {
  const c = document.getElementById('dashboardContent');

  c.innerHTML = `
    <div class="section-header">
      <h2>Discover Internships</h2>
      <p class="section-subtitle">Find your next opportunity</p>
    </div>

    <div class="filter-bar">
      <select id="filterType" onchange="applyFilters()">
        <option value="">All Types</option>
        <option>Full Time</option>
        <option>Part Time</option>
        <option>Casual</option>
      </select>
      <select id="filterSchedule" onchange="applyFilters()">
        <option value="">All Schedules</option>
        <option>Weekdays</option>
        <option>Weekdays & Weekends</option>
        <option>Flexible</option>
      </select>
      <input id="filterSearch" type="text" placeholder="🔍 Search title or company…" oninput="applyFilters()" />
    </div>

    <div id="internshipGrid" class="grid-3"></div>
  `;

  applyFilters();
}

function applyFilters() {
  const type     = document.getElementById('filterType')?.value     || '';
  const schedule = document.getElementById('filterSchedule')?.value || '';
  const search   = (document.getElementById('filterSearch')?.value  || '').toLowerCase();

  const approved = APP.internships.filter(i => i.status === 'Approved');
  const filtered = approved.filter(i =>
    (!type     || i.type === type) &&
    (!schedule || i.schedule === schedule) &&
    (!search   || i.title.toLowerCase().includes(search) || i.company.toLowerCase().includes(search))
  );

  const grid = document.getElementById('internshipGrid');
  if (!grid) return;

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>No internships match your filters.</p></div>`;
    return;
  }

  grid.innerHTML = filtered.map(item => `
    <div class="card internship-card">
      <div class="card-top">
        <span class="match-tag">${item.match}% Match</span>
        <span class="type-badge ${item.type.toLowerCase().replace(' ','-')}">${item.type}</span>
      </div>
      <h3 class="card-title">${item.title}</h3>
      <p class="company-name">🏢 ${item.company}</p>
      <div class="internship-meta">
        <span>📅 ${item.schedule}</span>
        <span>📍 ${item.location}</span>
        <span>⏱ ${item.duration}</span>
      </div>
      <p class="salary-info"><strong>${item.salary}</strong></p>
      <div class="skills-row">
        ${item.skills.slice(0,3).map(s => `<span class="skill-tag">${s}</span>`).join('')}
      </div>
      <div class="card-actions">
        <button class="btn primary" onclick="viewInternshipDetails(${item.id})">View Details</button>
        <button class="btn outline" onclick="applyInternship(${item.id})">Apply</button>
      </div>
    </div>
  `).join('');
}

// ── STUDENT: Internship Details ───────────────────────────
function viewInternshipDetails(id) {
  const internship = APP.internships.find(i => i.id === id);
  if (!internship) return;

  document.getElementById('internshipDetail').innerHTML = `
    <div class="detail-card">
      <div class="detail-header">
        <div>
          <h2>${internship.title}</h2>
          <p class="company-name">🏢 ${internship.company} &nbsp;•&nbsp; 📍 ${internship.location}</p>
        </div>
        <span class="match-tag large">${internship.match}% Match</span>
      </div>

      <div class="detail-pills">
        <span class="pill pill-blue">💼 ${internship.type}</span>
        <span class="pill pill-green">💵 ${internship.salary}</span>
        <span class="pill pill-orange">📅 ${internship.schedule}</span>
        <span class="pill pill-purple">⏱ ${internship.duration}</span>
      </div>

      <div class="detail-section">
        <h3>About This Internship</h3>
        <p>${internship.description}</p>
      </div>

      <div class="detail-section">
        <h3>Requirements</h3>
        <p>${internship.requirements}</p>
      </div>

      <div class="detail-section">
        <h3>Skills</h3>
        <div class="skills-row">
          ${internship.skills.map(s => `<span class="skill-tag">${s}</span>`).join('')}
        </div>
      </div>

      <div class="detail-actions">
        <button class="btn primary large" onclick="applyInternship(${internship.id})">Apply Now</button>
      </div>
    </div>
  `;
  showPage('internshipDetailsPage');
}

// ── STUDENT: Apply ────────────────────────────────────────
function applyInternship(id) {
  if (!APP.user) { showLogin(); return; }
  const result = applyToInternship(APP.user.email, id);
  if (!result.ok) {
    notify(result.msg, 'warn');
  } else {
    const job = APP.internships.find(i => i.id === id);
    notify(`Applied to ${job?.title}!`, 'success');
  }
}

// ── STUDENT: My Applications ──────────────────────────────
function renderMyApplications() {
  const c       = document.getElementById('dashboardContent');
  const student = getStudent(APP.user.email);
  const applied = student?.appliedInternships || [];
  const list    = APP.internships.filter(i => applied.includes(i.id));

  c.innerHTML = `
    <div class="section-header">
      <h2>My Applications</h2>
      <p class="section-subtitle">Track your applied internships</p>
    </div>
    ${list.length === 0
      ? `<div class="empty-state"><p>No applications yet.</p><button class="btn primary" onclick="activateNav(document.querySelector('.nav-item'), 'Discover')">Browse Internships</button></div>`
      : list.map(app => `
          <div class="application-card card">
            <div class="app-header">
              <div>
                <h3>${app.title}</h3>
                <p class="company-name">${app.company}</p>
              </div>
              <span class="status-badge ${app.status.toLowerCase()}">${app.status}</span>
            </div>
            <div class="internship-meta">
              <span>💼 ${app.type}</span>
              <span>📅 ${app.schedule}</span>
              <span>💵 ${app.salary}</span>
            </div>
            <button class="btn outline" onclick="viewInternshipDetails(${app.id})">View Details</button>
          </div>
        `).join('')
    }
  `;
}

// ── STUDENT: Profile ──────────────────────────────────────
function showProfilePage() {
  const email   = APP.user.email;
  const profile = getStudent(email) || {};

  document.getElementById('profileContent').innerHTML = `
    <div class="profile-card">
      <div class="profile-avatar">${(profile.name || email)[0].toUpperCase()}</div>
      <h2>My Profile</h2>

      <div class="form-group">
        <label>Full Name</label>
        <input type="text" id="pName"   value="${profile.name  || ''}" placeholder="Your full name" />
      </div>
      <div class="form-group">
        <label>Email</label>
        <input type="email" value="${email}" disabled />
      </div>
      <div class="form-group">
        <label>Phone Number</label>
        <input type="tel"  id="pPhone"  value="${profile.phone || ''}" placeholder="+1 555 000 0000" />
      </div>
      <div class="form-group">
        <label>University / Major</label>
        <input type="text" id="pUni"    value="${profile.university || ''}" placeholder="e.g. CIHE — Computer Science" />
      </div>
      <div class="form-group">
        <label>Bio</label>
        <textarea id="pBio" rows="4" placeholder="Tell employers about yourself…">${profile.bio || ''}</textarea>
      </div>
      <div class="form-group">
        <label>Skills <span class="hint">(comma-separated)</span></label>
        <input type="text" id="pSkills" value="${profile.skills ? profile.skills.join(', ') : ''}" placeholder="e.g. JavaScript, React, SQL" />
      </div>

      <div class="form-actions">
        <button class="btn primary" onclick="saveProfile()">Save Profile</button>
        <button class="btn outline"  onclick="goBack()">Cancel</button>
      </div>
    </div>
  `;
  showPage('profilePage');
}

function saveProfile() {
  const name  = document.getElementById('pName').value.trim();
  if (!name) { notify('Please enter your full name.', 'warn'); return; }

  upsertStudent(APP.user.email, {
    name,
    phone:      document.getElementById('pPhone').value.trim(),
    university: document.getElementById('pUni').value.trim(),
    bio:        document.getElementById('pBio').value.trim(),
    skills:     document.getElementById('pSkills').value.split(',').map(s => s.trim()).filter(Boolean),
  });

  notify('Profile saved!', 'success');
  showProfilePage(); // re-render to show updated avatar letter
}

// ── EMPLOYER ──────────────────────────────────────────────
function renderPostInternship() {
  const c = document.getElementById('dashboardContent');
  c.innerHTML = `
    <div class="section-header"><h2>Post New Internship</h2></div>
    <div class="card form-card">
      <div class="form-group">
        <label>Job Title</label>
        <input type="text" id="jTitle" placeholder="e.g. Frontend Developer Intern" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Salary Range</label>
          <input type="text" id="jSalary" placeholder="e.g. $2000–$2500/month" />
        </div>
        <div class="form-group">
          <label>Type</label>
          <select id="jType">
            <option>Full Time</option><option>Part Time</option><option>Casual</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Schedule</label>
          <select id="jSchedule">
            <option>Weekdays</option><option>Weekdays &amp; Weekends</option><option>Flexible</option>
          </select>
        </div>
        <div class="form-group">
          <label>Duration</label>
          <input type="text" id="jDuration" placeholder="e.g. 3–6 months" />
        </div>
      </div>
      <div class="form-group">
        <label>Location</label>
        <input type="text" id="jLocation" placeholder="e.g. San Francisco, CA" />
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea id="jDesc" rows="4" placeholder="Describe the role…"></textarea>
      </div>
      <div class="form-group">
        <label>Requirements</label>
        <textarea id="jReqs" rows="3" placeholder="List requirements…"></textarea>
      </div>
      <div class="form-group">
        <label>Skills <span class="hint">(comma-separated)</span></label>
        <input type="text" id="jSkills" placeholder="e.g. React, Node.js, SQL" />
      </div>
      <div class="form-actions">
        <button class="btn primary" onclick="submitJob()">Submit for Approval</button>
      </div>
    </div>
  `;
}

function submitJob() {
  const title = document.getElementById('jTitle').value.trim();
  const desc  = document.getElementById('jDesc').value.trim();
  if (!title || !desc) { notify('Title and description are required.', 'warn'); return; }

  const newJob = {
    id:          Date.now(),
    title,
    company:     APP.user.email.split('@')[0],
    status:      'Pending',
    salary:      document.getElementById('jSalary').value.trim()   || 'TBD',
    type:        document.getElementById('jType').value,
    schedule:    document.getElementById('jSchedule').value,
    duration:    document.getElementById('jDuration').value.trim() || 'TBD',
    location:    document.getElementById('jLocation').value.trim() || 'Remote',
    description: desc,
    requirements:document.getElementById('jReqs').value.trim(),
    skills:      document.getElementById('jSkills').value.split(',').map(s => s.trim()).filter(Boolean),
    match:       Math.floor(Math.random() * 28) + 70,
    postedDate:  new Date().toLocaleDateString(),
  };

  APP.internships = addInternship(newJob);
  notify('Submitted for Career Services review!', 'success');
  renderPostInternship();
}

function renderMyPostings() {
  const c       = document.getElementById('dashboardContent');
  const company = APP.user.email.split('@')[0];
  const posts   = APP.internships.filter(i => i.company === company);

  c.innerHTML = `
    <div class="section-header"><h2>My Postings</h2></div>
    ${posts.length === 0
      ? `<div class="empty-state"><p>No postings yet.</p><button class="btn primary" onclick="renderPostInternship()">Post Internship</button></div>`
      : posts.map(p => `
          <div class="card posting-card">
            <div class="app-header">
              <h3>${p.title}</h3>
              <span class="status-badge ${p.status.toLowerCase()}">${p.status}</span>
            </div>
            <div class="internship-meta">
              <span>💵 ${p.salary}</span>
              <span>💼 ${p.type}</span>
              <span>📅 ${p.schedule}</span>
            </div>
            <button class="btn outline" onclick="viewInternshipDetails(${p.id})">View Details</button>
          </div>
        `).join('')
    }
  `;
}

function renderCandidates() {
  const c       = document.getElementById('dashboardContent');
  const company = APP.user.email.split('@')[0];
  const posts   = APP.internships.filter(i => i.company === company);
  const students= getStudents();

  const candidates = [];
  Object.values(students).forEach(s => {
    posts.forEach(p => {
      if (s.appliedInternships?.includes(p.id))
        candidates.push({ ...s, appliedFor: p.title });
    });
  });

  c.innerHTML = `
    <div class="section-header"><h2>Candidates</h2></div>
    ${candidates.length === 0
      ? `<div class="empty-state"><p>No applications received yet.</p></div>`
      : candidates.map(cd => `
          <div class="card candidate-card">
            <div class="candidate-avatar">${(cd.name || cd.email)[0].toUpperCase()}</div>
            <div class="candidate-info">
              <h3>${cd.name || '—'}</h3>
              <p>${cd.email}</p>
              <p>Applied for: <strong>${cd.appliedFor}</strong></p>
              <p>Skills: ${cd.skills?.join(', ') || 'Not listed'}</p>
            </div>
          </div>
        `).join('')
    }
  `;
}

// ── ADMIN ─────────────────────────────────────────────────
function renderPendingApprovals() {
  const c       = document.getElementById('dashboardContent');
  const pending = APP.internships.filter(i => i.status === 'Pending');

  c.innerHTML = `
    <div class="section-header"><h2>Pending Approvals</h2></div>
    ${pending.length === 0
      ? `<div class="empty-state"><p>All caught up — no pending listings!</p></div>`
      : pending.map(item => `
          <div class="card approval-card">
            <div class="app-header">
              <div>
                <h3>${item.title}</h3>
                <p class="company-name">${item.company} &nbsp;•&nbsp; ${item.salary}</p>
              </div>
            </div>
            <p>${item.description}</p>
            <div class="card-actions">
              <button class="btn primary" onclick="updateStatus(${item.id}, 'Approved')">✓ Approve</button>
              <button class="btn danger"  onclick="updateStatus(${item.id}, 'Rejected')">✗ Reject</button>
            </div>
          </div>
        `).join('')
    }
  `;
}

function updateStatus(id, status) {
  APP.internships = updateInternship(id, { status });
  notify(`Internship ${status}!`, 'success');
  renderPendingApprovals();
}

function renderActiveListings() {
  const c      = document.getElementById('dashboardContent');
  const active = APP.internships.filter(i => i.status === 'Approved');

  c.innerHTML = `
    <div class="section-header"><h2>Active Listings (${active.length})</h2></div>
    ${active.map(item => `
      <div class="card listing-card">
        <div class="app-header">
          <div>
            <h3>${item.title}</h3>
            <p class="company-name">${item.company} &nbsp;•&nbsp; ${item.location}</p>
          </div>
          <span class="pill pill-green">Active</span>
        </div>
        <div class="internship-meta">
          <span>💵 ${item.salary}</span>
          <span>💼 ${item.type}</span>
        </div>
      </div>
    `).join('')}
  `;
}

function renderUserManagement() {
  const c        = document.getElementById('dashboardContent');
  const students = getStudents();

  c.innerHTML = `
    <div class="section-header"><h2>User Management</h2></div>
    <div class="stats-grid" style="margin-bottom:24px">
      <div class="stat-card"><div class="stat-number">${Object.keys(students).length}</div><div class="stat-title">Students</div></div>
      <div class="stat-card"><div class="stat-number">${APP.internships.length}</div><div class="stat-title">Total Listings</div></div>
      <div class="stat-card"><div class="stat-number">${APP.internships.filter(i=>i.status==='Approved').length}</div><div class="stat-title">Approved</div></div>
      <div class="stat-card"><div class="stat-number">${APP.internships.filter(i=>i.status==='Pending').length}</div><div class="stat-title">Pending</div></div>
    </div>
    <h3>Registered Students</h3>
    ${Object.values(students).map(s => `
      <div class="card" style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
        <div class="candidate-avatar">${(s.name||s.email)[0].toUpperCase()}</div>
        <div>
          <strong>${s.name||'(no name)'}</strong>
          <p style="margin:0;color:var(--muted);font-size:13px">${s.email}</p>
          <p style="margin:0;font-size:12px">Skills: ${s.skills?.join(', ')||'—'}</p>
        </div>
      </div>
    `).join('') || '<p>No students registered yet.</p>'}
  `;
}

// ── Toast notification (replaces alert()) ─────────────────
function notify(msg, type = 'info') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent  = msg;
  toast.className    = `toast toast-${type} show`;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove('show'), 3000);
}