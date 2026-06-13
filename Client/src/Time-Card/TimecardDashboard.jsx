// /* eslint-disable react-hooks/set-state-in-effect */
// // src/components/TimecardDashboard.jsx
// import { useState, useEffect } from "react";
// import { employeeAPI, timeLogAPI } from "../services/api";

// const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
// const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// const TH = {
//   dark: {
//     bg: "bg-[#0f1117]", card: "bg-[#1a1d27] border-[#2a2d3a]",
//     header: "bg-[#14171f] border-[#2a2d3a]", text: "text-[#f1f2f6]",
//     subtext: "text-[#8b8fa8]", muted: "text-[#5a5d73]",
//     input: "bg-[#1a1d27] border-[#2a2d3a] text-[#f1f2f6]",
//     barBg: "bg-[#2a2d3a]", rowAlt: "bg-[#151820]", rowBorder: "border-[#21242f]",
//     thBg: "bg-[#14171f]",
//   },
//   light: {
//     bg: "bg-gray-100", card: "bg-white border-gray-200",
//     header: "bg-gray-50 border-gray-200", text: "text-gray-800",
//     subtext: "text-gray-500", muted: "text-gray-400",
//     input: "bg-white border-gray-300 text-gray-700",
//     barBg: "bg-gray-200", rowAlt: "bg-gray-50", rowBorder: "border-gray-100",
//     thBg: "bg-gray-50",
//   },
// };

// const rnd = v => Math.round(v * 10) / 10;
// const sumF = (arr, fn) => rnd(arr.reduce((s, x) => s + fn(x), 0));
// const getExp = (days, wh) => days.filter(d => !d.we).length * wh;
// const getWork = days => sumF(days, d => d.worked);
// const calcPct = (w, e) => e > 0 ? Math.round((w / e) * 100) : 0;
// const barColor = p => p >= 88 ? "#1D9E75" : p >= 60 ? "#EF9F27" : "#E24B4A";
// const valColor = (p, dark) => dark ? (p >= 88 ? "#4ADE80" : p >= 65 ? "#FBB040" : "#F87171") : (p >= 88 ? "#0F6E56" : p >= 65 ? "#854F0B" : "#A32D2D");

// function EmployeeDetailCard({ emp, dark, tm }) {
//   const wh = emp.type === "Part-time" ? 4 : 8;
//   const initials = emp.name.split(" ").map(w => w[0]).join("").slice(0, 2);
//   return (
//     <div className={`rounded-2xl border p-4 mb-4 flex items-center gap-5 flex-wrap ${tm.card}`}>
//       <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0" style={{ background: "#0F6E56" }}>{initials}</div>
//       <div className="flex-1 min-w-36">
//         <div className={`text-base font-semibold mb-1 ${tm.text}`}>{emp.name}</div>
//         <div className="flex items-center gap-2 flex-wrap">
//           <span className={`text-xs ${tm.subtext}`}>{emp.designation}</span>
//           <span className={`w-1 h-1 rounded-full ${dark ? "bg-[#5a5d73]" : "bg-gray-300"}`} />
//           <span className={`text-xs ${tm.subtext}`}>{emp.country}</span>
//         </div>
//       </div>
//       <div className="flex gap-2 items-center flex-wrap">
//         <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={emp.type === "Full-time" ? { background: dark ? "#0a2e1f" : "#E1F5EE", color: dark ? "#4ADE80" : "#085041" } : { background: dark ? "#1e1e05" : "#FFFBEB", color: dark ? "#FBB040" : "#92400e" }}>{emp.type}</span>
//         <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${tm.muted} ${dark ? "border-[#2a2d3a]" : "border-gray-200"}`} style={{ background: "transparent" }}>{wh}h/day expected</span>
//         <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${tm.muted} ${dark ? "border-[#2a2d3a]" : "border-gray-200"}`} style={{ background: "transparent" }}>Min. {emp.minHours}h/day</span>
//       </div>
//     </div>
//   );
// }

// function SummaryCard({ label, value, sub, color, tm }) {
//   return (
//     <div className={`rounded-xl p-3 border ${tm.card}`}>
//       <div className={`text-xs mb-1 ${tm.subtext}`}>{label}</div>
//       <div className={`text-2xl font-semibold leading-none ${tm.text}`} style={color ? { color } : {}}>{value}</div>
//       <div className={`text-xs mt-1 ${tm.muted}`}>{sub}</div>
//     </div>
//   );
// }

