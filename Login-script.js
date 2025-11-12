
function currentUser() {
  return localStorage.getItem("loggedInUser") || null;
}

function readClasses() {
  const user = currentUser() || "guest";
  try { return JSON.parse(localStorage.getItem(`classesList_${user}`)) || []; }
  catch { return []; }
}
function writeClasses(list) {
  const user = currentUser() || "guest";
  localStorage.setItem(`classesList_${user}`, JSON.stringify(list));
}

function getClassIdFromURL() {
  return new URLSearchParams(window.location.search).get("classId");
}

function loadStudentsFor(classId) {
  const user = currentUser() || "guest";
  if (!classId) return [];
  try { return JSON.parse(localStorage.getItem(`studentsList_${user}_${classId}`)) || []; }
  catch { return []; }
}
function saveStudentsFor(classId, list) {
  const user = currentUser() || "guest";
  if (!classId) return;
  localStorage.setItem(`studentsList_${user}_${classId}`, JSON.stringify(list));
}

function getClassById(classId) {
  const list = readClasses();
  return list.find(c => String(c.id) === String(classId)) || null;
}

function isLoggedIn() {
  return !!localStorage.getItem('loggedInUser');
}

function pathEndsWith(name) {
  return window.location.pathname.split('/').pop() === name;
}

// SIDEBAR TOGGLE (shared)
(function setupSidebarToggle() {
  const openBtn = document.querySelector(".open-btn");
  const sidebar = document.querySelector(".sidebar");
  if (!openBtn || !sidebar) return;
  openBtn.addEventListener("click", () => {
    sidebar.classList.toggle("active");
    openBtn.classList.toggle("hidden");
  });
  document.addEventListener("click", (e) => {
    if (window.innerWidth <= 768 && sidebar.classList.contains("active")) {
      if (!sidebar.contains(e.target) && !openBtn.contains(e.target)) {
        sidebar.classList.remove("active");
        openBtn.classList.remove("hidden");
      }
    }
  });
})();



// AUTH: LOGIN / SIGNUP / LOGOUT
(function loginModule() {
  const loginForm = document.getElementById("loginForm");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const msgEl = document.getElementById("msg");

  const builtinAdmin = { username: "admin", password: "admin" };

  function showMsg(el, text, type = "error") {
    if (!el) return;
    el.textContent = text;
    el.className = "msg " + (type === "success" ? "success" : "error");
    el.style.display = "block";
  }

  function loadUsers() {
    try {
      const raw = localStorage.getItem("users");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  // LOGIN PAGE BEHAVIOR
  if (loginForm) {
    // Always clear any old login session when visiting login page
    localStorage.removeItem("loggedInUser");

    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const username = usernameInput.value.trim();
      const password = passwordInput.value.trim();

      if (!username || !password) {
        showMsg(msgEl, "Please enter both username and password.");
        return;
      }

      // Built-in Admin login
      if (username === builtinAdmin.username && password === builtinAdmin.password) {
        localStorage.setItem("loggedInUser", username);
        showMsg(msgEl, "Welcome admin — redirecting...", "success");
        setTimeout(() => (window.location.href = "dashboard.html"), 400);
        return;
      }

      // Regular user login
      const users = loadUsers();
      const found = users.find(
        (u) => u.username === username && u.password === password
      );

      if (found) {
        localStorage.setItem("loggedInUser", username);
        showMsg(msgEl, "Login successful — redirecting...", "success");
        setTimeout(() => (window.location.href = "dashboard.html"), 400);
      } else {
        showMsg(msgEl, "Invalid username or password.");
      }
    });
  }

  // SIGNUP PAGE BEHAVIOR
  const signupForm = document.getElementById("signupForm");
  if (signupForm) {
    signupForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const fullName = (document.getElementById("fullName") || {}).value || "";
      const email = (document.getElementById("email") || {}).value || "";
      const username = (document.getElementById("username") || {}).value || "";
      const password = (document.getElementById("password") || {}).value || "";

      if (!fullName.trim() || !email.trim() || !username.trim() || !password) {
        showMsg(msgEl, "All fields are required.", "error");
        return;
      }

      let users = [];
      try {
        users = JSON.parse(localStorage.getItem("users")) || [];
      } catch { }

      if (users.some((u) => u.username === username)) {
        showMsg(msgEl, "Username already exists.", "error");
        return;
      }

      const joinDate = new Date().toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric"
      });

      // Add to main user list
      users.push({
        fullName: fullName.trim(),
        email: email.trim(),
        username: username.trim(),
        password,
        joined: joinDate
      });

      localStorage.setItem("users", JSON.stringify(users));

      // Save full user profile info (for profile page)
      localStorage.setItem(
        "user_" + username.trim(),
        JSON.stringify({
          fullname: fullName.trim(),
          email: email.trim(),
          joined: joinDate
        })
      );

      showMsg(msgEl, "Account created successfully!", "success");
      signupForm.reset();
      setTimeout(() => window.location.href = "index.html", 1200);
    });
  }


  // LOGOUT FUNCTION — can be used by logout button anywhere
  window.logout = function () {
    localStorage.removeItem("loggedInUser");
    window.location.href = "index.html";
  };
})();



