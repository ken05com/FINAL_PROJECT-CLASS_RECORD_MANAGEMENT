// =============================
// Login-script.js (final, modular)
// =============================

// -----------------------------
// SIDEBAR TOGGLE (shared)
// -----------------------------
const openBtn = document.querySelector(".open-btn");
const sidebar = document.querySelector(".sidebar");

if (openBtn && sidebar) {
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
}

// -----------------------------
// CLASS STORAGE helpers (shared)
// -----------------------------
function readClasses() {
  return JSON.parse(localStorage.getItem("classesList")) || [];
}
function writeClasses(list) {
  localStorage.setItem("classesList", JSON.stringify(list));
}
function getClassIdFromURL() {
  return new URLSearchParams(window.location.search).get("classId");
}
function loadStudentsFor(classId) {
  return JSON.parse(localStorage.getItem(`studentsList_${classId}`)) || [];
}
function saveStudentsFor(classId, list) {
  localStorage.setItem(`studentsList_${classId}`, JSON.stringify(list));
}
function getClassById(classId) {
  const list = readClasses();
  return list.find(c => c.id == classId) || null;
}

// -----------------------------
// class.html module (create/list classes)
// -----------------------------
(function classPageModule() {
  if (!window.location.pathname.endsWith("class.html")) return;

  let classesList = readClasses();

  function renderClasses() {
    const container = document.getElementById("availableclass");
    if (!container) return;
    container.innerHTML = "";
    if (classesList.length === 0) {
      container.innerHTML = `<p class="no-class">No classes created yet.</p>`;
      return;
    }
    classesList.forEach((c, i) => {
      const btn = document.createElement("button");
      btn.className = "classes";
      btn.onclick = () => window.location.href = `class-details.html?classId=${c.id}`;
      btn.innerHTML = `
        <div class="text">
          <h1>${c.name}</h1>
          <p>${c.semester}</p>
        </div>
        <button class="delete-btn" onclick="event.stopPropagation(); removeClass(${i})">
          <img src="image/trash.png" alt="Remove Class" class="delete-icon">
        </button>
      `;
      container.appendChild(btn);
    });
  }

  window.addClass = function() {
    const nameInput = document.getElementById("addedClass");
    const semesterSelect = document.getElementById("semester-select");
    const className = nameInput?.value.trim();
    const semester = semesterSelect?.value;
    if (!className) return alert("Please enter a class name.");
    if (!semester) return alert("Please select a semester.");
    const newClass = { id: Date.now(), name: className, semester };
    classesList.push(newClass);
    writeClasses(classesList);
    nameInput.value = "";
    semesterSelect.value = "";
    renderClasses();
  };

  window.removeClass = function(index) {
    if (!confirm("Remove this class and all its student data?")) return;
    const c = classesList[index];
    if (c?.id) {
      // remove related data keys (students etc.)
      localStorage.removeItem(`studentsList_${c.id}`);
      localStorage.removeItem(`scoresList_${c.id}`);
      localStorage.removeItem(`gradesList_${c.id}`);
      localStorage.removeItem(`attendanceList_${c.id}`);
    }
    classesList.splice(index, 1);
    writeClasses(classesList);
    renderClasses();
  };

  renderClasses();
})();

