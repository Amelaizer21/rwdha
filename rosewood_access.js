// This file is the improved JS logic for the advanced, modern Rosewood Access Control system.
// It is designed to be included as <script src="rosewood_access.js"></script> in the above HTML.

const AuthSystem = {
  username: 'RWDHA',
  password: 'rwdha@2025',
  authenticate(username, password) {
    return username === this.username && password === this.password;
  },
  validateSession() {
    const session = JSON.parse(localStorage.getItem('authSession'));
    return session && session.expires > Date.now();
  },
  logout() {
    localStorage.removeItem('authSession');
    window.location.reload();
  }
};
function showModal(html, onClose) {
  const modal = document.getElementById('modal');
  document.getElementById('modalContent').innerHTML = html;
  modal.classList.remove('hide');
  modal.onclick = (e) => { if (e.target === modal) { modal.classList.add('hide'); if (onClose) onClose(); }};
}
function closeModal() { document.getElementById('modal').classList.add('hide'); }

const StorageKeys = { employees:'rw_employees', keys:'rw_keys', cards:'rw_cards', logs:'rw_logs' };
function getData(type) { return JSON.parse(localStorage.getItem(StorageKeys[type]) || '[]'); }
function setData(type, arr) { localStorage.setItem(StorageKeys[type], JSON.stringify(arr)); }
function logAction(action, details) {
  const logs = getData('logs'); logs.unshift({ time: new Date().toLocaleString(), action, details });
  setData('logs', logs); renderLogs();
}

// --- Authentication ---
function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const errBox = document.getElementById('loginError');
  if(AuthSystem.authenticate(username, password)) {
    localStorage.setItem('authSession', JSON.stringify({ expires: Date.now() + 12*60*60*1000 }));
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('mainApp').classList.remove('hide');
    document.getElementById('currentUser').textContent = `User: ${AuthSystem.username}`;
    renderDashboard();
    errBox.style.display='none';
  } else {
    errBox.textContent = "Incorrect username or password. Please try again.";
    errBox.style.display='block';
  }
}
function logout() { AuthSystem.logout(); }

// --- Navigation ---
let page = 'dashboard', tab = {checkout:'keys', checkin:'keys'};
function showPage(p) {
  page = p;
  document.querySelectorAll('.sidebar-btn').forEach(btn => btn.classList.remove('sidebar-active'));
  document.querySelector(`.sidebar-btn[data-page="${p}"]`).classList.add('sidebar-active');
  document.querySelectorAll('section[id^="page-"]').forEach(sec => sec.classList.add('hide'));
  document.getElementById(`page-${p}`).classList.remove('hide');
  // Conditional rendering
  if(p==='dashboard') { renderDashboard(); }
  if(p==='logs') { renderLogs(); }
  if(p==='checkout') { renderCheckoutKeyList(); renderCheckoutCardList(); }
  if(p==='checkin') { renderCheckinKeyList(); renderCheckinCardList(); }
  if(p==='manage-emp') { renderEmployeeTable(); }
  if(p==='manage-key') { renderKeyTable(); }
  if(p==='manage-card') { renderCardTable(); }
  if(p==='delete') { renderCrudEmp(); renderCrudKey(); renderCrudCard(); }
}
function showTab(p, t) {
  tab[p] = t;
  document.querySelectorAll(`#page-${p} .tab-btn`).forEach(btn => btn.classList.remove('rw-header','rw-gold','text-white','bg-gray-200','rw-label'));
  document.querySelector(`#page-${p} .tab-btn[data-tab="${p}-${t}"]`).classList.add('rw-header','rw-gold','text-white');
  document.getElementById(`tab-${p}-keys`).classList.toggle('hide', t!=='keys');
  document.getElementById(`tab-${p}-cards`).classList.toggle('hide', t!=='cards');
  if (p === 'checkout') t === 'keys' ? renderCheckoutKeyList() : renderCheckoutCardList();
  if (p === 'checkin') t === 'keys' ? renderCheckinKeyList() : renderCheckinCardList();
}

