// SIDEBAR TOGGLE
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


// Store the list of classes in localStorage
let classesList = JSON.parse(localStorage.getItem('classesList')) || [];

// Function to add a NEW CLASS
function addClass() {
  const nameInput = document.getElementById('addedClass');
  const semesterSelect = document.getElementById('semester-select'); // Use the new ID
  
  const className = nameInput.value.trim();
  const semester = semesterSelect.value;
  
  if (!className) return alert('Please enter a class name.');
  if (!semester) return alert('Please select a semester.');

  classesList.push({ 
    name: className, 
    semester: semester,
  });
  
  localStorage.setItem('classesList', JSON.stringify(classesList));
  
  // Clear inputs
  nameInput.value = '';
  semesterSelect.value = ''; 
  
  renderClasses();
}

// Function to remove a CLASS
function removeClass(index) {
  if (!confirm('Remove this class and all its student data?')) return;
  
  classesList.splice(index, 1);
  localStorage.setItem('classesList', JSON.stringify(classesList));
  
  renderClasses();
}

// Function to render the list of available classes
function renderClasses() {
  const listContainer = document.getElementById('availableclass');
  if (!listContainer) return;

  listContainer.innerHTML = '';

  classesList.forEach((c, i) => {
    const button = document.createElement('button');
    button.classList.add('classes');

    button.onclick = () => {
      window.location.href = `class-details.html?classIndex=${i}`;
    };

    button.innerHTML = `
      <div class="text">
        <h1>${c.name}</h1>
        <p>${c.semester}</p>
      </div>

      <button class="delete-btn" onclick="event.stopPropagation(); removeClass(${i})">
        <img src="image/trash.png" alt="Remove Class" class="delete-icon">
      </button>
    `;

    listContainer.appendChild(button);
  });
}

window.addEventListener('pageshow', function (event) {
  if (event.persisted) {
    classesList = JSON.parse(localStorage.getItem('classesList')) || [];
  }
  renderClasses();
});






let studentsList = JSON.parse(localStorage.getItem("studentsList")) || [];

function saveToLocalStorage() {
  localStorage.setItem("studentsList", JSON.stringify(studentsList));
}

function renderStudents() {
  const tableBody = document.getElementById("tableBody");
  tableBody.innerHTML = "";

  studentsList.forEach((student, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${student.name}</td>
      <td><input type="number" class="quarter first" step="0.25" min="1" max="5" value="${student.q1}" oninput="updateStudent(${index}, 'q1', this.value)" /></td>
      <td><input type="number" class="quarter second" step="0.25" min="1" max="5" value="${student.q2}" oninput="updateStudent(${index}, 'q2', this.value)" /></td>
      <td><input type="number" class="quarter third" step="0.25" min="1" max="5" value="${student.q3}" oninput="updateStudent(${index}, 'q3', this.value)" /></td>
      <td><input type="number" class="quarter fourth" step="0.25" min="1" max="5" value="${student.q4}" oninput="updateStudent(${index}, 'q4', this.value)" /></td>
      <td class="final-grade">${student.finalGrade || "0.00"}</td>
      <td class="remark" style="color:${student.remark === "Failed" ? "#d63031" : "#00b894"}">${student.remark || "N/A"}</td>
      <td>
        <button class="btn-edit" onclick="editStudent(${index})">Edit</button>
        <button class="btn-delete" onclick="deleteStudent(${index})">Delete</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

function addStudent() {
  const nameInput = document.getElementById("studentNameInput");
  const name = nameInput.value.trim();

  if (name === "") {
    alert("Please enter a student's name.");
    return;
  }

  studentsList.push({
    name,
    q1: "",
    q2: "",
    q3: "",
    q4: "",
    finalGrade: "0.00",
    remark: "N/A"
  });

  saveToLocalStorage();
  renderStudents();
  nameInput.value = "";
}

function updateStudent(index, quarter, value) {
  studentsList[index][quarter] = value;
  calculateCollegeGrade(index);
  saveToLocalStorage();
  renderStudents();
}

// College grading based on 1.00 to 5.00 system (lower is better)
function calculateCollegeGrade(index) {
  const s = studentsList[index];
  const q1 = parseFloat(s.q1) || 0;
  const q2 = parseFloat(s.q2) || 0;
  const q3 = parseFloat(s.q3) || 0;
  const q4 = parseFloat(s.q4) || 0;

  const average = (q1 + q2 + q3 + q4) / 4;

  s.finalGrade = average.toFixed(2);
  s.remark = getRemark(average);
}

// College grading remarks
function getRemark(average) {
  if (average <= 1.25) return "Passing";
  if (average <= 1.75) return "Passing";
  if (average <= 2.25) return "Passing";
  if (average <= 2.75) return "Passing";
  if (average <= 3.00) return "Passing";
  return "Failed";
}

function editStudent(index) {
  const newName = prompt("Edit Student Name:", studentsList[index].name);
  if (newName && newName.trim() !== "") {
    studentsList[index].name = newName.trim();
    saveToLocalStorage();
    renderStudents();
  }
}

function deleteStudent(index) {
  if (confirm("Are you sure you want to delete this student?")) {
    studentsList.splice(index, 1);
    saveToLocalStorage();
    renderStudents();
  }
}

window.addEventListener("DOMContentLoaded", renderStudents);