// -----------------------------
// class-details.html module (cards + optional students preview)
// -----------------------------
(function classDetailsModule() {
  if (!window.location.pathname.endsWith("class-details.html")) return;

  const classId = getClassIdFromURL();
  const currentClass = getClassById(classId);
  if (!currentClass) {
    alert("No class selected. Returning to class list.");
    window.location.href = "class.html";
    return;
  }

  // update header title
  const subjectEl = document.querySelector(".subjectname");
  if (subjectEl) subjectEl.textContent = `${currentClass.name} - ${currentClass.semester}`;

  // wire up card buttons (if present)
  const btnMap = [
    { id: "addStudentsBtn", page: "add-students.html" },
    { id: "addScoresBtn", page: "add-score.html" },
    { id: "addGradesBtn", page: "add-grade.html" },
    { id: "addAttendanceBtn", page: "add-attendance.html" }
  ];
  btnMap.forEach(({id, page}) => {
    const btn = document.getElementById(id);
    if (btn) btn.onclick = () => window.location.href = `${page}?classId=${classId}`;
  });

  // If this page contains a students table (optional), render it
  const tableBody = document.getElementById("tableBody");
  if (tableBody) {
    let students = loadStudentsFor(classId);
    function renderStudents() {
      tableBody.innerHTML = "";
      if (students.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="2" style="text-align:center;">No students added yet.</td></tr>`;
        return;
      }
      students.forEach((s, i) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${s.name}</td>
          <td>
            <button class="btn-edit" onclick="editStudentFromDetails(${i})">Edit</button>
            <button class="btn-delete" onclick="deleteStudentFromDetails(${i})">Delete</button>
          </td>
        `;
        tableBody.appendChild(tr);
      });
    }
    window.editStudentFromDetails = function(index) {
      const studentsList = loadStudentsFor(classId);
      const newName = prompt("Edit Student Name:", studentsList[index]?.name || "");
      if (newName && newName.trim() !== "") {
        studentsList[index].name = newName.trim();
        saveStudentsFor(classId, studentsList);
        renderStudents();
      }
    };
    window.deleteStudentFromDetails = function(index) {
      if (!confirm("Delete this student?")) return;
      const studentsList = loadStudentsFor(classId);
      studentsList.splice(index, 1);
      saveStudentsFor(classId, studentsList);
      renderStudents();
    };
    renderStudents();
  }
})();

// -----------------------------
// add-students.html module
// -----------------------------
(function addStudentsModule() {
  if (!window.location.pathname.endsWith("add-students.html")) return;

  const classId = getClassIdFromURL();
  const currentClass = getClassById(classId);
  if (!currentClass) {
    alert("No class selected. Returning to class list.");
    window.location.href = "class.html";
    return;
  }

  // update header
  const subjectEl = document.querySelector(".subjectname");
  if (subjectEl) subjectEl.textContent = `${currentClass.name} - ${currentClass.semester}`;

  // students list
  let students = loadStudentsFor(classId);

  const tableBody = document.getElementById("tableBody");
  function render() {
    if (!tableBody) return;
    tableBody.innerHTML = "";
    if (students.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="2" style="text-align:center;">No students added yet.</td></tr>`;
      return;
    }
    students.forEach((s, idx) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${s.name}</td>
        <td>
          <button class="btn-edit" onclick="editStudent(${idx})">Edit</button>
          <button class="btn-delete" onclick="deleteStudent(${idx})">Delete</button>
        </td>
      `;
      tableBody.appendChild(tr);
    });
  }

  // expose functions used by HTML buttons (global, because HTML inline calls them)
  window.addStudent = function() {
    const nameInput = document.getElementById("studentNameInput");
    if (!nameInput) return;
    const name = nameInput.value.trim();
    if (!name) return alert("Please enter a student's name.");
    students.push({
      id: Date.now(),
      name,
      scores: { quiz: "", exam: "", project: "" },
      grades: { final: "" },
      attendance: []
    });
    saveStudentsFor(classId, students);
    nameInput.value = "";
    render();
  };

  window.editStudent = function(index) {
    const newName = prompt("Edit Student Name:", students[index]?.name || "");
    if (newName && newName.trim() !== "") {
      students[index].name = newName.trim();
      saveStudentsFor(classId, students);
      render();
    }
  };

  window.deleteStudent = function(index) {
    if (!confirm("Delete this student?")) return;
    students.splice(index, 1);
    saveStudentsFor(classId, students);
    render();
  };

  // auto-save on leave
  window.addEventListener("beforeunload", () => saveStudentsFor(classId, students));

  render();
})();

