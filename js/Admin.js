const API_BASE = '/api';

let studentsCache = [];
let residencesCache = [];
let applicationsCache = [];

// Notification system
function showNotification(message, type = 'info') {
  // Remove existing notifications
  const existing = document.querySelector('.notification');
  if (existing) existing.remove();
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg text-white max-w-sm ${
    type === 'success' ? 'bg-green-500' : 
    type === 'error' ? 'bg-red-500' : 
    type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
  }`;
  notification.innerHTML = `
    <div class="flex items-center justify-between">
      <span>${message}</span>
      <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-white hover:text-gray-200">×</button>
    </div>
  `;
  
  // Add to page
  document.body.appendChild(notification);
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 3000);
}

function showView(name){
  document.getElementById('dashboard-view').classList.toggle('hidden', name!=='dashboard');
  document.getElementById('accommodations-view').classList.toggle('hidden', name!=='accommodations');
  document.getElementById('students-view').classList.toggle('hidden', name!=='students');
}

async function loadAll(){
  // Show loading indicator
  const loadingIndicator = document.getElementById('loading-indicator');
  if (loadingIndicator) {
    loadingIndicator.style.display = 'block';
  }
  
  try {
    await Promise.all([loadApplications().catch(()=>{}), loadStudents().catch(()=>{})]);
    renderStats();
  } finally {
    // Hide loading indicator
    if (loadingIndicator) {
      loadingIndicator.style.display = 'none';
    }
  }
}

async function loadApplications(){
  const res = await fetch(`${API_BASE}/applications`, { credentials: 'same-origin' });
  if(!res.ok){ applicationsCache = []; return; }
  applicationsCache = await res.json();
  renderApplicationsTable(applicationsCache);
}
async function loadStudents(){
  const res = await fetch(`${API_BASE}/students`, { credentials: 'same-origin' });
  if(!res.ok){ studentsCache = []; return; }
  studentsCache = await res.json();
  renderStudentsTable(studentsCache);
  renderSummaryStats(studentsCache);
}
// Note: residences/students panes kept but not needed for applications table

async function loadResidenceStats(){
  const res = await fetch(`${API_BASE}/residences/stats`, { credentials: 'same-origin' });
  if(!res.ok) return [];
  return await res.json();
}
function renderStats(){
  const total = applicationsCache.length;
  const approved = applicationsCache.filter(a=>a.status==='Approved').length;
  const rejected = applicationsCache.filter(a=>a.status==='Rejected').length;
  const pending = applicationsCache.filter(a=>a.status==='Pending').length;

  const cards = document.getElementById('stats-cards');
  cards.innerHTML = `
    <div class="card p-5"><div><div class="text-2xl font-semibold">${total}</div><div class="text-sm text-gray-500">Total Applications</div></div></div>
    <div class="card p-5"><div><div class="text-2xl font-semibold">${pending}</div><div class="text-sm text-gray-500">Pending</div></div></div>
    <div class="card p-5"><div><div class="text-2xl font-semibold">${approved}</div><div class="text-sm text-gray-500">Approved</div></div></div>
    <div class="card p-5"><div><div class="text-2xl font-semibold">${rejected}</div><div class="text-sm text-gray-500">Rejected</div></div></div>
  `;
}

function renderApplicationsTable(list){
  const tbody = document.getElementById('applications-table');
  if(!tbody) return;
  const filterEl = document.getElementById('status-filter');
  const searchEl = document.getElementById('search-term');
  const filter = filterEl ? filterEl.value : 'all';
  const search = searchEl ? searchEl.value.trim().toLowerCase() : '';

  let data = list.slice();
  if(filter && filter!=='all') data = data.filter(a => (a.status||'').toLowerCase() === filter.toLowerCase());
  if(search) data = data.filter(a => (`${a.first_name||''} ${a.last_name||''} ${a.student_number||''} ${a.residence_name||''}`).toLowerCase().includes(search));

  tbody.innerHTML = '';
  data.forEach(a => {
    tbody.insertAdjacentHTML('beforeend', `
      <tr>
        <td>${a.id}</td>
        <td>${a.first_name} ${a.last_name}<div class="text-sm text-gray-500">${a.student_number||''}</div></td>
        <td>${a.residence_name}${a.block?` - ${a.block}`:''}${a.on_campus? '':' <span class=\"text-xs\">(Off-campus)</span>'}</td>
        <td>${a.room_number || '-'}</td>
        <td>${a.status}</td>
        <td>
          <button class="btn" onclick="approveApplication(${a.id})">Approve</button>
          <button class="btn" onclick="rejectApplication(${a.id})">Reject</button>
          ${a.on_campus? '' : `<button class="btn" onclick=\"downloadAcceptedPdf(${a.residence_id})\">Accepted PDF</button>`}
        </td>
      </tr>
    `);
  });
}

function renderResidences(){
  const maleTbody = document.getElementById('male-residences-table');
  const femaleTbody = document.getElementById('female-residences-table');
  const offTbody = document.getElementById('offcamp-residences-table');
  if(!maleTbody || !femaleTbody || !offTbody) return;
  maleTbody.innerHTML = ''; femaleTbody.innerHTML = ''; offTbody.innerHTML='';

  loadResidenceStats().then(rows=>{
    rows.forEach(r=>{
      if(r.on_campus && r.residence_type==='male'){
        maleTbody.insertAdjacentHTML('beforeend', `<tr><td>${r.residence_name}</td><td>${r.block||''}</td><td>${r.available_rooms}</td><td>${r.restrictions||'none'}</td></tr>`);
      } else if(r.on_campus && r.residence_type==='female'){
        femaleTbody.insertAdjacentHTML('beforeend', `<tr><td>${r.residence_name}</td><td>${r.block||''}</td><td>${r.available_rooms}</td><td>${r.restrictions||'none'}</td></tr>`);
      } else if(!r.on_campus){
        offTbody.insertAdjacentHTML('beforeend', `<tr><td>${r.residence_name}</td><td>${r.block||''}</td><td>${r.accepted_count}</td><td>${r.available_rooms}</td><td>${r.restrictions||'none'}</td><td><button class="btn" onclick="window.open('${API_BASE}/offcampus/${r.id}/accepted/pdf','_blank')">Accepted PDF</button></td></tr>`);
      }
    });
  }).catch(()=>{});
}

function renderStudentsTable(list){
  const tbody = document.getElementById('students-table');
  tbody.innerHTML = '';
  list.forEach(student => {
    const regDate = student.created_at ? new Date(student.created_at).toLocaleDateString() : '-';
    tbody.insertAdjacentHTML('beforeend', `
      <tr>
        <td>${student.first_name} ${student.last_name} <div class="text-sm text-gray-500">${student.student_number}</div></td>
        <td>${student.email || '-'}</td>
        <td>${student.phone || '-'}</td>
        <td>${student.gender || '-'}</td>
        <td>${regDate}</td>
      </tr>
    `);
  });
  document.getElementById('students-count').innerText = list.length;
}

function renderSummaryStats(list){
  const container = document.getElementById('summary-stats');
  const total = list.length;
  container.innerHTML = `
    <div class="card p-4"><div><div class="text-sm">Total Students</div><div class="text-xl">${total}</div></div></div>
  `;
}

function populatePrograms(){
  const select = document.getElementById('student-program');
  const progs = Array.from(new Set(studentsCache.map(s=>s.program).filter(Boolean))).sort();
  select.innerHTML = '<option value="all">All Programs</option>';
  progs.forEach(p => select.insertAdjacentHTML('beforeend', `<option value="${p}">${p}</option>`));
}

function filterApplications(){ renderApplicationsTable(applicationsCache); }
function filterStudents(){
  const q = document.getElementById('student-search').value.toLowerCase();
  const status = document.getElementById('student-status').value;
  const prog = document.getElementById('student-program').value;
  let data = studentsCache.slice();
  if(status!=='all') data = data.filter(student=>student.status===status);
  if(prog!=='all') data = data.filter(student=>student.program===prog);
  if(q) data = data.filter(student=>(`${student.first_name} ${student.last_name} ${student.student_number}`).toLowerCase().includes(q));
  renderStudentsTable(data);
}

async function approveApplication(id){
  try {
    // Show loading state
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = 'Approving...';
    button.disabled = true;
    
    const res = await fetch(`${API_BASE}/applications/${id}/approve`, { method: 'POST', credentials: 'same-origin' });
    
    if(!res.ok){ 
      alert('Approve failed'); 
      button.textContent = originalText;
      button.disabled = false;
      return; 
    }
    
    // Show success message
    showNotification('Application approved successfully!', 'success');
    
    // Refresh data
    await loadAll();
    
    // Reset button
    button.textContent = originalText;
    button.disabled = false;
    
  } catch (error) {
    console.error('Approve error:', error);
    alert('Error approving application');
    button.textContent = originalText;
    button.disabled = false;
  }
}

async function rejectApplication(id){
  try {
    // Show loading state
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = 'Rejecting...';
    button.disabled = true;
    
    const res = await fetch(`${API_BASE}/applications/${id}/reject`, { method: 'POST', credentials: 'same-origin' });
    
    if(!res.ok){ 
      alert('Reject failed'); 
      button.textContent = originalText;
      button.disabled = false;
      return; 
    }
    
    // Show success message
    showNotification('Application rejected successfully!', 'success');
    
    // Refresh data
    await loadAll();
    
    // Reset button
    button.textContent = originalText;
    button.disabled = false;
    
  } catch (error) {
    console.error('Reject error:', error);
    alert('Error rejecting application');
    button.textContent = originalText;
    button.disabled = false;
  }
}

function downloadAcceptedPdf(residenceId){
  window.open(`${API_BASE}/offcampus/${encodeURIComponent(residenceId)}/accepted/pdf`, '_blank');
}

function openModal(id){
  const s = studentsCache.find(x=>x.id===id);
  if(!s) return;
  const mb = document.getElementById('modal-body');
  mb.innerHTML = `<h2>${s.first_name} ${s.last_name}</h2>
    <p>Email: ${s.email}</p>
    <p>Student#: ${s.student_number}</p>
    <p>Program: ${s.program}</p>
    <p>Distance: ${s.distance}</p>
    <p>GPA: ${s.gpa}</p>
    <p>Status: ${s.status}</p>
    <p>Residence: ${s.assigned_residence || '-'}</p>`;
  document.getElementById('student-modal').classList.add('active');
}
function closeModal(){ document.getElementById('student-modal').classList.remove('active'); }

// PROCESS pending applications
async function processPending(){
  const method = document.getElementById('allocation-method').value;
  const res = await fetch(`${API_BASE}/process`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ method })
  });
  if(!res.ok){ alert('Process failed'); return; }
  const result = await res.json();
  // result includes counts and list; reload UI
  await loadAll();
  alert(`Processed: accepted ${result.accepted_count} students.`);
}



async function logout() {
  try {
    // The logout route uses GET and redirects automatically
    window.location.href = '/logout';
  } catch (error) {
    console.error('Logout error:', error);
    // Even if there's an error, redirect to login page
    window.location.href = '/login';
  }
}

document.addEventListener('DOMContentLoaded', ()=>{ loadAll(); renderResidences(); });
