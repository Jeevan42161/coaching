const STORAGE_KEY = "daymark-coaching-v1";
const today = new Date();
const todayISO = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const sessionOrder = { Morning: 0, Day: 1, Evening: 2 };
const makeId = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
const initials = (name) => name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
const escapeHTML = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

const seed = {
  classes: [
    { id: "class-8a", name: "Class 8A", grade: "Grade 8" },
    { id: "class-9a", name: "Class 9A", grade: "Grade 9" },
    { id: "class-10a", name: "Class 10A", grade: "Grade 10" },
    { id: "class-10b", name: "Class 10B", grade: "Grade 10" }
  ],
  students: [
    { id: "student-1", name: "Aarav Sharma", studentId: "ST-1042", classId: "class-10a", phone: "98765 43210", enrolled: "2026-04-12" },
    { id: "student-2", name: "Ananya Patel", studentId: "ST-1043", classId: "class-10a", phone: "98765 23841", enrolled: "2026-04-14" },
    { id: "student-3", name: "Kabir Mehta", studentId: "ST-1044", classId: "class-10a", phone: "98765 49132", enrolled: "2026-05-02" },
    { id: "student-4", name: "Meera Shah", studentId: "ST-1045", classId: "class-10a", phone: "98765 85617", enrolled: "2026-05-05" },
    { id: "student-5", name: "Vivaan Rao", studentId: "ST-1081", classId: "class-9a", phone: "98765 62840", enrolled: "2026-06-01" },
    { id: "student-6", name: "Ira Kapoor", studentId: "ST-1082", classId: "class-9a", phone: "98765 19753", enrolled: "2026-06-04" },
    { id: "student-7", name: "Reyansh Nair", studentId: "ST-1101", classId: "class-8a", phone: "98765 34129", enrolled: "2026-06-18" },
    { id: "student-8", name: "Diya Iyer", studentId: "ST-1120", classId: "class-10b", phone: "98765 72315", enrolled: "2026-07-08" }
  ],
  teachers: [
    { id: "teacher-1", name: "Priya Desai", subjectId: "subject-1", email: "priya@daymark.edu", phone: "98220 18420" },
    { id: "teacher-2", name: "Arjun Kulkarni", subjectId: "subject-2", email: "arjun@daymark.edu", phone: "98220 36914" },
    { id: "teacher-3", name: "Nisha Menon", subjectId: "subject-3", email: "nisha@daymark.edu", phone: "98220 51783" },
    { id: "teacher-4", name: "Rohan Gupta", subjectId: "subject-4", email: "rohan@daymark.edu", phone: "98220 93261" }
  ],
  subjects: [
    { id: "subject-1", name: "Mathematics", code: "MATH", color: "#557c50" },
    { id: "subject-2", name: "Physics", code: "PHYS", color: "#638496" },
    { id: "subject-3", name: "English", code: "ENG", color: "#a06c73" },
    { id: "subject-4", name: "Chemistry", code: "CHEM", color: "#ae874e" }
  ],
  periods: [
    { id: "period-1", session: "Morning", number: 1, classId: "class-10a", subjectId: "subject-1", teacherId: "teacher-1", start: "07:00", end: "07:50" },
    { id: "period-2", session: "Morning", number: 2, classId: "class-9a", subjectId: "subject-2", teacherId: "teacher-2", start: "08:00", end: "08:50" },
    { id: "period-3", session: "Day", number: 1, classId: "class-8a", subjectId: "subject-3", teacherId: "teacher-3", start: "10:00", end: "10:50" },
    { id: "period-4", session: "Day", number: 2, classId: "class-10b", subjectId: "subject-4", teacherId: "teacher-4", start: "11:00", end: "11:50" },
    { id: "period-5", session: "Evening", number: 1, classId: "class-10a", subjectId: "subject-2", teacherId: "teacher-2", start: "16:00", end: "16:50" },
    { id: "period-6", session: "Evening", number: 2, classId: "class-9a", subjectId: "subject-1", teacherId: "teacher-1", start: "17:00", end: "17:50" },
    { id: "period-7", session: "Evening", number: 3, classId: "class-8a", subjectId: "subject-3", teacherId: "teacher-3", start: "18:00", end: "18:50" }
  ],
  studentAttendance: {},
  teacherAttendance: {}
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && ["classes", "students", "teachers", "subjects", "periods"].every((key) => Array.isArray(saved[key]))) {
      const loaded = { ...seed, ...saved, studentAttendance: saved.studentAttendance || {}, teacherAttendance: saved.teacherAttendance || {} };
      loaded.teachers = loaded.teachers.map((teacher) => {
        if (teacher.subjectId) return teacher;
        const matchedSubject = loaded.subjects.find((subject) => subject.name.toLowerCase() === (teacher.subject || "").toLowerCase());
        const { subject, ...rest } = teacher;
        return { ...rest, subjectId: matchedSubject?.id || "" };
      });
      return loaded;
    }
  } catch (error) {
    console.warn("Could not load saved Daymark data.", error);
  }
  return structuredClone(seed);
}