// -----------------------------
// add-score.html module
// -----------------------------
(function addScoresModule() {
  if (!window.location.pathname.endsWith("add-score.html")) return;

  const classId = getClassIdFromURL();
  const currentClass = getClassById(classId);
  if (!currentClass) {
    alert("No class selected. Returning to class list.");
    window.location.href = "class.html";
    return;
  }

  const subjectEl = document.querySelector(".subjectname");
  if (subjectEl) subjectEl.textContent = `${currentClass.name} - ${currentClass.semester}`;

  let students = loadStudentsFor(classId);
  const tableBody = document.getElementById("tableBody");

  function render() {
    if (!tableBody) return;
    tableBody.innerHTML = "";
    if (students.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="5">No students added yet.</td></tr>`;
      return;
    }
    students.forEach((s) => {
      if (!s.scores) s.scores = { quiz: "", exam: "", project: "" };
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${s.name}</td>
        <td><input type="number" min="0" max="100" value="${s.scores.quiz}" class="score-input" data-type="quiz" data-id="${s.id}"></td>
        <td><input type="number" min="0" max="100" value="${s.scores.exam}" class="score-input" data-type="exam" data-id="${s.id}"></td>
        <td><input type="number" min="0" max="100" value="${s.scores.project}" class="score-input" data-type="project" data-id="${s.id}"></td>
        <td><button class="btn-clear" data-id="${s.id}">Clear</button></td>
      `;
      tableBody.appendChild(tr);
    });
  }

  // input handler (delegated)
  document.addEventListener("input", (e) => {
    if (!e.target.classList.contains("score-input")) return;
    const id = Number(e.target.dataset.id);
    const type = e.target.dataset.type;
    const value = e.target.value;
    const student = students.find(x => x.id === id);
    if (!student) return;
    student.scores = student.scores || { quiz: "", exam: "", project: "" };
    student.scores[type] = value;
    saveStudentsFor(classId, students);
  });

  // clear handler
  document.addEventListener("click", (e) => {
    if (!e.target.matches(".btn-clear")) return;
    const id = Number(e.target.dataset.id);
    if (!confirm("Clear scores for this student?")) return;
    const student = students.find(x => x.id === id);
    if (!student) return;
    student.scores = { quiz: "", exam: "", project: "" };
    saveStudentsFor(classId, students);
    render();
  });

  // auto-save on leave
  window.addEventListener("beforeunload", () => saveStudentsFor(classId, students));

  render();
})();

