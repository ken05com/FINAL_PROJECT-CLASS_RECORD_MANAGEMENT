// ===== Sidebar Toggle =====
const openBtn = document.querySelector('.open-btn');
const sidebar = document.querySelector('.sidebar');

openBtn.addEventListener('click', () => {
  sidebar.classList.toggle('active');
  openBtn.classList.toggle('hidden');
});

document.addEventListener('click', (e) => {
  if (window.innerWidth <= 768 && sidebar.classList.contains('active')) {
    if (!sidebar.contains(e.target) && !openBtn.contains(e.target)) {
      sidebar.classList.remove('active');
      openBtn.classList.remove('hidden');
    }
  }
});

// ===== STUDENT DATA =====
let students = JSON.parse(localStorage.getItem('students')) || [];

// ===== CLASS.HTML FUNCTIONS =====
function addStudent() {
  const nameInput = document.getElementById('studentName');
  const name = nameInput.value.trim();
  if (!name) return alert('Please enter a student name.');

  students.push({ name: name, grades: [null,null,null,null], attendance: [] });
  localStorage.setItem('students', JSON.stringify(students));
  nameInput.value = '';
  renderStudents();
  renderGrades();
  renderAttendance();
}

function removeStudent(index) {
  if (!confirm('Remove this student?')) return;
  students.splice(index, 1);
  localStorage.setItem('students', JSON.stringify(students));
  renderStudents();
  renderGrades();
  renderAttendance();
}

function renderStudents() {
  const list = document.getElementById('studentList');
  if (!list) return;
  list.innerHTML = '';
  students.forEach((s, i) => {
    const div = document.createElement('div');
    div.classList.add('student-item');
    div.innerHTML = `<span>${s.name}</span>
      <button class="delete-btn" onclick="removeStudent(${i})">Remove</button>`;
    list.appendChild(div);
  });
}

// ===== GRADE.HTML FUNCTIONS =====
function renderGrades() {
  const list = document.getElementById('gradeList');
  if (!list) return;
  list.innerHTML = '';
  students.forEach((s, i) => {
    const div = document.createElement('div');
    div.classList.add('grade-item');

    div.innerHTML = `
      <span>${s.name}</span>
      <div>
        <input type="number" id="q1${i}" placeholder="Q1" min="0" max="100" value="${s.grades[0] ?? ''}">
        <input type="number" id="q2${i}" placeholder="Q2" min="0" max="100" value="${s.grades[1] ?? ''}">
        <input type="number" id="q3${i}" placeholder="Q3" min="0" max="100" value="${s.grades[2] ?? ''}">
        <input type="number" id="q4${i}" placeholder="Q4" min="0" max="100" value="${s.grades[3] ?? ''}">
        <button onclick="saveGrade(${i})">Save</button>
        <div>Final: ${calculateFinalGrade(s.grades)}</div>
      </div>
    `;
    list.appendChild(div);
  });
}

function saveGrade(index) {
  const q1 = document.getElementById(`q1${index}`).value;
  const q2 = document.getElementById(`q2${index}`).value;
  const q3 = document.getElementById(`q3${index}`).value;
  const q4 = document.getElementById(`q4${index}`).value;

  students[index].grades = [
    q1 ? Number(q1) : null,
    q2 ? Number(q2) : null,
    q3 ? Number(q3) : null,
    q4 ? Number(q4) : null
  ];

  localStorage.setItem('students', JSON.stringify(students));
  renderGrades();
}

function calculateFinalGrade(grades) {
  const nums = grades.map(g => g ?? 0);
  return nums.length ? (nums.reduce((a,b)=>a+b,0)/4).toFixed(2) : '—';
}

// ===== ATTENDANCE.HTML FUNCTIONS =====
function renderAttendance() {
  const list = document.getElementById('attendanceList');
  if (!list) return;
  list.innerHTML = '';
  students.forEach((s, i) => {
    const div = document.createElement('div');
    div.classList.add('attendance-item');
    const present = s.attendance.filter(a => a.status==='present').length;
    const absent = s.attendance.filter(a => a.status==='absent').length;

    div.innerHTML = `
      <span>${s.name}</span>
      <div>
        <button onclick="markAttendance(${i}, 'present')">✅ Present</button>
        <button onclick="markAttendance(${i}, 'absent')">❌ Absent</button>
        <span>Present: ${present} | Absent: ${absent}</span>
      </div>
    `;
    list.appendChild(div);
  });
}

function markAttendance(index, status) {
  students[index].attendance.push({ status: status, date: new Date().toLocaleDateString() });
  localStorage.setItem('students', JSON.stringify(students));
  renderAttendance();
}

// ===== INITIAL RENDER =====
renderStudents();
renderGrades();
renderAttendance();
