// // storage.js
// // এটা in-memory store। MERN-এ গেলে এই functions গুলোকে
// // axios/fetch দিয়ে backend API call-এ replace করুন।

// let employees = [
//   { id: 1, name: "Rafiul Islam", role: "Designer", color: "#1D9E75", factor: 0.95 },
//   { id: 2, name: "Sadia Akter", role: "Frontend", color: "#378ADD", factor: 0.88 },
//   { id: 3, name: "Mehedi Hasan", role: "Backend", color: "#EF9F27", factor: 1.00 },
//   { id: 4, name: "Nusrat Jahan", role: "Content", color: "#D4537E", factor: 0.72 },
//   { id: 5, name: "Tarek Ahmed", role: "DevOps", color: "#534AB7", factor: 0.91 },
//   { id: 6, name: "Fariha Binte", role: "QA", color: "#993C1D", factor: 0.83 },
//   { id: 7, name: "Sabbir Hossain", role: "Mobile", color: "#185FA5", factor: 0.97 },
//   { id: 8, name: "Lamia Sultana", role: "Marketing", color: "#639922", factor: 0.79 },
//   { id: 9, name: "Imran Khan", role: "Backend", color: "#854F0B", factor: 1.00 },
//   { id: 10, name: "Rupa Begum", role: "HR", color: "#993556", factor: 0.88 },
//   { id: 11, name: "Shihab Uddin", role: "Frontend", color: "#3B6D11", factor: 0.93 },
// ];
// let dailyLogs = [];
// let empIdCounter = 1;

// // ── Employees ─────────────────────────────────────────────
// export function getEmployees() { return [...employees]; }

// export function addEmployee(data) {
//   const emp = { ...data, id: empIdCounter++ };
//   employees.push(emp);
//   return emp;
// }

// export function updateEmployee(id, data) {
//   employees = employees.map(e => e.id === id ? { ...e, ...data } : e);
// }

// export function deleteEmployee(id) {
//   employees = employees.filter(e => e.id !== id);
//   dailyLogs = dailyLogs.filter(l => l.empId !== id);
// }

// // ── Daily logs ────────────────────────────────────────────
// export function getDailyLogs(empId) {
//   return dailyLogs.filter(l => l.empId === empId)
//     .sort((a, b) => b.date.localeCompare(a.date));
// }

// export function upsertDailyLog(log) {
//   // overwrite if same empId + date exists
//   dailyLogs = dailyLogs.filter(l => !(l.empId === log.empId && l.date === log.date));
//   dailyLogs.push(log);
// }

// export function deleteDailyLog(empId, date) {
//   dailyLogs = dailyLogs.filter(l => !(l.empId === empId && l.date === date));
// }