// --- Dashboard and Chart ---
function renderDashboard() {
  const keys = getData('keys'), cards = getData('cards'), logs = getData('logs'), employees = getData('employees');
  document.getElementById('statTotalKeys').textContent = keys.length;
  document.getElementById('statTotalCards').textContent = cards.length;
  document.getElementById('statTotalEmployees').textContent = employees.length;
  const notReturned = keys.filter(k => k.issuedTo && !k.receivedDate).length +
                      cards.filter(c => c.issuedTo && !c.receivedDate).length;
  document.getElementById('statNotReturned').textContent = notReturned;
  const today = (new Date()).toISOString().slice(0,10);
  const takenToday = logs.filter(l => l.action==='Key Checked Out'&&l.time.includes(today)).length +
                     logs.filter(l => l.action==='Card Checked Out'&&l.time.includes(today)).length;
  document.getElementById('statTakenToday').textContent = takenToday;
  renderChart();
}
function renderChart() {
  const logs = getData('logs');
  const range = document.getElementById('activityRange').value;
  let labels = [], keyOut = [], keyIn = [], cardOut = [], cardIn = [];
  if(range==='hour') {
    // Today, hourly
    const now = new Date();
    const today = now.toISOString().slice(0,10);
    for(let h=0; h<24; h++) {
      const label = `${h}:00`;
      labels.push(label);
      keyOut.push(logs.filter(l=>l.action==='Key Checked Out'&&l.time.includes(today)&&parseInt(l.time.split(',')[1].split(':')[0])===h).length);
      keyIn.push(logs.filter(l=>l.action==='Key Checked In'&&l.time.includes(today)&&parseInt(l.time.split(',')[1].split(':')[0])===h).length);
      cardOut.push(logs.filter(l=>l.action==='Card Checked Out'&&l.time.includes(today)&&parseInt(l.time.split(',')[1].split(':')[0])===h).length);
      cardIn.push(logs.filter(l=>l.action==='Card Checked In'&&l.time.includes(today)&&parseInt(l.time.split(',')[1].split(':')[0])===h).length);
    }
  } else if(range==='month') {
    // This year, monthly
    const now = new Date();
    const year = now.getFullYear();
    for(let m=0; m<12; m++) {
      const label = `${year}-${String(m+1).padStart(2,'0')}`;
      labels.push(label);
      keyOut.push(logs.filter(l=>l.action==='Key Checked Out'&&l.time.includes(`${year}-${String(m+1).padStart(2,'0')}`)).length);
      keyIn.push(logs.filter(l=>l.action==='Key Checked In'&&l.time.includes(`${year}-${String(m+1).padStart(2,'0')}`)).length);
      cardOut.push(logs.filter(l=>l.action==='Card Checked Out'&&l.time.includes(`${year}-${String(m+1).padStart(2,'0')}`)).length);
      cardIn.push(logs.filter(l=>l.action==='Card Checked In'&&l.time.includes(`${year}-${String(m+1).padStart(2,'0')}`)).length);
    }
  } else {
    // Default: 7 days
    for(let i=6; i>=0; i--) {
      const d = new Date(); d.setDate(d.getDate()-i);
      const day = d.toISOString().slice(0,10);
      labels.push(day);
      keyOut.push(logs.filter(l=>l.action==='Key Checked Out'&&l.time.includes(day)).length);
      keyIn.push(logs.filter(l=>l.action==='Key Checked In'&&l.time.includes(day)).length);
      cardOut.push(logs.filter(l=>l.action==='Card Checked Out'&&l.time.includes(day)).length);
      cardIn.push(logs.filter(l=>l.action==='Card Checked In'&&l.time.includes(day)).length);
    }
  }
  if(window._chart) window._chart.destroy();
  window._chart = new Chart(document.getElementById('activityChart').getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label:'Checked Out (Keys)', data:keyOut, backgroundColor:'rgba(33,103,169,0.7)' },
        { label:'Checked In (Keys)', data:keyIn, backgroundColor:'rgba(172,140,78,0.6)' },
        { label:'Checked Out (Cards)', data:cardOut, backgroundColor:'rgba(46,115,97,0.5)' },
        { label:'Checked In (Cards)', data:cardIn, backgroundColor:'rgba(180,90,85,0.6)' }
      ]
    },
    options: {
      plugins: { legend: { position:'bottom' } },
      scales: { x: { stacked:true }, y: { beginAtZero: true, stacked:true } }
    }
  });
}