// function PeriodCard({ title, dateRange, expected, minAccept, worked, missing, pct, tm, dark }) {
//   const bs = pct >= 88 ? { bg: dark ? "#0a2e1f" : "#E1F5EE", c: dark ? "#4ADE80" : "#085041" } : pct >= 65 ? { bg: dark ? "#2e1e05" : "#FAEEDA", c: dark ? "#FBB040" : "#633806" } : { bg: dark ? "#2e0a0a" : "#FCEBEB", c: dark ? "#F87171" : "#501313" };
//   const badgeText = pct >= 88 ? "On track" : pct >= 65 ? "Behind" : "Critical";
//   const minPct = expected > 0 ? Math.min(100, Math.round((minAccept / expected) * 100)) : 0;
//   const nums = [
//     { l: "Expected", v: `${expected}h`, c: dark ? "#8b8fa8" : "#6b7280" },
//     { l: "Min. accept.", v: `${minAccept}h`, c: dark ? "#60a5fa" : "#2563EB" },
//     { l: "Worked", v: `${worked}h`, c: valColor(pct, dark) },
//     { l: "Missing", v: missing > 0 ? `-${missing}h` : "✓", c: missing > 0 ? (dark ? "#F87171" : "#A32D2D") : (dark ? "#4ADE80" : "#0F6E56") },
//   ];
//   return (
//     <div className={`rounded-xl border overflow-hidden ${tm.card}`}>
//       <div className={`px-4 py-2.5 flex justify-between items-center border-b ${tm.header}`}>
//         <span className={`text-sm font-medium ${tm.text}`}>{title}</span>
//         <span className={`text-xs ${tm.muted}`}>{dateRange}</span>
//       </div>
//       <div className="p-4">
//         <div className="flex mb-3">
//           {nums.map((n, i) => (
//             <div key={i} className={`flex-1 text-center ${i > 0 ? "border-l " + (dark ? "border-[#2a2d3a]" : "border-gray-100") : ""}`}>
//               <div className={`text-xs mb-0.5 ${tm.muted}`}>{n.l}</div>
//               <div className="text-base font-semibold" style={{ color: n.c }}>{n.v}</div>
//             </div>
//           ))}
//         </div>
//         <div className={`h-2 rounded-full overflow-hidden mb-1.5 relative ${tm.barBg}`}>
//           <div className="absolute h-full rounded-full" style={{ width: `${minPct}%`, background: dark ? "rgba(96,165,250,0.2)" : "rgba(37,99,235,0.12)" }} />
//           <div className="absolute h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, pct)}%`, background: barColor(pct) }} />
//         </div>
//         <div className="flex justify-between items-center text-xs">
//           <span className={tm.subtext}>{pct}% of expected</span>
//           <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: bs.bg, color: bs.c }}>{badgeText}</span>
//         </div>
//       </div>
//     </div>
//   );
// }

// function ActivityDots({ activity, dark }) {
//   return (
//     <div className="flex gap-0.5 items-center">
//       {Array.from({ length: 10 }, (_, i) => (
//         <div key={i} className="w-1 h-1 rounded-sm" style={{ background: i < Math.round(activity / 10) ? "#1D9E75" : (dark ? "#2a2d3a" : "#e0e0e0") }} />
//       ))}
//     </div>
//   );
// }

// function DailyRow({ day, year, month, whMin, whFull, tm, dark }) {
//   const dow = new Date(year, month - 1, day.d).getDay();
//   const pct = day.we ? (day.worked > 0 ? Math.min(100, (day.worked / 4) * 100) : 0) : Math.min(100, (day.worked / whFull) * 100);
//   const bc = day.we ? (dark ? "#3a3d4a" : "#C0BEB5") : barColor(pct);
//   const missH = !day.we ? rnd(whMin - day.worked) : null;
//   const dateLabel = `${String(day.d).padStart(2, "0")} ${MONTHS[month - 1].slice(0, 3)}`;
//   const missEl = day.we ? (day.worked > 0 ? <span className="text-xs" style={{ color: dark ? "#4ADE80" : "#0F6E56" }}>+{day.worked}h</span> : <span className={`text-xs italic ${tm.muted}`}>Off</span>) : (missH <= 0 ? <span className="text-xs" style={{ color: dark ? "#4ADE80" : "#0F6E56" }}>✓</span> : <span className="text-xs font-semibold" style={{ color: dark ? "#F87171" : "#A32D2D" }}>-{missH}h</span>);
//   return (
//     <tr className={`border-b ${day.we ? tm.rowAlt : ""} ${tm.rowBorder}`}>
//       <td className={`px-3 py-2 text-xs font-medium whitespace-nowrap ${tm.text}`}>{dateLabel}</td>
//       <td className={`px-3 py-2 text-xs ${tm.muted}`}>{DAYS[dow]}</td>
//       <td className="px-3 py-2"><div className={`h-1.5 rounded-full overflow-hidden ${tm.barBg}`}><div className="h-full rounded-full" style={{ width: `${pct}%`, background: bc }} /></div></td>
//       <td className={`px-3 py-2 text-xs ${tm.text}`}>{day.worked > 0 ? `${day.worked}h` : day.we ? "—" : "0h"}</td>
//       <td className="px-3 py-2">{day.we ? <span className={`text-xs ${tm.muted}`}>—</span> : <ActivityDots activity={day.activity} dark={dark} />}</td>
//       <td className="px-3 py-2 text-right">{missEl}</td>
//     </tr>
//   );
// }