let state = loadState();
let currentView = "overview";
let overviewSession = "Morning";
let timetableFilter = "All sessions";
let dialogType = "";
let editingId = "";
let toastTimer;

const byId = (collection, id) => state[collection].find((record) => record.id === id);
const className = (id) => byId("classes", id)?.name || "Removed class";
const teacherName = (id) => byId("teachers", id)?.name || "Removed teacher";
const subjectName = (id) => byId("subjects", id)?.name || "Removed subject";
const getPeriod = (id) => state.periods.find((period) => period.id === id);
const sortPeriods = (periods) => [...periods].sort((a, b) => sessionOrder[a.session] - sessionOrder[b.session] || a.number - b.number || a.start.localeCompare(b.start));
const studentKey = (date, periodId) => `${date}|${periodId}`;
const teacherKey = (date, periodId) => `${date}|${periodId}`;

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatDate(date, options = { month: "short", day: "numeric" }) {
  if (!date) return "";
  return new Intl.DateTimeFormat("en", options).format(new Date(`${date}T12:00:00`));
}

function formatTime(time) {
  if (!time) return "";
  return new Date(`2000-01-01T${time}:00`).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" }).replace(" ", "").toLowerCase();
}

function displayDaypart() {
  const hour = new Date().getHours();
  return hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
}