// --- Dashboard modal for checked out/employee/card lists, now editable ---
function showDashDetail(type) {
  let html = '';
  if(type==='notReturned') {
    // Show all checked out (keys and cards)
    html = `<h3 class="font-bold text-lg mb-2 rw-gold">Currently Checked Out Items</h3>`;
    html += `<table class="w-full text-xs mb-4"><thead>
      <tr class="bg-gray-100 text-black"><th>Type</th><th>Number/SN</th><th>Issued To</th><th>Date</th><th>Action</th></tr>
      </thead><tbody>`;
    const keys = getData('keys').filter(k=>k.issuedTo && !k.receivedDate);
    const cards = getData('cards').filter(c=>c.issuedTo && !c.receivedDate);
    keys.forEach(k => {
      html += `<tr>
        <td>Key</td><td>${k.keyNum}</td><td>${k.issuedTo}</td><td>${k.issuedDate}</td>
        <td><button class="crud-edit-btn" onclick="editKey('${k.keyNum}')">Edit</button></td>
      </tr>`;
    });
    cards.forEach(c => {
      html += `<tr>
        <td>Card</td><td>${c.cardSN}</td><td>${c.issuedTo}</td><td>${c.issuedDate}</td>
        <td><button class="crud-edit-btn" onclick="editCard('${c.cardSN}')">Edit</button></td>
      </tr>`;
    });
    html += `</tbody></table>`;
  }
  // More dashboard details for other types can be handled similarly

  document.getElementById('dashboardListContent').innerHTML = html;
  document.getElementById('dashboardListModal').classList.remove('hide');
}
function hideDashboardList() {
  document.getElementById('dashboardListModal').classList.add('hide');
}

// --- Logs ---
function renderLogs() {
  const logs = getData('logs').slice(0,80);
  document.getElementById('logList').innerHTML = logs.length?
    logs.map(l=>`<tr>
      <td>${l.time}</td>
      <td>${l.action}</td>
      <td>${l.details}</td>
    </tr>`).join('')
    : `<tr><td colspan="3" class="text-center text-gray-400">No logs yet</td></tr>`;
}