// function InfoCard({ label, value, sub, color, tm }) {
//   return (
//     <div className={`rounded-xl p-3 border text-center ${tm.card}`}>
//       <div className={`text-xs mb-1 ${tm.muted}`}>{label}</div>
//       <div className={`text-base font-semibold ${tm.text}`} style={color ? { color } : {}}>{value}</div>
//       <div className={`text-xs mt-0.5 ${tm.muted}`}>{sub}</div>
//     </div>
//   );
// }

// function SunIcon() {
//   return (
//     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//       <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
//       <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
//       <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
//       <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
//     </svg>
//   );
// }

// function MoonIcon() {
//   return (
//     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
//       <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
//     </svg>
//   );
// }

// export default function TimecardDashboard({ today = new Date() }) {
//   const [dark, setDark] = useState(() => { 
//     try { 
//       return localStorage.getItem("bisviews_theme") === "dark"; 
//     } catch { 
//       return true; 
//     } 
//   });
//   const [employees, setEmployees] = useState([]);
//   const [timeLogs, setTimeLogs] = useState({});
//   const [loading, setLoading] = useState(true);
//   const [empId, setEmpId] = useState(null);
//   const [{ year, month }, setSelectedMonth] = useState(() => {
//     const d = new Date();
//     return { year: d.getFullYear(), month: d.getMonth() + 1 };
//   });

//   // Define loadEmployees first (before using it in useEffect)
//   const loadEmployees = async () => {
//     try {
//       setLoading(true);
//       const data = await employeeAPI.getAll();
//       setEmployees(data);
//       if (data.length > 0 && !empId) setEmpId(data[0]._id);
//     } catch (error) {
//       console.error("Failed to load employees:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Define loadTimeLogs second (before using it in useEffect)
//   const loadTimeLogs = async () => {
//     if (!empId) return;
//     try {
//       const logs = await timeLogAPI.getByEmployee(empId, year, month);
//       setTimeLogs(prev => ({ ...prev, [empId]: logs }));
//     } catch (error) {
//       console.error("Failed to load time logs:", error);
//     }
//   };

//   // Now the useEffect hooks can safely call the functions
//   useEffect(() => { 
//     loadEmployees(); 
//   }, []);

//   useEffect(() => { 
//     if (empId) loadTimeLogs(); 
//   }, [empId, year, month]);

//   useEffect(() => { 
//     localStorage.setItem("bisviews_theme", dark ? "dark" : "light"); 
//   }, [dark]);

//   const tm = dark ? TH.dark : TH.light;
//   const emp = employees.find(e => e._id === empId) || employees[0];

//   if (loading) {
//     return (
//       <div className={`min-h-screen flex items-center justify-center ${TH.dark.bg}`}>
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
//           <p className={`mt-4 ${TH.dark.text}`}>Loading dashboard...</p>
//         </div>
//       </div>
//     );
//   }

//   if (employees.length === 0) {
//     return (
//       <div className={`min-h-screen flex items-center justify-center ${TH.dark.bg}`}>
//         <div className={`text-center p-8 rounded-xl ${TH.dark.card}`}>
//           <p className={`text-lg mb-4 ${TH.dark.text}`}>No employees found. Please add employees first.</p>
//         </div>
//       </div>
//     );
//   }

//   const WH_FULL = emp?.type === "Part-time" ? 4 : 8;
//   const WH_MIN = emp?.minHours || 7;
//   const logs = timeLogs[empId] || [];
//   const daysInMonth = new Date(year, month, 0).getDate();
//   const isCurrent = year === today.getFullYear() && month === today.getMonth() + 1;
//   const lastDay = isCurrent ? today.getDate() : daysInMonth;