function setView(view) {
  currentView = view;
  document.querySelectorAll(".view").forEach((section) => section.classList.toggle("active", section.id === `view-${view}`));
  document.querySelectorAll(".nav-link[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  const viewLabels = { overview: "Overview", "students-attendance": "Students", "teachers-attendance": "Teachers", timetable: "Classes & periods", "students-admin": "Student roster", "teachers-admin": "Teachers", "subjects-admin": "Subjects" };
  document.getElementById("breadcrumb-current").textContent = viewLabels[view] || "Overview";
  document.getElementById("sidebar").classList.remove("open");
  if (view === "students-attendance") renderStudentRegister();
  if (view === "teachers-attendance") renderTeacherAttendance();
  if (view === "timetable") renderTimetable();
  if (view === "students-admin") renderStudentsAdmin();
}

function setOptions(select, options, selected, placeholder = "") {
  const current = selected ?? select.value;
  select.innerHTML = `${placeholder ? `<option value="">${escapeHTML(placeholder)}</option>` : ""}${options.map((option) => `<option value="${escapeHTML(option.value)}">${escapeHTML(option.label)}</option>`).join("")}`;
  if (options.some((option) => option.value === current)) select.value = current;
}

function renderOverview() {
  const allSessions = ["Morning", "Day", "Evening"];
  const studentMarksToday = Object.entries(state.studentAttendance).filter(([key]) => key.startsWith(`${todayISO}|`)).flatMap(([, values]) => Object.values(values));
  const present = studentMarksToday.filter((status) => status === "present").length;
  const absent = studentMarksToday.filter((status) => status === "absent").length;
  const totalStudents = state.students.length;
  const scheduledStudentCount = state.periods.reduce((sum, period) => sum + state.students.filter((student) => student.classId === period.classId).length, 0);
  const percentage = scheduledStudentCount ? Math.round((present / scheduledStudentCount) * 100) : 0;
  const currentDate = new Date(`${todayISO}T12:00:00`);
  document.getElementById("overview-date").textContent = new Intl.DateTimeFormat("en", { weekday: "long", day: "numeric", month: "long" }).format(currentDate).toUpperCase();
  document.querySelector(".overview-heading h1").innerHTML = `Good ${displayDaypart()}<span class="heading-period">.</span>`;
  document.getElementById("today-label").textContent = new Intl.DateTimeFormat("en", { weekday: "short", day: "numeric", month: "short" }).format(currentDate);
  document.getElementById("snapshot-date").textContent = formatDate(todayISO);
  document.getElementById("student-nav-count").textContent = totalStudents;

  const stats = [
    { label: "Enrolled students", value: totalStudents, hint: "across all classes", icon: "♙" },
    { label: "Active classes", value: state.classes.length, hint: "on the roster", icon: "▦" },
    { label: "Periods today", value: state.periods.length, hint: "across 3 sessions", icon: "◷" },
    { label: "Teaching staff", value: state.teachers.length, hint: "on the team", icon: "♧" }
  ];
  document.getElementById("overview-stats").innerHTML = stats.map((stat) => `<article class="stat-card"><div class="stat-top"><span>${stat.label}</span><span class="stat-icon">${stat.icon}</span></div><div class="stat-value">${stat.value}<span class="stat-hint">${stat.hint}</span></div></article>`).join("");

  allSessions.forEach((session) => {
    document.querySelector(`[data-session-count="${session}"]`).textContent = state.periods.filter((period) => period.session === session).length;
  });
  document.querySelectorAll("#overview-session-tabs .session-tab").forEach((button) => button.classList.toggle("active", button.dataset.session === overviewSession));
  const sessionPeriods = sortPeriods(state.periods.filter((period) => period.session === overviewSession));
  document.getElementById("overview-period-list").innerHTML = sessionPeriods.length ? sessionPeriods.map((period) => `<div class="period-row"><span class="period-time">${formatTime(period.start)}<br>${formatTime(period.end)}</span><span class="period-info"><strong>${escapeHTML(className(period.classId))} · ${escapeHTML(subjectName(period.subjectId))}</strong><span>Period ${period.number} · ${escapeHTML(teacherName(period.teacherId))}</span></span><span class="period-tag">${state.students.filter((student) => student.classId === period.classId).length} students</span></div>`).join("") : `<div class="empty-inline">No periods scheduled for ${overviewSession.toLowerCase()}.</div>`;

  const markedCount = present + absent;
  const ringDegrees = scheduledStudentCount ? Math.round((present / scheduledStudentCount) * 360) : 0;
  document.getElementById("snapshot-ring").style.background = `conic-gradient(var(--green) ${ringDegrees}deg, #edf1eb ${ringDegrees}deg)`;
  document.getElementById("snapshot-percent").textContent = `${percentage}%`;
  document.getElementById("snapshot-total").textContent = `${present} / ${scheduledStudentCount}`;
  document.getElementById("legend-present-count").textContent = present;
  document.getElementById("legend-absent-count").textContent = absent;
  document.getElementById("legend-unmarked-count").textContent = Math.max(0, scheduledStudentCount - markedCount);
  document.getElementById("snapshot-note-text").textContent = markedCount ? `${markedCount} of ${scheduledStudentCount} class-period marks recorded today.` : "Mark attendance to see your daily summary.";

  const classesMarkup = state.classes.map((classRecord) => {
    const students = state.students.filter((student) => student.classId === classRecord.id);
    const records = sortPeriods(state.periods.filter((period) => period.classId === classRecord.id));
    const marks = records.flatMap((period) => students.map((student) => state.studentAttendance[studentKey(todayISO, period.id)]?.[student.id])).filter(Boolean);
    const presentMarks = marks.filter((mark) => mark === "present").length;
    const percent = marks.length ? Math.round((presentMarks / marks.length) * 100) : 0;
    return `<div class="class-attendance-row"><span class="class-initial">${escapeHTML(initials(classRecord.name))}</span><span class="class-row-copy"><strong>${escapeHTML(classRecord.name)}</strong><small>${students.length} students · ${records.length} periods today</small></span><span class="mini-progress"><i style="width:${percent}%"></i></span><span class="class-percent">${marks.length ? `${percent}%` : "—"}</span></div>`;
  }).join("");
  document.getElementById("class-attendance-list").innerHTML = classesMarkup || `<div class="empty-inline">No classes have been added yet.</div>`;

  const teacherPeriods = sortPeriods(state.periods);
  const teacherMarkup = teacherPeriods.slice(0, 4).map((period) => {
    const status = state.teacherAttendance[teacherKey(todayISO, period.id)] || "";
    const initialsText = initials(teacherName(period.teacherId));
    return `<div class="teacher-checkin-row"><span class="teacher-avatar">${escapeHTML(initialsText)}</span><span class="teacher-row-copy"><strong>${escapeHTML(teacherName(period.teacherId))}</strong><small>${escapeHTML(className(period.classId))} · ${escapeHTML(subjectName(period.subjectId))} · ${formatTime(period.start)}</small></span><span class="checkin-status ${status}">${status ? status[0].toUpperCase() + status.slice(1) : "Pending"}</span></div>`;
  }).join("");
  document.getElementById("teacher-checkin-list").innerHTML = teacherMarkup || `<div class="empty-inline">No periods scheduled yet.</div>`;
}

function updateStudentPeriodOptions() {
  const select = document.getElementById("student-period");
  const session = document.getElementById("student-session").value;
  const periods = sortPeriods(state.periods.filter((period) => period.session === session));
  const options = periods.map((period) => ({ value: period.id, label: `Period ${period.number} · ${className(period.classId)} · ${subjectName(period.subjectId)}` }));
  const previousValue = select.value;
  setOptions(select, options, options.some((option) => option.value === previousValue) ? previousValue : options[0]?.value, periods.length ? "Choose a period" : "No periods in this session");
}

function renderStudentRegister() {
  const date = document.getElementById("student-date").value || todayISO;
  const period = getPeriod(document.getElementById("student-period").value);
  const body = document.getElementById("student-register-body");
  const empty = document.getElementById("student-empty");
  if (!period) {
    body.innerHTML = "";
    empty.classList.remove("hidden");
    document.getElementById("register-class-title").textContent = state.periods.length ? "Choose a class period" : "No class periods available";
    document.getElementById("register-period-detail").textContent = "CLASS REGISTER";
    document.getElementById("register-teacher-detail").textContent = state.periods.length ? "Select a scheduled period to open the student register." : "Add a period to your timetable before taking attendance.";
    document.getElementById("register-footer-summary").textContent = "Attendance is saved automatically.";
    document.getElementById("student-progress").innerHTML = "No period selected";
    return;
  }
  const students = state.students.filter((student) => student.classId === period.classId).sort((a, b) => a.name.localeCompare(b.name));
  const attendance = state.studentAttendance[studentKey(date, period.id)] || {};
  const marked = students.filter((student) => attendance[student.id]).length;
  document.getElementById("register-class-title").textContent = `${className(period.classId)} · Period ${period.number}`;
  document.getElementById("register-period-detail").textContent = `${period.session.toUpperCase()} SESSION · ${formatTime(period.start)}–${formatTime(period.end)}`;
  document.getElementById("register-teacher-detail").textContent = `${subjectName(period.subjectId)} with ${teacherName(period.teacherId)}`;
  document.getElementById("student-progress").innerHTML = `<strong>${marked} of ${students.length}</strong> marked`;
  document.getElementById("register-footer-summary").textContent = `${students.length} students · ${marked} marked · ${formatDate(date, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}`;
  empty.classList.toggle("hidden", students.length > 0);
  document.querySelector(".student-table").classList.toggle("hidden", students.length === 0);
  body.innerHTML = students.map((student, index) => {
    const status = attendance[student.id] || "";
    return `<tr><td><span class="person-cell"><span class="person-avatar tone-${index % 4}">${escapeHTML(initials(student.name))}</span><strong>${escapeHTML(student.name)}</strong></span></td><td><span class="student-id">${escapeHTML(student.studentId)}</span></td><td><span class="class-tag">${escapeHTML(className(student.classId))}</span></td><td><span class="attendance-toggle"><button class="attendance-option ${status === "present" ? "selected present" : ""}" data-attendance="student" data-student="${student.id}" data-status="present" aria-pressed="${status === "present"}">Present</button><button class="attendance-option ${status === "absent" ? "selected absent" : ""}" data-attendance="student" data-student="${student.id}" data-status="absent" aria-pressed="${status === "absent"}">Absent</button></span></td></tr>`;
  }).join("");
}

function renderTeacherAttendance() {
  const date = document.getElementById("teacher-date").value || todayISO;
  const selectedSession = document.getElementById("teacher-session").value;
  const periods = sortPeriods(state.periods.filter((period) => selectedSession === "All sessions" || period.session === selectedSession));
  const container = document.getElementById("teacher-periods");
  const marked = periods.filter((period) => state.teacherAttendance[teacherKey(date, period.id)]).length;
  document.getElementById("teacher-progress").innerHTML = `<strong>${marked} of ${periods.length}</strong> periods checked in`;
  if (!periods.length) {
    container.innerHTML = `<div class="panel empty-state"><span class="empty-icon">◷</span><strong>No periods scheduled</strong><span>Add a timetable period before taking teacher attendance.</span><button class="button button-primary" data-view-jump="timetable">Open timetable ↗</button></div>`;
    return;
  }
  container.innerHTML = periods.map((period) => {
    const status = state.teacherAttendance[teacherKey(date, period.id)] || "";
    return `<article class="panel teacher-period-card"><div class="teacher-card-top"><div><span class="teacher-card-period">PERIOD ${period.number} · ${formatTime(period.start)}–${formatTime(period.end)}</span><h2>${escapeHTML(className(period.classId))}</h2></div><span class="teacher-session-label">${escapeHTML(period.session)}</span></div><div class="teacher-card-meta"><span class="teacher-meta-item"><small>Teacher</small><strong>${escapeHTML(teacherName(period.teacherId))}</strong></span><span class="teacher-meta-item"><small>Subject</small><strong>${escapeHTML(subjectName(period.subjectId))}</strong></span></div><div class="teacher-card-footer"><span class="muted-copy">${status ? `Marked ${status}` : "Awaiting check-in"}</span><span class="teacher-attendance-actions"><button class="teacher-mark ${status === "present" ? "selected present" : ""}" data-attendance="teacher" data-period="${period.id}" data-status="present" aria-pressed="${status === "present"}">Present</button><button class="teacher-mark ${status === "absent" ? "selected absent" : ""}" data-attendance="teacher" data-period="${period.id}" data-status="absent" aria-pressed="${status === "absent"}">Absent</button></span></div></article>`;
  }).join("");
}

function renderTimetable() {
  const periods = sortPeriods(state.periods.filter((period) => timetableFilter === "All sessions" || period.session === timetableFilter));
  document.getElementById("period-count-label").textContent = `${periods.length} ${periods.length === 1 ? "period" : "periods"}`;
  const body = document.getElementById("timetable-body");
  body.innerHTML = periods.map((period) => `<tr><td><span class="table-name">Period ${period.number}</span></td><td>${escapeHTML(period.session)}</td><td><span class="class-tag">${escapeHTML(className(period.classId))}</span></td><td>${escapeHTML(subjectName(period.subjectId))}</td><td>${escapeHTML(teacherName(period.teacherId))}</td><td>${formatTime(period.start)}–${formatTime(period.end)}</td><td><span class="row-actions"><button class="table-action" data-action="edit" data-type="period" data-id="${period.id}" aria-label="Edit period">✎</button><button class="table-action delete" data-action="delete" data-type="period" data-id="${period.id}" aria-label="Delete period">×</button></span></td></tr>`).join("");
  document.getElementById("timetable-empty").classList.toggle("hidden", periods.length > 0);
  document.querySelector("#view-timetable .table-scroll").classList.toggle("hidden", periods.length === 0);
  document.getElementById("helper-classes").textContent = state.classes.length;
  document.getElementById("helper-teachers").textContent = state.teachers.length;
  document.getElementById("helper-subjects").textContent = state.subjects.length;
  renderClassesAdmin();
}

function renderStudentsAdmin() {
  const query = document.getElementById("student-search").value.trim().toLowerCase();
  const classFilter = document.getElementById("student-class-filter").value;
  const students = state.students.filter((student) => {
    const matchesQuery = `${student.name} ${student.studentId} ${student.phone}`.toLowerCase().includes(query);
    return matchesQuery && (!classFilter || student.classId === classFilter);
  }).sort((a, b) => a.name.localeCompare(b.name));
  document.getElementById("student-count-label").textContent = `${students.length} ${students.length === 1 ? "student" : "students"}`;
  document.getElementById("students-admin-body").innerHTML = students.map((student, index) => `<tr><td><span class="table-name"><span class="person-avatar tone-${index % 4}">${escapeHTML(initials(student.name))}</span>${escapeHTML(student.name)}</span></td><td>${escapeHTML(student.studentId)}</td><td><span class="class-tag">${escapeHTML(className(student.classId))}</span></td><td>${escapeHTML(student.phone || "—")}</td><td>${formatDate(student.enrolled)}</td><td><span class="row-actions"><button class="table-action" data-action="edit" data-type="student" data-id="${student.id}" aria-label="Edit ${escapeHTML(student.name)}">✎</button><button class="table-action delete" data-action="delete" data-type="student" data-id="${student.id}" aria-label="Delete ${escapeHTML(student.name)}">×</button></span></td></tr>`).join("");
  document.getElementById("students-admin-empty").classList.toggle("hidden", students.length > 0);
  document.querySelector("#view-students-admin .table-scroll").classList.toggle("hidden", students.length === 0);
}

function renderTeachersAdmin() {
  const container = document.getElementById("teachers-admin-grid");
  container.innerHTML = state.teachers.map((teacher, index) => {
    const assignments = state.periods.filter((period) => period.teacherId === teacher.id).length;
    return `<article class="staff-card"><span class="row-actions"><button class="table-action" data-action="edit" data-type="teacher" data-id="${teacher.id}" aria-label="Edit ${escapeHTML(teacher.name)}">✎</button><button class="table-action delete" data-action="delete" data-type="teacher" data-id="${teacher.id}" aria-label="Delete ${escapeHTML(teacher.name)}">×</button></span><div class="staff-card-header"><span class="person-avatar tone-${index % 4}">${escapeHTML(initials(teacher.name))}</span><span><strong>${escapeHTML(teacher.name)}</strong><small>${escapeHTML(teacher.email || subjectName(teacher.subjectId))}</small></span></div><p class="staff-card-count"><strong>${assignments}</strong> scheduled ${assignments === 1 ? "period" : "periods"} <span>·</span> ${escapeHTML(subjectName(teacher.subjectId))}</p></article>`;
  }).join("") || `<div class="panel empty-state"><span class="empty-icon">♧</span><strong>No teachers added</strong><span>Add teachers before assigning timetable periods.</span><button class="button button-primary" data-add="teacher">＋ Add teacher</button></div>`;
}

function renderSubjectsAdmin() {
  const container = document.getElementById("subjects-admin-grid");
  container.innerHTML = state.subjects.map((subject) => {
    const periodCount = state.periods.filter((period) => period.subjectId === subject.id).length;
    return `<article class="subject-card"><span class="row-actions"><button class="table-action" data-action="edit" data-type="subject" data-id="${subject.id}" aria-label="Edit ${escapeHTML(subject.name)}">✎</button><button class="table-action delete" data-action="delete" data-type="subject" data-id="${subject.id}" aria-label="Delete ${escapeHTML(subject.name)}">×</button></span><span class="subject-symbol" style="color:${escapeHTML(subject.color || "#557c50")}">▧</span><strong>${escapeHTML(subject.name)}</strong><small>${escapeHTML(subject.code)} · ${periodCount} ${periodCount === 1 ? "period" : "periods"}</small></article>`;
  }).join("") || `<div class="panel empty-state"><span class="empty-icon">▧</span><strong>No subjects added</strong><span>Add subjects before creating timetable periods.</span><button class="button button-primary" data-add="subject">＋ Add subject</button></div>`;
}

function renderAll() {
  renderOverview();
  updateStudentPeriodOptions();
  const classOptions = state.classes.map((classRecord) => ({ value: classRecord.id, label: classRecord.name }));
  setOptions(document.getElementById("student-class-filter"), classOptions, document.getElementById("student-class-filter").value, "All classes");
  renderStudentRegister();
  renderTeacherAttendance();
  renderTimetable();
  renderStudentsAdmin();
  renderTeachersAdmin();
  renderSubjectsAdmin();
}

function renderClassesAdmin() {
  const container = document.getElementById("classes-admin-grid");
  container.innerHTML = state.classes.map((classRecord) => {
    const studentCount = state.students.filter((student) => student.classId === classRecord.id).length;
    const periodCount = state.periods.filter((period) => period.classId === classRecord.id).length;
    return `<article class="subject-card class-card"><span class="row-actions"><button class="table-action" data-action="edit" data-type="class" data-id="${classRecord.id}" aria-label="Edit ${escapeHTML(classRecord.name)}">✎</button><button class="table-action delete" data-action="delete" data-type="class" data-id="${classRecord.id}" aria-label="Delete ${escapeHTML(classRecord.name)}">×</button></span><span class="subject-symbol">▦</span><strong>${escapeHTML(classRecord.name)}</strong><small>${escapeHTML(classRecord.grade)} · ${studentCount} students · ${periodCount} periods</small></article>`;
  }).join("") || `<div class="panel empty-state"><span class="empty-icon">▦</span><strong>No classes added</strong><span>Add classes before enrolling students or scheduling periods.</span><button class="button button-primary" data-add="class">＋ Add class</button></div>`;
}

function field(label, name, type = "text", value = "", options = [], required = true, full = false) {
  const requiredAttribute = required ? "required" : "";
  const control = type === "select"
    ? `<select name="${name}" ${requiredAttribute}><option value="">Choose ${label.toLowerCase()}</option>${options.map((option) => `<option value="${escapeHTML(option.value)}" ${option.value === value ? "selected" : ""}>${escapeHTML(option.label)}</option>`).join("")}</select>`
    : `<input name="${name}" type="${type}" value="${escapeHTML(value)}" ${requiredAttribute} ${type === "number" ? 'min="1" max="20"' : ""}>`;
  return `<label class="dialog-field ${full ? "full" : ""}">${label}${control}</label>`;
}

function formMarkup(type, record = {}) {
  if (type === "class") return `${field("Class name", "name", "text", record.name || "Class 11A")}${field("Grade", "grade", "text", record.grade || "Grade 11")}`;
  if (type === "student") {
    const classes = state.classes.map((item) => ({ value: item.id, label: item.name }));
    return `${field("Full name", "name", "text", record.name || "", [], true, true)}${field("Student ID", "studentId", "text", record.studentId || "")}${field("Class", "classId", "select", record.classId || "", classes)}${field("Phone number", "phone", "tel", record.phone || "", [], false)}`;
  }
  if (type === "teacher") {
    const subjects = state.subjects.map((item) => ({ value: item.id, label: item.name }));
    return `${field("Full name", "name", "text", record.name || "", [], true, true)}${field("Primary subject", "subjectId", "select", record.subjectId || "", subjects, true, true)}${field("Email address", "email", "email", record.email || "", [], false)}${field("Phone number", "phone", "tel", record.phone || "", [], false)}`;
  }
  if (type === "subject") return `${field("Subject name", "name", "text", record.name || "")}${field("Short code", "code", "text", record.code || "")}`;
  const classes = state.classes.map((item) => ({ value: item.id, label: item.name }));
  const teachers = state.teachers.map((item) => ({ value: item.id, label: item.name }));
  const subjects = state.subjects.map((item) => ({ value: item.id, label: item.name }));
  return `${field("Session", "session", "select", record.session || "Morning", ["Morning", "Day", "Evening"].map((name) => ({ value: name, label: name })))}${field("Period number", "number", "number", record.number || "1")}${field("Class", "classId", "select", record.classId || "", classes)}${field("Subject", "subjectId", "select", record.subjectId || "", subjects)}${field("Teacher", "teacherId", "select", record.teacherId || "", teachers)}${field("Starts at", "start", "time", record.start || "07:00")}${field("Ends at", "end", "time", record.end || "07:50")}`;
}

function openForm(type, id = "") {
  const record = id ? state[{ class: "classes", student: "students", teacher: "teachers", subject: "subjects", period: "periods" }[type]].find((item) => item.id === id) : {};
  if (!record && id) return;
  if (type === "period" && !id && (!state.classes.length || !state.teachers.length || !state.subjects.length)) {
    showToast("Add a class, teacher, and subject before scheduling a period.");
    return;
  }
  if (type === "student" && !id && !state.classes.length) {
    showToast("Add a class before enrolling a student.");
    return;
  }
  dialogType = type;
  editingId = id;
  document.getElementById("dialog-eyebrow").textContent = id ? "EDIT RECORD" : "ADMINISTRATION";
  const labels = { class: "class", student: "student", teacher: "teacher", subject: "subject", period: "period" };
  document.getElementById("dialog-title").textContent = `${id ? "Edit" : "Add"} ${labels[type]}`;
  document.getElementById("dialog-submit").textContent = id ? "Save changes" : `Add ${labels[type]}`;
  document.getElementById("dialog-fields").innerHTML = formMarkup(type, record);
  document.getElementById("form-error").textContent = "";
  document.getElementById("entity-dialog").showModal();
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function saveEntity(formData) {
  const value = Object.fromEntries(formData.entries());
  if (dialogType === "period") {
    const teacher = byId("teachers", value.teacherId);
    if (!teacher || teacher.subjectId !== value.subjectId) return "Choose a teacher whose assigned subject matches this period.";
  }
  if (dialogType === "teacher" && state.periods.some((period) => period.teacherId === editingId && period.subjectId !== value.subjectId)) return "This teacher has periods in another subject. Update those periods before changing their subject.";
  if (dialogType === "period") {
    value.number = Number(value.number);
    if (value.end <= value.start) return "End time must be later than the start time.";
    const duplicateClassPeriod = state.periods.some((period) => period.id !== editingId && period.session === value.session && Number(period.number) === value.number && period.classId === value.classId);
    if (duplicateClassPeriod) return "That class already has this period number in this session.";
    const teacherConflict = state.periods.some((period) => period.id !== editingId && period.session === value.session && Number(period.number) === value.number && period.teacherId === value.teacherId);
    if (teacherConflict) return "This teacher is already assigned to another class in that period.";
    const timeConflict = state.periods.some((period) => period.id !== editingId && period.session === value.session && period.teacherId === value.teacherId && value.start < period.end && value.end > period.start);
    if (timeConflict) return "This teacher has an overlapping period in the selected session.";
  }
  if (dialogType === "student" && state.students.some((student) => student.id !== editingId && student.studentId.trim().toLowerCase() === value.studentId.trim().toLowerCase())) return "That student ID is already in use.";
  if (dialogType === "class" && state.classes.some((item) => item.id !== editingId && item.name.trim().toLowerCase() === value.name.trim().toLowerCase())) return "A class with that name already exists.";
  if (dialogType === "subject" && state.subjects.some((item) => item.id !== editingId && item.name.trim().toLowerCase() === value.name.trim().toLowerCase())) return "That subject already exists.";

  const collection = { class: "classes", student: "students", teacher: "teachers", subject: "subjects", period: "periods" }[dialogType];
  if (editingId) {
    const index = state[collection].findIndex((record) => record.id === editingId);
    state[collection][index] = { ...state[collection][index], ...value };
  } else {
    const record = { id: makeId(dialogType), ...value };
    if (dialogType === "student") record.enrolled = todayISO;
    if (dialogType === "subject") record.color = ["#557c50", "#638496", "#a06c73", "#ae874e"][state.subjects.length % 4];
    state[collection].push(record);
  }
  save();
  renderAll();
  showToast(`${dialogType[0].toUpperCase()}${dialogType.slice(1)} ${editingId ? "updated" : "added"}.`);
  document.getElementById("entity-dialog").close();
  return "";
}

function deleteEntity(type, id) {
  const collection = { class: "classes", student: "students", teacher: "teachers", subject: "subjects", period: "periods" }[type];
  const record = state[collection].find((item) => item.id === id);
  if (!record) return;
  const linked = type === "class" ? state.students.some((student) => student.classId === id) || state.periods.some((period) => period.classId === id)
    : type === "teacher" ? state.periods.some((period) => period.teacherId === id)
      : type === "subject" ? state.periods.some((period) => period.subjectId === id) : false;
  if (linked) {
    showToast(`Remove this ${type}'s linked records before deleting it.`);
    return;
  }
  if (!window.confirm(`Delete ${type} “${record.name || (type === "period" ? `Period ${record.number}` : record.studentId)}”?`)) return;
  state[collection] = state[collection].filter((item) => item.id !== id);
  if (type === "period") {
    Object.keys(state.studentAttendance).forEach((key) => { if (key.endsWith(`|${id}`)) delete state.studentAttendance[key]; });
    Object.keys(state.teacherAttendance).forEach((key) => { if (key.endsWith(`|${id}`)) delete state.teacherAttendance[key]; });
  }
  if (type === "student") Object.values(state.studentAttendance).forEach((attendance) => delete attendance[id]);
  save();
  renderAll();
  showToast(`${type[0].toUpperCase()}${type.slice(1)} deleted.`);
}

function setStudentStatus(studentId, status) {
  const date = document.getElementById("student-date").value || todayISO;
  const periodId = document.getElementById("student-period").value;
  const period = getPeriod(periodId);
  const student = byId("students", studentId);
  if (!period || !student || student.classId !== period.classId) return;
  const key = studentKey(date, periodId);
  state.studentAttendance[key] ||= {};
  if (state.studentAttendance[key][studentId] === status) delete state.studentAttendance[key][studentId];
  else state.studentAttendance[key][studentId] = status;
  if (!Object.keys(state.studentAttendance[key]).length) delete state.studentAttendance[key];
  save();
  renderStudentRegister();
  renderOverview();
}

function setTeacherStatus(periodId, status) {
  if (!getPeriod(periodId)) return;
  const date = document.getElementById("teacher-date").value || todayISO;
  const key = teacherKey(date, periodId);
  if (state.teacherAttendance[key] === status) delete state.teacherAttendance[key];
  else state.teacherAttendance[key] = status;
  save();
  renderTeacherAttendance();
  renderOverview();
}

document.querySelectorAll(".nav-link[data-view]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
document.addEventListener("click", (event) => {
  const jump = event.target.closest("[data-view-jump]");
  if (jump) setView(jump.dataset.viewJump);
  const add = event.target.closest("[data-add]");
  if (add) openForm(add.dataset.add);
  const attendance = event.target.closest("[data-attendance]");
  if (attendance?.dataset.attendance === "student") setStudentStatus(attendance.dataset.student, attendance.dataset.status);
  if (attendance?.dataset.attendance === "teacher") setTeacherStatus(attendance.dataset.period, attendance.dataset.status);
  const action = event.target.closest("[data-action]");
  if (action?.dataset.action === "edit") openForm(action.dataset.type, action.dataset.id);
  if (action?.dataset.action === "delete") deleteEntity(action.dataset.type, action.dataset.id);
});

document.getElementById("overview-session-tabs").addEventListener("click", (event) => {
  const button = event.target.closest("[data-session]");
  if (!button) return;
  overviewSession = button.dataset.session;
  renderOverview();
});
document.getElementById("student-session").addEventListener("change", () => { updateStudentPeriodOptions(); renderStudentRegister(); });
document.getElementById("student-period").addEventListener("change", renderStudentRegister);
document.getElementById("student-date").addEventListener("change", renderStudentRegister);
document.getElementById("teacher-session").addEventListener("change", renderTeacherAttendance);
document.getElementById("teacher-date").addEventListener("change", renderTeacherAttendance);
document.getElementById("student-search").addEventListener("input", renderStudentsAdmin);
document.getElementById("student-class-filter").addEventListener("change", renderStudentsAdmin);
document.getElementById("timetable-session-filter").addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  timetableFilter = button.dataset.filter;
  document.querySelectorAll("#timetable-session-filter button").forEach((item) => item.classList.toggle("active", item === button));
  renderTimetable();
});

document.getElementById("mark-all-present").addEventListener("click", () => setClassAttendance("present"));
document.getElementById("mark-all-absent").addEventListener("click", () => setClassAttendance("absent"));
document.getElementById("reset-student-period").addEventListener("click", () => setClassAttendance(""));
function setClassAttendance(status) {
  const date = document.getElementById("student-date").value || todayISO;
  const period = getPeriod(document.getElementById("student-period").value);
  if (!period) return;
  const key = studentKey(date, period.id);
  if (!status) delete state.studentAttendance[key];
  else {
    state.studentAttendance[key] = {};
    state.students.filter((student) => student.classId === period.classId).forEach((student) => { state.studentAttendance[key][student.id] = status; });
  }
  save();
  renderStudentRegister();
  renderOverview();
}

document.getElementById("teacher-mark-all").addEventListener("click", () => {
  const date = document.getElementById("teacher-date").value || todayISO;
  const session = document.getElementById("teacher-session").value;
  state.periods.filter((period) => session === "All sessions" || period.session === session).forEach((period) => { state.teacherAttendance[teacherKey(date, period.id)] = "present"; });
  save(); renderTeacherAttendance(); renderOverview();
});
document.getElementById("reset-teacher-day").addEventListener("click", () => {
  const date = document.getElementById("teacher-date").value || todayISO;
  Object.keys(state.teacherAttendance).forEach((key) => { if (key.startsWith(`${date}|`)) delete state.teacherAttendance[key]; });
  save(); renderTeacherAttendance(); renderOverview();
});

document.getElementById("entity-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const error = saveEntity(new FormData(event.currentTarget));
  document.getElementById("form-error").textContent = error;
});
document.getElementById("dialog-close").addEventListener("click", () => document.getElementById("entity-dialog").close());
document.getElementById("dialog-cancel").addEventListener("click", () => document.getElementById("entity-dialog").close());
document.getElementById("entity-dialog").addEventListener("click", (event) => { if (event.target === event.currentTarget) event.currentTarget.close(); });
document.getElementById("mobile-menu").addEventListener("click", () => document.getElementById("sidebar").classList.toggle("open"));

document.getElementById("student-date").value = todayISO;
document.getElementById("teacher-date").value = todayISO;
renderAll();