// --- Employee Management ---
function renderEmployeeTable() {
  const arr = getData('employees');
  document.getElementById('employeeTable').innerHTML = arr.length ?
    arr.map((r,i)=>
      `<tr>
        <td>${r.empId}</td><td>${r.empName}</td><td>${r.empDivision||''}</td><td>${r.empDept||''}</td>
        <td>${r.empPos||''}</td><td>${r.empPhone||''}</td><td>${r.empGender||''}</td>
        <td>
          <button class="crud-edit-btn" onclick="editEmployee('${r.empId}')">Edit</button>
        </td>
      </tr>`
    ).join('') : '<tr><td colspan="8" class="text-center text-gray-400">No data</td></tr>';
}
function addEmployee(e) {
  e.preventDefault();
  const emp = {
    empId:empId.value.trim(), empName:empName.value.trim(), empDivision:empDivision.value.trim(),
    empDept:empDept.value.trim(), empPos:empPos.value.trim(), empPhone:empPhone.value.trim(),
    empGender:empGender.value
  };
  if(!emp.empId||!emp.empName) return false;
  const arr = getData('employees'); arr.push(emp); setData('employees', arr);
  renderEmployeeTable(); e.target.reset();
  logAction('Employee Added', `Employee ${emp.empId} - ${emp.empName}`);
  renderDashboard();
  return false;
}
function editEmployee(empId) {
  const arr = getData('employees');
  const idx = arr.findIndex(e => e.empId === empId);
  if(idx<0) return;
  const emp = arr[idx];
  showModal(`
  <h3 class="font-bold text-lg mb-2 rw-gold">Edit Employee</h3>
  <form id="editEmpForm">
    <label>Name:</label>
    <input type="text" class="w-full border p-1 rounded mb-1" id="editEmpName" value="${emp.empName}" required>
    <label>Division:</label>
    <input type="text" class="w-full border p-1 rounded mb-1" id="editEmpDivision" value="${emp.empDivision||''}">
    <label>Department:</label>
    <input type="text" class="w-full border p-1 rounded mb-1" id="editEmpDept" value="${emp.empDept||''}">
    <label>Position:</label>
    <input type="text" class="w-full border p-1 rounded mb-1" id="editEmpPos" value="${emp.empPos||''}">
    <label>Phone Number:</label>
    <input type="text" class="w-full border p-1 rounded mb-1" id="editEmpPhone" value="${emp.empPhone||''}">
    <label>Gender:</label>
    <select class="w-full border p-1 rounded mb-1" id="editEmpGender">
      <option value="">Gender</option>
      <option value="Male" ${emp.empGender==='Male'?'selected':''}>Male</option>
      <option value="Female" ${emp.empGender==='Female'?'selected':''}>Female</option>
    </select>
    <button type="submit" class="rw-btn px-4 py-2 rounded mt-2">Save</button>
    <button type="button" onclick="closeModal()" class="ml-2 px-4 py-2 rounded bg-gray-200">Cancel</button>
  </form>
  `);
  document.getElementById('editEmpForm').onsubmit = function(e) {
    e.preventDefault();
    arr[idx].empName = document.getElementById('editEmpName').value.trim();
    arr[idx].empDivision = document.getElementById('editEmpDivision').value.trim();
    arr[idx].empDept = document.getElementById('editEmpDept').value.trim();
    arr[idx].empPos = document.getElementById('editEmpPos').value.trim();
    arr[idx].empPhone = document.getElementById('editEmpPhone').value.trim();
    arr[idx].empGender = document.getElementById('editEmpGender').value;
    setData('employees', arr);
    closeModal(); renderEmployeeTable(); renderCrudEmp();
    logAction('Employee Modified', `Employee ${arr[idx].empId} updated`);
    renderDashboard();
  };
}