//   const daysWithLogs = Array.from({ length: lastDay }, (_, i) => {
//     const d = i + 1;
//     const dow = new Date(year, month - 1, d).getDay();
//     const log = logs.find(l => new Date(l.date).getDate() === d);
//     return { 
//       d, 
//       we: dow === 0 || dow === 6, 
//       worked: log ? log.worked : 0, 
//       activity: log ? log.activity : 0, 
//       focus: log ? log.focus : 0, 
//       ssHours: log ? log.ssHours : 0 
//     };
//   });

//   const p1 = daysWithLogs.filter(d => d.d <= 14);
//   const p2 = daysWithLogs.filter(d => d.d >= 15);
//   const e1 = getExp(p1, WH_FULL), w1 = getWork(p1), min1 = getExp(p1, WH_MIN);
//   const m1 = Math.max(0, rnd(min1 - w1)), pc1 = calcPct(w1, e1);
//   const e2 = getExp(p2, WH_FULL), w2 = getWork(p2), min2 = getExp(p2, WH_MIN);
//   const m2 = Math.max(0, rnd(min2 - w2)), pc2 = calcPct(w2, e2);
//   const eT = e1 + e2, wT = rnd(w1 + w2), minT = rnd(min1 + min2);
//   const mT = Math.max(0, rnd(minT - wT)), pcT = calcPct(wT, eT);
//   const workDays = daysWithLogs.filter(d => !d.we).length;
//   const workedDays = daysWithLogs.filter(d => !d.we && d.worked > 0).length;
//   const avgAct = Math.round(daysWithLogs.filter(d => !d.we && d.worked > 0).reduce((s, d) => s + d.activity, 0) / Math.max(1, workedDays));
//   const totalFocus = sumF(daysWithLogs, d => d.focus);
//   const totalSS = sumF(daysWithLogs, d => d.ssHours);
//   const wkndDays = daysWithLogs.filter(d => d.we && d.worked > 0).length;
//   const monthLabel = `${MONTHS[month - 1]} ${year}`;

//   return (
//     <div className={`min-h-screen p-4 md:p-6 transition-colors duration-200 ${tm.bg}`}>
//       <div className="max-w-5xl mx-auto">
//         <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
//           <div className="flex items-center gap-3">
//             <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-lg" style={{ background: "#0F6E56" }}>⏱</div>
//             <div>
//               <div className={`text-base font-semibold ${tm.text}`}>Bisviews Timecard</div>
//               <div className={`text-xs ${tm.subtext}`}>{monthLabel}{isCurrent ? " · Live" : ""}</div>
//             </div>
//           </div>
//           <div className="flex gap-2 items-center">
//             <select 
//               value={`${year}-${month}`} 
//               onChange={e => { 
//                 const [y, m] = e.target.value.split("-").map(Number); 
//                 setSelectedMonth({ year: y, month: m }); 
//               }} 
//               className={`text-xs px-3 py-2 rounded-lg border cursor-pointer ${tm.input}`}
//             >
//               {[{ year, month }].map(o => (
//                 <option key={`${o.year}-${o.month}`} value={`${o.year}-${o.month}`}>
//                   {MONTHS[o.month - 1]} {o.year}
//                 </option>
//               ))}
//             </select>
//             <button 
//               onClick={() => setDark(d => !d)} 
//               className={`w-9 h-9 rounded-lg border flex items-center justify-center cursor-pointer transition-colors ${tm.card} ${tm.text}`}
//             >
//               {dark ? <SunIcon /> : <MoonIcon />}
//             </button>
//           </div>
//         </div>
        
//         <div className={`flex gap-2 flex-wrap mb-4 p-3 rounded-xl border ${tm.card}`}>
//           {employees.map(e => (
//             <button 
//               key={e._id} 
//               onClick={() => setEmpId(e._id)} 
//               className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all" 
//               style={e._id === empId ? 
//                 { background: "#1D9E75", color: "#fff", borderColor: "#1D9E75" } : 
//                 { background: "transparent", color: dark ? "#8b8fa8" : "#6b7280", borderColor: dark ? "#2a2d3a" : "#e5e7eb" }
//               }
//             >
//               <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: e._id === empId ? "rgba(255,255,255,0.7)" : e.color }} />
//               {e.name}
//             </button>
//           ))}
//         </div>
        
//         <EmployeeDetailCard emp={emp} dark={dark} tm={tm} />
        