// GLOBAL LOGOUT CLICK HANDLER (applies to all pages)
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".logout").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      // optional confirm
      if (confirm("Are you sure you want to log out?")) {
        localStorage.removeItem("loggedInUser");
        window.location.href = "index.html";
      }
    });
  });


});



// SESSION GUARD FOR PROTECTED PAGES
(function sessionGuard() {
  const protectedPages = [
    "dashboard.html",
    "class.html",
    "class-details.html",
    "add-students.html",
    "add-scores.html",
    "add-grades.html",
    "add-attendances.html",
    "add-attendance.html" // in case different file names
  ];
  const cur = window.location.pathname.split("/").pop();
  if (protectedPages.includes(cur) && !isLoggedIn()) {
    window.location.href = "index.html";
  }
})();



// CLASS PAGE (class.html) — create / list / delete
(function classPageModule() {
  if (!pathEndsWith("class.html")) return;

  let classesList = readClasses();
  const container = document.getElementById("availableclass");

  function renderClasses() {
    if (!container) return;
    container.innerHTML = "";
    if (!classesList || classesList.length === 0) {
      container.innerHTML = `<p class="no-class">No classes created yet.</p>`;
      return;
    }
    classesList.forEach((c, i) => {
      const btn = document.createElement("button");
      btn.className = "classes";
      btn.onclick = () => (window.location.href = `class-details.html?classId=${c.id}`);
      btn.innerHTML = `
        <div class="text">
          <h1>${c.name}</h1>
          <p>${c.semester || c.section || ""}</p>
        </div>
        <button class="delete-btn" onclick="event.stopPropagation(); removeClass(${i})">
          <img src="image/trash.png" alt="Remove Class" class="delete-icon">
        </button>
      `;
      container.appendChild(btn);
    });
  }

  // ...existing code...
  window.addClass = function () {
    const nameInput = document.getElementById("addedClass");
    const semesterSelect = document.getElementById("semester-select");
    const className = nameInput?.value.trim();
    const semester = semesterSelect?.value;
    if (!className) return alert("Please enter a class name.");
    if (!semester) return alert("Please select a semester.");

    // update the module-scoped classesList (do NOT redeclare with let)
    classesList = readClasses() || [];

    // check duplicate by name + semester (case-insensitive)
    const exists = classesList.some(c =>
      String(c.name).trim().toLowerCase() === className.toLowerCase() &&
      String(c.semester || "").trim().toLowerCase() === String(semester).trim().toLowerCase()
    );
    if (exists) {
      return alert("A class with the same name and semester already exists.");
    }

    const newClass = { id: Date.now(), name: className, semester };
    classesList.push(newClass);
    writeClasses(classesList);
    saveStudentsFor(newClass.id, []); // initialize per-user students store
    nameInput.value = "";
    semesterSelect.value = "";
    // re-render using the updated (module-scoped) list
    if (typeof renderClasses === "function") renderClasses();
  };
  // ...existing code...
  window.removeClass = function (index) {
    if (!confirm("Remove this class and all its student data?")) return;
    const c = classesList[index];
    if (c && c.id) {
      const user = currentUser() || "guest";
      localStorage.removeItem(`studentsList_${user}_${c.id}`);
    }
    classesList.splice(index, 1);
    writeClasses(classesList);
    renderClasses();
  };

  // initial render
  renderClasses();
})();