// --- Key Management ---
function renderKeyTable() {
  const arr = getData('keys');
  document.getElementById('keyTable').innerHTML = arr.length ?
    arr.map((r,i)=>
      `<tr>
        <td>${r.keyNum}</td><td>${r.keyRoomDesc||''}</td><td>${r.keyCode||''}</td>
        <td>${r.keyNos||''}</td><td>${r.keyRemarks||''}</td>
        <td>
          <button class="crud-edit-btn" onclick="editKey('${r.keyNum}')">Edit</button>
        </td>
      </tr>`
    ).join('') : '<tr><td colspan="7" class="text-center text-gray-400">No data</td></tr>';
}
function addKey(e) {
  e.preventDefault();
  const key = {
    keyNum: keyNum.value.trim(), keyRoomDesc: keyRoomDesc.value.trim(), keyCode: keyCode.value.trim(),
    keyNos: keyNos.value.trim(), keyRemarks: keyRemarks.value.trim(),
    issuedTo: '', issuedDate: '', receivedDate: ''
  };
  if(!key.keyNum) return false;
  const arr = getData('keys'); arr.push(key); setData('keys', arr);
  renderKeyTable(); e.target.reset();
  logAction('Key Added', `Key ${key.keyNum} - Room: ${key.keyRoomDesc}`);
  renderDashboard();
  return false;
}
function editKey(keyNum) {
  const arr = getData('keys');
  const idx = arr.findIndex(k => k.keyNum === keyNum);
  if(idx<0) return;
  const k = arr[idx];
  showModal(`
  <h3 class="font-bold text-lg mb-2 rw-gold">Edit Key</h3>
  <form id="editKeyForm">
    <label>Room Description:</label>
    <input type="text" class="w-full border p-1 rounded mb-1" id="editKeyRoomDesc" value="${k.keyRoomDesc||''}">
    <label>Key Code:</label>
    <input type="text" class="w-full border p-1 rounded mb-1" id="editKeyCode" value="${k.keyCode||''}">
    <label>NO'S:</label>
    <input type="number" min="1" class="w-full border p-1 rounded mb-1" id="editKeyNos" value="${k.keyNos||''}">
    <label>Remarks:</label>
    <input type="text" class="w-full border p-1 rounded mb-1" id="editKeyRemarks" value="${k.keyRemarks||''}">
    <button type="submit" class="rw-btn px-4 py-2 rounded mt-2">Save</button>
    <button type="button" onclick="closeModal()" class="ml-2 px-4 py-2 rounded bg-gray-200">Cancel</button>
  </form>
  `);
  document.getElementById('editKeyForm').onsubmit = function(e) {
    e.preventDefault();
    arr[idx].keyRoomDesc = document.getElementById('editKeyRoomDesc').value.trim();
    arr[idx].keyCode = document.getElementById('editKeyCode').value.trim();
    arr[idx].keyNos = document.getElementById('editKeyNos').value.trim();
    arr[idx].keyRemarks = document.getElementById('editKeyRemarks').value.trim();
    setData('keys', arr);
    closeModal(); renderKeyTable(); renderCrudKey();
    logAction('Key Modified', `Key ${arr[idx].keyNum} updated`);
    renderDashboard();
  };
}

// --- Card Management ---
function renderCardTable() {
  const arr = getData('cards');
  document.getElementById('cardTable').innerHTML = arr.length ?
    arr.map((r,i)=>
      `<tr>
        <td>${r.cardSN}</td><td>${r.cardSaltoNum||''}</td><td>${r.cardTotalNos||''}</td>
        <td>
          <button class="crud-edit-btn" onclick="editCard('${r.cardSN}')">Edit</button>
        </td>
      </tr>`
    ).join('') : '<tr><td colspan="4" class="text-center text-gray-400">No data</td></tr>';
}
function addCard(e) {
  e.preventDefault();
  const card = {
    cardSN: cardSN.value.trim(), cardSaltoNum: cardSaltoNum.value.trim(),
    cardTotalNos: cardTotalNos.value.trim(), issuedTo:'', issuedDate:'', receivedDate:''
  };
  if(!card.cardSN) return false;
  const arr = getData('cards'); arr.push(card); setData('cards', arr);
  renderCardTable(); e.target.reset();
  logAction('Card Added', `Card ${card.cardSN} - Salto: ${card.cardSaltoNum}`);
  renderDashboard();
  return false;
}
function editCard(cardSN) {
  const arr = getData('cards');
  const idx = arr.findIndex(c => c.cardSN === cardSN);
  if(idx<0) return;
  const c = arr[idx];
  showModal(`
  <h3 class="font-bold text-lg mb-2 rw-gold">Edit Card</h3>
  <form id="editCardForm">
    <label>Salto Number:</label>
    <input type="text" class="w-full border p-1 rounded mb-1" id="editCardSaltoNum" value="${c.cardSaltoNum||''}">
    <label>Total Nos.:</label>
    <input type="number" min="1" class="w-full border p-1 rounded mb-1" id="editCardTotalNos" value="${c.cardTotalNos||''}">
    <button type="submit" class="rw-btn px-4 py-2 rounded mt-2">Save</button>
    <button type="button" onclick="closeModal()" class="ml-2 px-4 py-2 rounded bg-gray-200">Cancel</button>
  </form>
  `);
  document.getElementById('editCardForm').onsubmit = function(e) {
    e.preventDefault();
    arr[idx].cardSaltoNum = document.getElementById('editCardSaltoNum').value.trim();
    arr[idx].cardTotalNos = document.getElementById('editCardTotalNos').value.trim();
    setData('cards', arr);
    closeModal(); renderCardTable(); renderCrudCard();
    logAction('Card Modified', `Card ${arr[idx].cardSN} updated`);
    renderDashboard();
  };
}

