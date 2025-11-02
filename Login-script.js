// =============================
// Login-script.js (final, stable)
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
// STORAGE HELPERS (shared)
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
function studentsKey(classId) {
  return `studentsList_${classId}`;
}
function loadStudentsFor(classId) {
  if (!classId) return [];
  return JSON.parse(localStorage.getItem(studentsKey(classId))) || [];
}
function saveStudentsFor(classId, list) {
  if (!classId) return;
  localStorage.setItem(studentsKey(classId), JSON.stringify(list));
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

  // expose global addClass because your HTML calls it inline
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
    // ensure an empty student list is created for this class (keeps independence)
    saveStudentsFor(newClass.id, []);
    nameInput.value = "";
    semesterSelect.value = "";
    renderClasses();
  };

  // expose removeClass globally (HTML uses inline)
  window.removeClass = function(index) {
    if (!confirm("Remove this class and all its student data?")) return;
    const c = classesList[index];
    if (c?.id) {
      localStorage.removeItem(studentsKey(c.id));
    }
    classesList.splice(index, 1);
    writeClasses(classesList);
    renderClasses();
  };

  renderClasses();
})();

// -----------------------------
// class-details.html module
// - Patches card links to include classId automatically
// - Optionally shows a student preview table if present
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

  // Update heading
  const subjectEl = document.querySelector(".subjectname");
  if (subjectEl) subjectEl.textContent = `${currentClass.name} - ${currentClass.semester}`;

  // Patch card buttons (handles many HTML variants)
  // We search for any element with class "card-btn" and modify its onclick href
  document.querySelectorAll(".card-btn").forEach(btn => {
    // 1) If element has a dataset.target attribute, use it
    if (btn.dataset && btn.dataset.target) {
      btn.onclick = (e) => {
        e.preventDefault();
        window.location.href = `${btn.dataset.target}${btn.dataset.target.includes('?') ? '&' : '?'}classId=${classId}`;
      };
      return;
    }

    // 2) If it has an inline onclick that sets window.location.href, extract and patch
    const onclickAttr = btn.getAttribute && btn.getAttribute('onclick');
    if (onclickAttr && onclickAttr.includes('window.location.href')) {
      const m = onclickAttr.match(/window\.location\.href\s*=\s*['"]([^'"]+)['"]/);
      if (m && m[1]) {
        const targetUrl = m[1];
        btn.removeAttribute('onclick');
        btn.style.cursor = 'pointer';
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          // append classId if not already present
          const final = targetUrl + (targetUrl.includes('?') ? '&' : '?') + 'classId=' + encodeURIComponent(classId);
          window.location.href = final;
        });
        return;
      }
    }

    // 3) As fallback: if it's a button wrapping a link or has inner <a>, patch anchor href
    const anchor = btn.querySelector && btn.querySelector('a[href]');
    if (anchor) {
      const href = anchor.getAttribute('href');
      if (href) {
        anchor.addEventListener('click', (e) => {
          e.preventDefault();
          const final = href + (href.includes('?') ? '&' : '?') + 'classId=' + encodeURIComponent(classId);
          window.location.href = final;
        });
        return;
      }
    }

    // 4) Last fallback: if button text hints at target, map common words to filenames
    const txt = (btn.textContent || '').toLowerCase();
    if (txt.includes('student')) {
      btn.addEventListener('click', () => window.location.href = `add-students.html?classId=${classId}`);
    } else if (txt.includes('score')) {
      btn.addEventListener('click', () => window.location.href = `add-scores.html?classId=${classId}`);
    } else if (txt.includes('grade')) {
      btn.addEventListener('click', () => window.location.href = `add-grades.html?classId=${classId}`);
    } else if (txt.includes('attend')) {
      btn.addEventListener('click', () => window.location.href = `add-attendances.html?classId=${classId}`);
    }
  });

  // Optional: if page includes a students table (preview), render it
  const tableBody = document.getElementById("tableBody");
  if (tableBody) {
    let students = loadStudentsFor(classId);
    function renderStudents() {
      tableBody.innerHTML = "";
      if (!students || students.length === 0) {
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
    // expose small helpers used by inline onclicks
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
// This defines window.addStudent(), window.editStudent(), window.deleteStudent() for inline HTML.
(function addStudentsModule() {
  // support filenames: add-students.html
  if (!window.location.pathname.endsWith("add-students.html")) return;

  const classId = getClassIdFromURL();
  const currentClass = getClassById(classId);
  if (!classId || !currentClass) {
    alert("No class selected. Returning to class list.");
    window.location.href = "class.html";
    return;
  }

  // update header title if present
  const subjectEl = document.querySelector(".subjectname");
  if (subjectEl) subjectEl.textContent = `${currentClass.name} - ${currentClass.semester}`;

  let students = loadStudentsFor(classId);
  const tableBody = document.getElementById("tableBody");

  function render() {
    if (!tableBody) return;
    tableBody.innerHTML = "";
    if (!students || students.length === 0) {
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

  // global functions (HTML calls these inline)
  window.addStudent = function() {
    const nameInput = document.getElementById("studentNameInput");
    if (!nameInput) return;
    const name = nameInput.value.trim();
    if (!name) return alert("Please enter a student's name.");
    const newStudent = {
      id: Date.now(),
      name,
      scores: { quiz: "", exam: "", project: "" },
      grades: { prelim: "", midterm: "", finals: "", finalGrade: "", remark: "" },
      attendance: []
    };
    students.push(newStudent);
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

  // auto-save on leave, just in case
  window.addEventListener("beforeunload", () => saveStudentsFor(classId, students));

  render();
})();

// -----------------------------
// add-scores.html module
// -----------------------------
(function addScoresModule() {
  // accept both add-score.html and add-scores.html filenames
  if (!window.location.pathname.endsWith("add-score.html") && !window.location.pathname.endsWith("add-scores.html")) return;

  const classId = getClassIdFromURL();
  const currentClass = getClassById(classId);
  if (!classId || !currentClass) {
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
    if (!students || students.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="5">No students added yet.</td></tr>`;
      return;
    }
    students.forEach(s => {
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

  window.addEventListener("beforeunload", () => saveStudentsFor(classId, students));

  render();
})();

// -----------------------------
// add-grades.html module
// -----------------------------
(function addGradesModule() {
  // accept add-grade.html and add-grades.html
  if (!window.location.pathname.endsWith("add-grade.html") && !window.location.pathname.endsWith("add-grades.html")) return;

  const classId = getClassIdFromURL();
  const currentClass = getClassById(classId);
  if (!classId || !currentClass) {
    alert("No class selected. Returning to class list.");
    window.location.href = "class.html";
    return;
  }

  const subjectEl = document.querySelector(".subjectname");
  if (subjectEl) subjectEl.textContent = `${currentClass.name} - ${currentClass.semester}`;

  let students = loadStudentsFor(classId);
  const tableBody = document.getElementById("tableBody");

  function computeFinal(prelim, midterm, finals) {
    const p = Number(prelim) || 0;
    const m = Number(midterm) || 0;
    const f = Number(finals) || 0;
    return Math.round(((p + m + f) / 3) * 100) / 100;
  }

  function render() {
    if (!tableBody) return;
    tableBody.innerHTML = "";
    if (!students || students.length === 0) {
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

  document.addEventListener("input", (e) => {
    if (!e.target.classList.contains("grade-input")) return;
    const id = Number(e.target.dataset.id);
    const field = e.target.dataset.field;
    const val = e.target.value;
    const student = students.find(x => x.id === id);
    if (!student) return;
    student.grades = student.grades || {};
    student.grades[field] = val;
    const final = computeFinal(student.grades.prelim, student.grades.midterm, student.grades.finals);
    student.grades.finalGrade = final;
    student.grades.remark = final >= 75 ? "Passed" : "Failed";
    saveStudentsFor(classId, students);
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
// add-attendance.html module
// -----------------------------
(function addAttendanceModule() {
  // accept add-attendance.html and add-attendances.html
  if (!window.location.pathname.endsWith("add-attendance.html") && !window.location.pathname.endsWith("add-attendances.html")) return;

  const classId = getClassIdFromURL();
  const currentClass = getClassById(classId);
  if (!classId || !currentClass) {
    alert("No class selected. Returning to class list.");
    window.location.href = "class.html";
    return;
  }

  const subjectEl = document.querySelector(".subjectname");
  if (subjectEl) subjectEl.textContent = `${currentClass.name} - ${currentClass.semester}`;

  let students = loadStudentsFor(classId);
  const tableBody = document.getElementById("tableBody");
  const todayKey = new Date().toLocaleDateString();

  function render() {
    if (!tableBody) return;
    tableBody.innerHTML = "";
    if (!students || students.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="3">No students added yet.</td></tr>`;
      return;
    }
    students.forEach(s => {
      s.attendance = s.attendance || [];
      const last = s.attendance.length ? s.attendance.at(-1) : null;
      const lastStatus = last ? last.status : "";
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
    const val = e.target.value;
    const student = students.find(x => x.id === id);
    if (!student) return;
    if (!student.attendance) student.attendance = [];
    const dateStatus = { date: todayKey, status: val };
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