// CLASS DETAILS PAGE (class-details.html)
(function classDetailsModule() {
  if (!pathEndsWith("class-details.html")) return;

  const classId = getClassIdFromURL();
  const currentClass = getClassById(classId);
  if (!currentClass) {
    alert("No class selected. Returning to class list.");
    window.location.href = "class.html";
    return;
  }

  const subjectEl = document.querySelector(".subjectname");
  if (subjectEl) subjectEl.textContent = `${currentClass.name} - ${currentClass.semester || ""}`;

  const btnMap = [
    { id: "addStudentsBtn", page: "add-students.html" },
    { id: "addScoresBtn", page: "add-scores.html" },
    { id: "addGradesBtn", page: "add-grades.html" },
    { id: "addAttendanceBtn", page: "add-attendances.html" },
  ];
  btnMap.forEach(({ id, page }) => {
    const btn = document.getElementById(id);
    if (btn) btn.onclick = () => (window.location.href = `${page}?classId=${classId}`);
  });
})();



// ADD STUDENTS PAGE (add-students.html)
(function addStudentsModule() {
  if (!pathEndsWith("add-students.html") && !window.location.pathname.includes("add-students")) return;

  const classId = getClassIdFromURL();
  const currentClass = getClassById(classId);
  if (!currentClass) { alert("No class selected."); window.location.href = "class.html"; return; }

  // set subject header
  const subjectEl = document.querySelector(".subjectname");
  if (subjectEl) subjectEl.textContent = `${currentClass.name} - ${currentClass.semester || ""}`;

  // render student table (exposed globally so other modules can call it)
  window.renderStudentTable = function renderStudentTable(cid = classId) {
    const tableBody = document.getElementById("tableBody");
    if (!tableBody) return;
    const students = loadStudentsFor(cid) || [];
    tableBody.innerHTML = "";
    if (!students.length) {
      tableBody.innerHTML = `<tr><td colspan="2">No students added yet.</td></tr>`;
      return;
    }
    students.forEach((s, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${s.name}</td>
        <td>
          <button class="btn-delete" onclick="deleteStudent(${i})"><img src="image/trash (1).png" alt=""></button>
        </td>
      `;
      tableBody.appendChild(tr);
    });
  };

  // add single student (called by button in HTML)
  window.addStudent = function addStudent() {
    const input = document.getElementById("studentNameInput");
    if (!input) return;
    const name = (input.value || "").trim();
    if (!name) return alert("Please enter student name.");
    const students = loadStudentsFor(classId) || [];
    // avoid duplicates by name (case-insensitive)
    if (students.some(s => s.name.toLowerCase() === name.toLowerCase())) {
      input.value = "";
      return alert("Student already exists.");
    }
    students.push({
      id: Date.now() + Math.floor(Math.random() * 1000),
      name,
      grades: { prelim: "", midterm: "", semifinals: "", finals: "", final: "", remarks: "" },
      scores: { quiz: "", project: "", exam: "", average: "" },
      attendance: []
    });
    saveStudentsFor(classId, students);
    input.value = "";
    renderStudentTable();
  };

  // delete student by index
  window.deleteStudent = function deleteStudent(index) {
    const students = loadStudentsFor(classId) || [];
    if (index < 0 || index >= students.length) return;
    if (!confirm(`Delete ${students[index].name}?`)) return;
    students.splice(index, 1);
    saveStudentsFor(classId, students);
    renderStudentTable();
  };

  // import students from Excel (uses XLSX)


  // initial render when DOM is ready
  document.addEventListener("DOMContentLoaded", () => {
    renderStudentTable();
  });
})();



// ADD SCORES PAGE (add-scores.html)
(function addScoresModule() {
  if (!pathEndsWith("add-scores.html") && !window.location.pathname.includes("add-scores")) return;

  const classId = getClassIdFromURL();
  const currentClass = getClassById(classId);
  if (!currentClass) { alert("No class selected."); window.location.href = "class.html"; return; }

  const tableBody = document.getElementById("tableBody");

  function render() {
    if (!tableBody) return;
    const students = loadStudentsFor(classId);
    tableBody.innerHTML = "";
    if (!students.length) { tableBody.innerHTML = `<tr><td colspan="5">No students added yet.</td></tr>`; return; }
    students.forEach((s, i) => {
      if (!s.scores) s.scores = { quiz: "", project: "", exam: "", average: "" };
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${s.name}</td>
        <td><input type="number" class="score-input" data-id="${s.id}" data-field="quiz" min="0" max="100" value="${s.scores.quiz || ""}"></td>
        <td><input type="number" class="score-input" data-id="${s.id}" data-field="project" min="0" max="100" value="${s.scores.project || ""}"></td>
        <td><input type="number" class="score-input" data-id="${s.id}" data-field="exam" min="0" max="100" value="${s.scores.exam || ""}"></td>
        <td class="avg-cell">${s.scores.average || ""}</td>
      `;
      tableBody.appendChild(tr);
    });
  }

  document.addEventListener("input", (e) => {
    if (!e.target.classList.contains("score-input")) return;
    const id = Number(e.target.dataset.id);
    const field = e.target.dataset.field;
    const value = e.target.value === "" ? "" : Number(e.target.value);
    const students = loadStudentsFor(classId);
    const student = students.find(x => x.id === id);
    if (!student) return;
    student.scores[field] = value;
    const q = Number(student.scores.quiz) || 0;
    const p = Number(student.scores.project) || 0;
    const ex = Number(student.scores.exam) || 0;
    const avg = ((q + p + ex) / 3).toFixed(2);
    student.scores.average = isNaN(avg) ? "" : avg;
    saveStudentsFor(classId, students);
    const row = e.target.closest("tr");
    if (row) row.querySelector(".avg-cell").textContent = student.scores.average;
  });

  document.addEventListener("DOMContentLoaded", render);
})();