// --- CRUD Delete/Modify Pages ---
function renderCrudEmp() {
  const arr = getData('employees');
  const search = (document.getElementById('delEmpSearch').value||'').toLowerCase();
  document.getElementById('crudEmpTable').innerHTML = arr.filter(r=>
    (!search || r.empId.toLowerCase().includes(search) || r.empName.toLowerCase().includes(search))
  ).map(r=>
    `<tr>
      <td>${r.empId}</td><td>${r.empName}</td>
      <td>
        <button class="crud-edit-btn" onclick="editEmployee('${r.empId}')">Edit</button>
        <button class="crud-delete-btn" onclick="deleteEmployee('${r.empId}')">Delete</button>
      </td>
    </tr>`
  ).join('') || '<tr><td colspan="3" class="text-center text-gray-400">No data</td></tr>';
}
function deleteEmployee(empId) {
  if(!confirm('Are you sure you want to delete this employee?')) return;
  let arr = getData('employees');
  arr = arr.filter(e=>e.empId!==empId);
  setData('employees', arr);
  renderCrudEmp(); renderEmployeeTable(); renderDashboard();
  logAction('Employee Deleted', `Employee ${empId} removed`);
}
function renderCrudKey() {
  const arr = getData('keys');
  const search = (document.getElementById('delKeySearch').value||'').toLowerCase();
  document.getElementById('crudKeyTable').innerHTML = arr.filter(r=>
    (!search || r.keyNum.toLowerCase().includes(search) || (r.keyRoomDesc||'').toLowerCase().includes(search))
  ).map(r=>
    `<tr>
      <td>${r.keyNum}</td><td>${r.keyRoomDesc||''}</td>
      <td>
        <button class="crud-edit-btn" onclick="editKey('${r.keyNum}')">Edit</button>
        <button class="crud-delete-btn" onclick="deleteKey('${r.keyNum}')">Delete</button>
      </td>
    </tr>`
  ).join('') || '<tr><td colspan="3" class="text-center text-gray-400">No data</td></tr>';
}
function deleteKey(keyNum) {
  if(!confirm('Are you sure you want to delete this key?')) return;
  let arr = getData('keys');
  arr = arr.filter(k=>k.keyNum!==keyNum);
  setData('keys', arr);
  renderCrudKey(); renderKeyTable(); renderDashboard();
  logAction('Key Deleted', `Key ${keyNum} removed`);
}
function renderCrudCard() {
  const arr = getData('cards');
  const search = (document.getElementById('delCardSearch').value||'').toLowerCase();
  document.getElementById('crudCardTable').innerHTML = arr.filter(r=>
    (!search || r.cardSN.toLowerCase().includes(search) || (r.cardSaltoNum||'').toLowerCase().includes(search))
  ).map(r=>
    `<tr>
      <td>${r.cardSN}</td><td>${r.cardSaltoNum||''}</td>
      <td>
        <button class="crud-edit-btn" onclick="editCard('${r.cardSN}')">Edit</button>
        <button class="crud-delete-btn" onclick="deleteCard('${r.cardSN}')">Delete</button>
      </td>
    </tr>`
  ).join('') || '<tr><td colspan="3" class="text-center text-gray-400">No data</td></tr>';
}
function deleteCard(cardSN) {
  if(!confirm('Are you sure you want to delete this card?')) return;
  let arr = getData('cards');
  arr = arr.filter(c=>c.cardSN!==cardSN);
  setData('cards', arr);
  renderCrudCard(); renderCardTable(); renderDashboard();
  logAction('Card Deleted', `Card ${cardSN} removed`);
}