// -----------------------------
// add-grade.html module (auto compute / store final grade)
// -----------------------------
(function addGradesModule() {
  if (!window.location.pathname.endsWith("add-grade.html")) return;

  const classId = getClassIdFromURL();
  const currentClass = getClassById(classId);
  if (!currentClass) {
    alert("No class selected. Returning to class list.");
    window.location.href = "class.html";
    return;
  }

  const subjectEl = document.querySelector(".subjectname");
  if (subjectEl) subjectEl.textContent = `${currentClass.name} - ${currentClass.semester}`;

  let students = loadStudentsFor(classId);
  const tableBody = document.getElementById("tableBody");

  function computeFinal(prelim, midterm, finals) {
    // simple average; change weighting if you need
    const p = Number(prelim) || 0;
    const m = Number(midterm) || 0;
    const f = Number(finals) || 0;
    return Math.round(((p + m + f) / 3) * 100) / 100;
  }

  function render() {
    if (!tableBody) return;
    tableBody.innerHTML = "";
    if (students.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6">No students added yet.</td></tr>`;
      return;
    }
    students.forEach(s => {
      s.grades = s.grades || { prelim: "", midterm: "", finals: "", finalGrade: "", remark: "" };
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${s.name}</td>
        <td><input type="number" min="0" max="100" value="${s.grades.prelim}" class="grade-input" data-field="prelim" data-id="${s.id}"></td>
        <td><input type="number" min="0" max="100" value="${s.grades.midterm}" class="grade-input" data-field="midterm" data-id="${s.id}"></td>
        <td><input type="number" min="0" max="100" value="${s.grades.finals}" class="grade-input" data-field="finals" data-id="${s.id}"></td>
        <td class="final-grade-cell">${s.grades.finalGrade || ""}</td>
        <td class="remark-cell">${s.grades.remark || ""}</td>
      `;
      tableBody.appendChild(tr);
    });
  }

  // delegated input handler: update prelim/midterm/finals and compute final + remark
  document.addEventListener("input", (e) => {
    if (!e.target.classList.contains("grade-input")) return;
    const id = Number(e.target.dataset.id);
    const field = e.target.dataset.field;
    const val = e.target.value;
    const student = students.find(x => x.id === id);
    if (!student) return;
    student.grades = student.grades || {};
    student.grades[field] = val;
    // compute final
    const final = computeFinal(student.grades.prelim, student.grades.midterm, student.grades.finals);
    student.grades.finalGrade = final;
    student.grades.remark = final >= 75 ? "Passed" : "Failed"; // adjust pass threshold if needed
    saveStudentsFor(classId, students);
    // update cells visually (fast)
    // find the row and update final & remark
    const row = [...document.querySelectorAll("#tableBody tr")].find(r => r.querySelector(`.grade-input[data-id='${id}']`));
    if (row) {
      const finalCell = row.querySelector(".final-grade-cell");
      const remarkCell = row.querySelector(".remark-cell");
      if (finalCell) finalCell.textContent = student.grades.finalGrade;
      if (remarkCell) remarkCell.textContent = student.grades.remark;
    }
  });

  window.addEventListener("beforeunload", () => saveStudentsFor(classId, students));

  render();
})();

// -----------------------------
// add-attendance.html module (Option B: only today's attendance matters)
// -----------------------------
(function addAttendanceModule() {
  if (!window.location.pathname.endsWith("add-attendance.html")) return;

  const classId = getClassIdFromURL();
  const currentClass = getClassById(classId);
  if (!currentClass) {
    alert("No class selected. Returning to class list.");
    window.location.href = "class.html";
    return;
  }

  const subjectEl = document.querySelector(".subjectname");
  if (subjectEl) subjectEl.textContent = `${currentClass.name} - ${currentClass.semester}`;

  let students = loadStudentsFor(classId);
  const tableBody = document.getElementById("tableBody");

  // We'll store only today's status key inside each student as `attendanceToday: "present"|"absent"`
  const todayKey = new Date().toLocaleDateString();

  function render() {
    if (!tableBody) return;
    tableBody.innerHTML = "";
    if (students.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="3">No students added yet.</td></tr>`;
      return;
    }
    students.forEach(s => {
      // ensure attendance array exists (keeps history if you want)
      s.attendance = s.attendance || [];
      const lastStatus = s.attendance.length ? s.attendance.at(-1) : "";
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${s.name}</td>
        <td>${todayKey}</td>
        <td>
          <select class="attendance-select" data-id="${s.id}">
            <option value="present" ${lastStatus === "present" ? "selected" : ""}>Present</option>
            <option value="absent" ${lastStatus === "absent" ? "selected" : ""}>Absent</option>
          </select>
        </td>
      `;
      tableBody.appendChild(tr);
    });
  }

  document.addEventListener("change", (e) => {
    if (!e.target.classList.contains("attendance-select")) return;
    const id = Number(e.target.dataset.id);
    const val = e.target.value; // "present" or "absent"
    const student = students.find(x => x.id === id);
    if (!student) return;
    // Option B: only today's attendance matters — overwrite last entry
    if (!student.attendance) student.attendance = [];
    // remove last entry if it's same date? we store only status strings, but to keep consistent:
    // We'll store attendance as array of {date, status}
    const dateStatus = { date: todayKey, status: val };
    // if last entry date === today -> replace
    if (student.attendance.length && student.attendance.at(-1).date === todayKey) {
      student.attendance[student.attendance.length - 1] = dateStatus;
    } else {
      student.attendance.push(dateStatus);
    }
    saveStudentsFor(classId, students);
  });

  window.addEventListener("beforeunload", () => saveStudentsFor(classId, students));

  render();
})();