// ADD GRADES PAGE (add-grades.html)
(function addGradesModule() {
  if (!pathEndsWith("add-grades.html") && !window.location.pathname.includes("add-grades")) return;

  const classId = getClassIdFromURL();
  const currentClass = getClassById(classId);
  if (!currentClass) { alert("No class selected."); window.location.href = "class.html"; return; }

  // set subject header
  const subjectEl = document.querySelector(".subjectname");
  if (subjectEl) subjectEl.textContent = `${currentClass.name} - ${currentClass.semester || ""}`;

  function computeFinalFromGrades(g) {
    const p = parseFloat(g.prelim) || 0;
    const m = parseFloat(g.midterm) || 0;
    const s = parseFloat(g.semifinals) || 0;
    const f = parseFloat(g.finals) || 0;
    const values = [p, m, s, f].filter(v => v > 0);
    if (values.length === 0) return { final: "", remarks: "" };
    const avg = (p + m + s + f) / 4;
    const rounded = avg.toFixed(2);
    const remarks = avg <= 3.00 ? "Passed" : "Failed";
    return { final: rounded, remarks };
  }

  function isValidGradeFormat(val) {
    return /^[1-5](\.[0-9]{2})$/.test(String(val));
  }

  function render() {
    const tableBody = document.getElementById("tableBody");
    if (!tableBody) return;
    const students = loadStudentsFor(classId) || [];
    tableBody.innerHTML = "";
    if (!students.length) { tableBody.innerHTML = `<tr><td colspan="7">No students added yet.</td></tr>`; return; }

    students.forEach((s, i) => {
      s.grades = s.grades || { prelim: "", midterm: "", semifinals: "", finals: "", final: "", remarks: "" };
      const { final, remarks } = computeFinalFromGrades(s.grades);
      s.grades.final = final;
      s.grades.remarks = remarks;

      const statusClass = remarks === "Passed" ? "passed" : (remarks === "Failed" ? "failed" : "");

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${s.name}</td>
        <td><input type="text" maxlength="4" placeholder="1.00" value="${s.grades.prelim || ""}" data-field="prelim" data-index="${i}"></td>
        <td><input type="text" maxlength="4" placeholder="1.00" value="${s.grades.midterm || ""}" data-field="midterm" data-index="${i}"></td>
        <td><input type="text" maxlength="4" placeholder="1.00" value="${s.grades.semifinals || ""}" data-field="semifinals" data-index="${i}"></td>
        <td><input type="text" maxlength="4" placeholder="1.00" value="${s.grades.finals || ""}" data-field="finals" data-index="${i}"></td>
        <td class="final-grade-cell">${s.grades.final || ""}</td>
        <td class="remark-cell ${statusClass}">${s.grades.remarks || ""}</td>
      `;
      tableBody.appendChild(tr);
    });

    saveStudentsFor(classId, students);
  }

  // global input listener (works even if DOM changes)
  document.addEventListener("input", (e) => {
    const input = e.target;
    if (!input || input.tagName !== "INPUT" || !input.dataset.field) return;
    const idx = Number(input.dataset.index);
    const field = input.dataset.field;
    const raw = (input.value || "").trim();

    if (raw === "") {
      input.style.border = "";
    } else if (!isValidGradeFormat(raw)) {
      input.style.border = "1px solid red";
      return;
    } else {
      input.style.border = "";
    }

    const students = loadStudentsFor(classId);
    const student = students[idx];
    if (!student) return;

    student.grades = student.grades || {};
    student.grades[field] = raw === "" ? "" : parseFloat(raw).toFixed(2);

    const { final, remarks } = computeFinalFromGrades(student.grades);
    student.grades.final = final;
    student.grades.remarks = remarks;

    saveStudentsFor(classId, students);
    render();
  });

  document.addEventListener("DOMContentLoaded", render);
})();


// ADD ATTENDANCE PAGE (add-attendance.html)
(function addAttendanceModule() {
  // 🧱 Prevent running twice
  if (window.__attendanceLoaded) return;
  window.__attendanceLoaded = true;

  const path = window.location.pathname;
  if (
    !path.endsWith("add-attendance.html") &&
    !path.endsWith("add-attendances.html")
  ) return;

  const classId = getClassIdFromURL();
  const currentClass = getClassById(classId);
  if (!currentClass) {
    alert("No class selected.");
    window.location.href = "class.html";
    return;
  }

  // set subject header
  const subjectEl = document.querySelector(".subjectname");
  if (subjectEl) subjectEl.textContent = `${currentClass.name} - ${currentClass.semester || ""}`;

  // inside addAttendanceModule -> replace the render() function with:
  function render() {
    const tableBody = document.getElementById("tableBody");
    if (!tableBody) return;
    const students = loadStudentsFor(classId) || [];
    tableBody.innerHTML = "";
    if (!students.length) {
      tableBody.innerHTML = `<tr><td colspan="4">No students added yet.</td></tr>`;
      return;
    }

    students.forEach((s, i) => {
      if (!s.attendance) s.attendance = [];
      const total = s.attendance.length;
      const present = s.attendance.filter(a => a.status === "Present").length;
      const absent = total - present;

      const tr = document.createElement("tr");
      tr.innerHTML = `
            <td>${s.name}</td>
            <td class="present-count">${present}</td>
            <td class="absent-count">${absent}</td>
            <td>
              <select class="att-select" data-index="${i}">
                <option value="">Mark</option>
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
              </select>
            </td>
          `;
      tableBody.appendChild(tr);
    });
  }

  // Use delegated change listener so it works even if tbody is recreated
  document.addEventListener("change", (e) => {
    const el = e.target;
    if (!el.classList || !el.classList.contains("att-select")) return;

    const idx = Number(el.dataset.index);
    const val = el.value;
    if (!val) return;

    const students = loadStudentsFor(classId) || [];
    const student = students[idx];
    if (!student) return;
    if (!student.attendance) student.attendance = [];

    // prevent duplicate marking for same date
    const today = new Date().toLocaleDateString();
    const alreadyMarked = student.attendance.some(a => a.date === today);
    if (alreadyMarked) {
      alert(`${student.name} is already marked for today.`);
      // reset select to default
      el.value = "";
      return;
    }

    student.attendance.push({ date: today, status: val });
    saveStudentsFor(classId, students);
    render();
  });

  // initial render once DOM is ready
  document.addEventListener("DOMContentLoaded", render);
})();



// DASHBOARD MODULE (dashboard.html) — minimal & dynamic
(function dashboardModule() {
  if (!pathEndsWith('dashboard.html')) return;

  function readClassesDashboard() { try { return JSON.parse(localStorage.getItem('classesList_' + (currentUser() || 'guest'))) || []; } catch { return []; } }
  function loadStudentsDashboard(classId) { try { return JSON.parse(localStorage.getItem(`studentsList_${currentUser() || 'guest'}_${classId}`)) || []; } catch { return []; } }

  const totalStudentsEl = document.getElementById('totalStudents');
  const totalClassesEl = document.getElementById('totalClasses');
  const totalPresentEl = document.getElementById('totalPresent');
  const totalAbsentEl = document.getElementById('totalAbsent');
  const classesListEl = document.getElementById('classesList');
  const canvas = document.getElementById('attendanceChart');

  const classes = readClassesDashboard();
  let totalStudents = 0, totalPresent = 0, totalAbsent = 0;
  const labels = [], presents = [], absents = [];

  if (classesListEl) classesListEl.innerHTML = '';

  classes.forEach(c => {
    const students = loadStudentsDashboard(c.id);
    const presentCount = students.reduce((acc, s) => acc + ((s.attendance || []).filter(a => a.status === 'Present').length), 0);
    const absentCount = students.reduce((acc, s) => acc + ((s.attendance || []).filter(a => a.status === 'Absent').length), 0);
    const studentCount = students.length;

    totalStudents += studentCount;
    totalPresent += presentCount;
    totalAbsent += absentCount;

    labels.push(c.name);
    presents.push(presentCount);
    absents.push(absentCount);

    if (classesListEl) {
      const div = document.createElement('div');
      div.className = 'class-item';
      div.innerHTML = `
        <div>
          <div style="font-weight:700">${c.name}</div>
          <div class="meta">${c.semester}</div>
        </div>
        <div class="counts">
          <div style="font-weight:700">${studentCount}</div>
          <div class="small">${presentCount} P • ${absentCount} A</div>
          <div style="margin-top:6px"><a href="class-details.html?classId=${c.id}" style="color:var(--accent);text-decoration:none;font-weight:600">Open</a></div>
        </div>`;
      classesListEl.appendChild(div);
    }
  });

  if (totalStudentsEl) totalStudentsEl.textContent = totalStudents;
  if (totalClassesEl) totalClassesEl.textContent = classes.length;
  if (totalPresentEl) totalPresentEl.textContent = totalPresent;
  if (totalAbsentEl) totalAbsentEl.textContent = totalAbsent;

  // optional simple canvas chart
  if (canvas && labels.length > 0) {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const maxVal = Math.max(...presents, ...absents, 1);
    const padding = 30;
    const barGroupHeight = 28;
    const gap = 18;
    const startX = 140;
    const usableWidth = canvas.width - startX - padding;
    ctx.font = '14px Poppins';
    ctx.fillStyle = '#cfcfcf';
    labels.forEach((label, i) => {
      const y = padding + i * (barGroupHeight + gap);
      ctx.fillStyle = '#cfcfcf';
      ctx.fillText(label, 10, y + 16);
      const presentW = Math.round((presents[i] / maxVal) * usableWidth);
      ctx.fillStyle = 'rgba(0,184,148,0.9)';
      ctx.fillRect(startX, y, presentW, barGroupHeight / 2 - 2);
      const absentW = Math.round((absents[i] / maxVal) * usableWidth);
      ctx.fillStyle = 'rgba(255,99,132,0.85)';
      ctx.fillRect(startX, y + barGroupHeight / 2 + 2, absentW, barGroupHeight / 2 - 2);
      ctx.fillStyle = '#cfcfcf';
      ctx.fillText(`${presents[i]} P`, startX + presentW + 8, y + 12);
      ctx.fillText(`${absents[i]} A`, startX + absentW + 8, y + barGroupHeight - 2);
    });
  } else if (canvas && labels.length === 0) {
    const ctx = canvas.getContext('2d');
    ctx.font = '14px Poppins';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('No attendance data yet. Add classes & mark attendance to populate chart.', 16, 30);
  }
})();



// Logout button functionality
document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.querySelector(".logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("currentUser"); // or clear() if you want to reset everything
      window.location.href = "index.html";
    });
  }
});



// PROFILE PAGE MODULE (profile.html)
(function profileModule() {
  if (!pathEndsWith("profile.html")) return;

  const username = localStorage.getItem("loggedInUser");
  if (!username) {
    window.location.href = "index.html";
    return;
  }

  // Profile elements
  const nameEl = document.getElementById("profileName");
  const emailEl = document.getElementById("profileEmail");
  const joinedEl = document.getElementById("profileJoined");
  const photoEl = document.getElementById("profilePhoto");
  const uploadBtn = document.getElementById("uploadBtn");

  // Load stored user info
  const users = JSON.parse(localStorage.getItem("users")) || [];
  const userData = users.find(u => u.username === username);

  // Default profile info if not found
  const displayName = userData?.fullName || username;
  const displayEmail = userData?.email || "No email provided";
  const displayJoined = userData?.joined || "Unknown";

  if (nameEl) nameEl.textContent = displayName;
  if (emailEl) emailEl.textContent = displayEmail;
  if (joinedEl) joinedEl.textContent = `Joined: ${displayJoined}`;

  // Load or set default photo
  const savedPhoto = localStorage.getItem(`profilePhoto_${username}`);
  if (photoEl) {
    photoEl.src = savedPhoto || "image/default-profile.png";
  }

  // Upload handler
  if (uploadBtn) {
    uploadBtn.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result;
        localStorage.setItem(`profilePhoto_${username}`, base64);
        if (photoEl) photoEl.src = base64;
      };
      reader.readAsDataURL(file);
    });
  }
})();

// Replace the duplicate import IIFEs with one safe importer
(function studentsImportHandler() {
  const page = window.location.pathname.split('/').pop();
  if (!page.includes("add-students")) return; // only on add-students page

  const classId = getClassIdFromURL();
  if (!classId) return;

  window.importStudents = function () {
    const fileEl = document.getElementById("excelStudents");
    if (!fileEl || !fileEl.files || !fileEl.files[0]) return alert("Please select an Excel file.");

    const file = fileEl.files[0];
    const reader = new FileReader();

    reader.onload = function (event) {
      try {
        const workbook = XLSX.read(event.target.result, { type: "binary" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        if (!rows || rows.length === 0) return alert("Excel file is empty or incorrectly formatted.");

        const students = loadStudentsFor(classId);

        rows.forEach(row => {
          const name = row.Name || row.name || row["Student Name"] || "";
          if (!name) return;
          if (students.some(s => s.name.toLowerCase() === String(name).toLowerCase())) return;

          students.push({
            id: Date.now() + Math.random(),
            name: String(name).trim(),
            grades: {
              prelim: row.Prelim || "",
              midterm: row.Midterm || "",
              semifinals: row.Semifinals || "",
              finals: row.Finals || "",
              final: "",
              remarks: ""
            },
            scores: { quiz: "", project: "", exam: "", average: "" },
            attendance: []
          });
        });

        saveStudentsFor(classId, students);
        if (typeof renderStudentTable === "function") renderStudentTable(classId);
        alert("Students imported successfully.");
      } catch (err) {
        console.error("Import failed:", err);
        alert("Failed to import file. Open console for details.");
      }
    };

    // modern browsers support readAsBinaryString; fallback to ArrayBuffer if needed
    if (FileReader.prototype.readAsBinaryString) {
      reader.readAsBinaryString(file);
    } else {
      reader.readAsArrayBuffer(file);
      reader.onload = function (event) {
        const data = new Uint8Array(event.target.result);
        const arr = [];
        for (let i = 0; i < data.length; ++i) arr.push(String.fromCharCode(data[i]));
        const bstr = arr.join("");
        try {
          const workbook = XLSX.read(bstr, { type: "binary" });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
          // reuse above logic by calling the onload handler again
          reader.onload({ target: { result: bstr } });
        } catch (err) {
          console.error(err);
          alert("Failed to read file.");
        }
      };
    }
  };
})();