//         <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
//           <SummaryCard label="Total expected" value={`${eT}h`} sub={`${workDays} working days`} tm={tm} />
//           <SummaryCard label="Min. acceptable" value={`${minT}h`} sub={`${WH_MIN}h/day threshold`} color={dark ? "#60a5fa" : "#2563EB"} tm={tm} />
//           <SummaryCard label="Total worked" value={`${wT}h`} sub={`${workedDays}/${workDays} days active`} color={valColor(pcT, dark)} tm={tm} />
//           <SummaryCard label="Missing hours" value={mT > 0 ? `-${mT}h` : "0h"} sub={`${pcT}% of expected`} color={mT === 0 ? (dark ? "#4ADE80" : "#0F6E56") : (dark ? "#F87171" : "#A32D2D")} tm={tm} />
//           <SummaryCard label="Avg. activity" value={`${avgAct}%`} sub={`focus: ${totalFocus > 0 ? Math.round(totalFocus / wT * 100) : 0}% of work`} color={avgAct >= 70 ? (dark ? "#4ADE80" : "#0F6E56") : avgAct >= 50 ? (dark ? "#FBB040" : "#854F0B") : (dark ? "#F87171" : "#A32D2D")} tm={tm} />
//         </div>
        
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
//           <PeriodCard title="Period 1" dateRange={`1 – ${Math.min(14, lastDay)} ${MONTHS[month - 1].slice(0, 3)}`} expected={e1} minAccept={min1} worked={w1} missing={m1} pct={pc1} tm={tm} dark={dark} />
//           <PeriodCard title="Period 2" dateRange={`15 – ${lastDay} ${MONTHS[month - 1].slice(0, 3)}`} expected={e2} minAccept={min2} worked={w2} missing={m2} pct={pc2} tm={tm} dark={dark} />
//         </div>
        
//         <div className={`rounded-xl border overflow-hidden mb-4 ${tm.card}`}>
//           <div className={`px-4 py-3 flex items-center justify-between border-b flex-wrap gap-2 ${tm.header}`}>
//             <span className={`text-sm font-medium ${tm.text}`}>Daily log</span>
//             <div className="flex gap-3 flex-wrap">
//               {[["#1D9E75", "Full"], ["#EF9F27", "Partial"], ["#E24B4A", "Missed"], [dark ? "#3a3d4a" : "#C0BEB5", "Weekend"]].map(([c, l]) => (
//                 <span key={l} className={`flex items-center gap-1 text-xs ${tm.muted}`}>
//                   <span className="w-2 h-2 rounded-sm inline-block" style={{ background: c }} />
//                   {l}
//                 </span>
//               ))}
//             </div>
//           </div>
//           <div className="overflow-x-auto">
//             <table className="w-full border-collapse" style={{ minWidth: 480 }}>
//               <thead>
//                 <tr className={tm.thBg}>
//                   {["Date", "Day", "Hours worked", "Time", "Activity", "Missing"].map((h, i) => (
//                     <th key={h} className={`px-3 py-2 text-xs font-medium text-left ${tm.muted} ${i === 5 ? "text-right" : ""}`}>{h}</th>
//                   ))}
//                 </tr>
//               </thead>
//               <tbody>
//                 {daysWithLogs.map(day => (
//                   <DailyRow key={day.d} day={day} year={year} month={month} whMin={WH_MIN} whFull={WH_FULL} tm={tm} dark={dark} />
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </div>
        
//         <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
//           <InfoCard label="Focus time" value={`${totalFocus}h`} sub={`${totalFocus > 0 ? Math.round(totalFocus / wT * 100) : 0}% of work time`} color={dark ? "#4ADE80" : "#0F6E56"} tm={tm} />
//           <InfoCard label="Avg. activity" value={`${avgAct}%`} sub={avgAct >= 70 ? "Good pace" : avgAct >= 50 ? "Moderate" : "Needs attention"} color={avgAct >= 70 ? (dark ? "#4ADE80" : "#0F6E56") : avgAct >= 50 ? (dark ? "#FBB040" : "#854F0B") : (dark ? "#F87171" : "#A32D2D")} tm={tm} />
//           <InfoCard label="Screenshot hours" value={`${totalSS}h`} sub="of tracked time" color={dark ? "#60a5fa" : "#185FA5"} tm={tm} />
//           <InfoCard label="Days absent" value={workDays - workedDays} sub={`of ${workDays} work days`} color={(workDays - workedDays) > 0 ? (dark ? "#F87171" : "#A32D2D") : (dark ? "#4ADE80" : "#0F6E56")} tm={tm} />
//           <InfoCard label="Weekend work" value={`${wkndDays} days`} sub="bonus effort" color={dark ? "#4ADE80" : "#0F6E56"} tm={tm} />
//         </div>
//       </div>
//     </div>
//   );
// }