// --- Check In/Out Logic and List Rendering ---
// ... (This logic is similar to your previous code, just update action button columns as needed)
//
// --- Import/Export Logic ---
function handleExcelUpload(event, type) {
  const file = event.target.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, {defval:""});
      let arr = [];
      function mapHeader(header) {
        return (header+'').trim().toLowerCase().replace(/[_\s\.']/g,'');
      }
      if(type==='employees') {
        arr = json.map(r=>{
          let keys = Object.keys(r).reduce((acc,key)=>{acc[mapHeader(key)]=key;return acc;}, {});
          return {
            empId: String(r[keys['employeeid']||'Employee ID']||r[keys['id']||'ID']||'').trim(),
            empName: String(r[keys['passportname']||'Passport Name']||r[keys['name']||'Name']||'').trim(),
            empDivision: r[keys['division']||'Division']||'',
            empDept: r[keys['department']||'Department']||'',
            empPos: r[keys['positiontitle']||'Position Title']||r[keys['position']||'Position']||'',
            empPhone: r[keys['phonenumber']||'Phone Number']||r[keys['phone']||'Phone']||'',
            empGender: r[keys['gender']||'Gender']||''
          }
        }).filter(r=>r.empId&&r.empName);
        setData('employees', arr);
        renderEmployeeTable(); logAction('Bulk Import', `Imported ${arr.length} employees`);
      } else if(type==='keys') {
        arr = json.map(r=>{
          let keys = Object.keys(r).reduce((acc,key)=>{acc[mapHeader(key)]=key;return acc;}, {});
          return {
            keyNum: String(r[keys['keynumber']||'Key Number']||r[keys['number']||'Number']||'').trim(),
            keyRoomDesc: r[keys['roomdescription']||'Room Description']||r[keys['roomdesc']||'RoomDesc']||'',
            keyCode: r[keys['keycode']||'Key Code']||r[keys['code']||'Code']||'',
            keyNos: r[keys['nos']||"NO'S"]||'',
            keyRemarks: r[keys['remarks']||'Remarks']||'',
            issuedTo:'', issuedDate:'', receivedDate:''
          }
        }).filter(r=>r.keyNum);
        setData('keys', arr);
        renderKeyTable(); logAction('Bulk Import', `Imported ${arr.length} keys`);
      } else if(type==='cards') {
        arr = json.map(r=>{
          let keys = Object.keys(r).reduce((acc,key)=>{acc[mapHeader(key)]=key;return acc;}, {});
          return {
            cardSN: String(r[keys['sn']||'SN']||r[keys['serial']||'Serial']||'').trim(),
            cardSaltoNum: r[keys['saltonumber']||'Salto Number']||r[keys['salto']||'Salto']||'',
            cardTotalNos: r[keys['totalnos']||'Total Nos.']||r[keys['total']||'Total']||'',
            issuedTo:'', issuedDate:'', receivedDate:''
          }
        }).filter(r=>r.cardSN);
        setData('cards', arr);
        renderCardTable(); logAction('Bulk Import', `Imported ${arr.length} cards`);
      }
      renderDashboard();
    } catch(err) { alert('Import failed! Check your file structure.\n'+err.message); }
  };
  reader.readAsArrayBuffer(file);
}
function exportData(type) {
  const arr = getData(type);
  if(arr.length===0) { alert('No data to export.'); return; }
  const ws = XLSX.utils.json_to_sheet(arr);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, type.charAt(0).toUpperCase()+type.slice(1));
  XLSX.writeFile(wb, `Rosewood-${type}-export.xlsx`);
}

// --- Initialize on load ---
if(AuthSystem.validateSession()) {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('mainApp').classList.remove('hide');
  document.getElementById('currentUser').textContent = `User: ${AuthSystem.username}`;
  renderDashboard();
} else {
  document.getElementById('loginPage').style.display = 'flex';
}
showPage('dashboard');