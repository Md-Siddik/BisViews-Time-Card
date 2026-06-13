/* eslint-disable react-hooks/set-state-in-effect */
// src/components/TimecardDashboard.jsx
import { useState, useEffect } from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import { employeeAPI, timeLogAPI } from "../services/api";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOUR = 60;

const TH = {
  dark: {
    bg: "bg-[#0f1117]", card: "bg-[#1a1d27] border-[#2a2d3a]",
    header: "bg-[#14171f] border-[#2a2d3a]", text: "text-[#f1f2f6]",
    subtext: "text-[#8b8fa8]", muted: "text-[#5a5d73]",
    input: "bg-[#1a1d27] border-[#2a2d3a] text-[#f1f2f6]",
    barBg: "bg-[#2a2d3a]", rowAlt: "bg-[#151820]", rowBorder: "border-[#21242f]",
    thBg: "bg-[#14171f]",
  },
  light: {
    bg: "bg-gray-100", card: "bg-white border-gray-200",
    header: "bg-gray-50 border-gray-200", text: "text-gray-800",
    subtext: "text-gray-500", muted: "text-gray-400",
    input: "bg-white border-gray-300 text-gray-700",
    barBg: "bg-gray-200", rowAlt: "bg-gray-50", rowBorder: "border-gray-100",
    thBg: "bg-gray-50",
  },
};

const parseHubstaffTime = value => {
  if (value === null || value === undefined || value === "") return 0;

  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value * HOUR);
  }

  const text = String(value).trim();
  if (!text) return 0;

  const clean = text.replace(/[hH]/g, "").trim();
  const timeMatch = clean.match(/^(-)?(\d+):([0-5]?\d)$/);

  if (timeMatch) {
    const sign = timeMatch[1] ? -1 : 1;
    const hours = Number(timeMatch[2]);
    const minutes = Number(timeMatch[3]);
    return sign * ((hours * HOUR) + minutes);
  }

  const decimal = Number(clean);
  if (Number.isFinite(decimal)) {
    return Math.round(decimal * HOUR);
  }

  return 0;
};

const formatHubstaffTime = minutes => {
  const total = Math.round(Number(minutes) || 0);
  const sign = total < 0 ? "-" : "";
  const abs = Math.abs(total);
  const hours = Math.floor(abs / HOUR);
  const mins = abs % HOUR;
  return `${sign}${hours}:${String(mins).padStart(2, "0")}`;
};

const formatHubstaffTimeWithSeconds = minutes => `${formatHubstaffTime(minutes)}:00`;

const getDefaultWorkHours = emp => emp?.type === "Part-time" ? "4:00" : "8:00";
const getDefaultMinHours = emp => emp?.type === "Part-time" ? "4:00" : "7:00";
const getEmployeeWorkMinutes = emp => parseHubstaffTime(emp?.workHours ?? getDefaultWorkHours(emp));
const getEmployeeMinMinutes = emp => parseHubstaffTime(emp?.minHours ?? getDefaultMinHours(emp));

const sumM = (arr, fn) => arr.reduce((s, x) => s + fn(x), 0);
const getExp = (days, whMinutes) => days.filter(d => !d.we).length * whMinutes;
const getWork = days => sumM(days, d => d.worked);
const calcPct = (w, e) => e > 0 ? Math.round((w / e) * 100) : 0;
const barColor = p => p >= 88 ? "#1D9E75" : p >= 60 ? "#EF9F27" : "#E24B4A";
const valColor = (p, dark) => dark ? (p >= 88 ? "#4ADE80" : p >= 65 ? "#FBB040" : "#F87171") : (p >= 88 ? "#0F6E56" : p >= 65 ? "#854F0B" : "#A32D2D");
const badgeStyle = (p, dark) => dark
  ? (p >= 88 ? { bg: "#0a2e1f", c: "#4ADE80" } : p >= 65 ? { bg: "#2e1e05", c: "#FBB040" } : { bg: "#2e0a0a", c: "#F87171" })
  : (p >= 88 ? { bg: "#E1F5EE", c: "#085041" } : p >= 65 ? { bg: "#FAEEDA", c: "#633806" } : { bg: "#FCEBEB", c: "#501313" });

const safeFileName = value => String(value || "timecard")
  .replace(/[^a-z0-9]+/gi, "_")
  .replace(/^_+|_+$/g, "");

const getDateParts = value => {
  const text = String(value || "");
  const datePart = text.split("T")[0];
  const parts = datePart.split("-").map(Number);

  if (parts.length === 3 && parts.every(Number.isFinite)) {
    return { year: parts[0], month: parts[1], day: parts[2] };
  }

  const d = new Date(value);
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
  };
};

const formatReportDate = (year, month, day) => {
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const buildAvailableMonths = logs => {
  const map = new Map();

  logs.forEach(log => {
    const parts = getDateParts(log.date);
    if (!parts.year || !parts.month) return;

    const key = `${parts.year}-${parts.month}`;
    map.set(key, {
      value: key,
      year: parts.year,
      month: parts.month,
      sort: parts.year * 100 + parts.month,
      label: `${MONTHS[parts.month - 1]} ${parts.year}`,
    });
  });

  return Array.from(map.values()).sort((a, b) => b.sort - a.sort);
};

function DownloadIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  );
}

function EmployeeDetailCard({ emp, dark, tm }) {
  const wh = getEmployeeWorkMinutes(emp);
  const minHours = getEmployeeMinMinutes(emp);
  const initials = emp.name.split(" ").map(w => w[0]).join("").slice(0, 2);

  return (
    <div className={`rounded-2xl border p-4 mb-4 flex items-center gap-5 flex-wrap ${tm.card}`}>
      <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
        style={{ background: "#0F6E56", letterSpacing: "-0.5px" }}>
        {initials}
      </div>
      <div className="flex-1 min-w-36">
        <div className={`text-base font-semibold mb-1 ${tm.text}`}>{emp.name}</div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs ${tm.subtext}`}>{emp.designation}</span>
          <span className={`w-1 h-1 rounded-full ${dark ? "bg-[#5a5d73]" : "bg-gray-300"}`} />
          <span className={`text-xs ${tm.subtext}`}>{emp.country}</span>
        </div>
      </div>
      <div className="flex gap-2 items-center flex-wrap">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
          style={emp.type === "Full-time"
            ? { background: dark ? "#0a2e1f" : "#E1F5EE", color: dark ? "#4ADE80" : "#085041" }
            : { background: dark ? "#1e1e05" : "#FFFBEB", color: dark ? "#FBB040" : "#92400e" }}>
          {emp.type}
        </span>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${tm.muted} ${dark ? "border-[#2a2d3a]" : "border-gray-200"}`}
          style={{ background: "transparent" }}>
          {formatHubstaffTime(wh)}/day expected
        </span>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${tm.muted} ${dark ? "border-[#2a2d3a]" : "border-gray-200"}`}
          style={{ background: "transparent" }}>
          Min. {formatHubstaffTime(minHours)}/day
        </span>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, sub, color, tm }) {
  return (
    <div className={`rounded-xl p-3 border ${tm.card}`}>
      <div className={`text-xs mb-1 ${tm.subtext}`}>{label}</div>
      <div className={`text-2xl font-semibold leading-none ${tm.text}`} style={color ? { color } : {}}>{value}</div>
      <div className={`text-xs mt-1 ${tm.muted}`}>{sub}</div>
    </div>
  );
}

function PeriodCard({ title, dateRange, expected, minAccept, worked, missing, pct, tm, dark }) {
  const bs = badgeStyle(pct, dark);
  const badgeTextValue = pct >= 88 ? "On track" : pct >= 65 ? "Behind" : "Critical";
  const minPct = expected > 0 ? Math.min(100, Math.round((minAccept / expected) * 100)) : 0;
  const nums = [
    { l: "Expected", v: formatHubstaffTime(expected), c: dark ? "#8b8fa8" : "#6b7280" },
    { l: "Min. accept.", v: formatHubstaffTime(minAccept), c: dark ? "#60a5fa" : "#2563EB" },
    { l: "Worked", v: formatHubstaffTime(worked), c: valColor(pct, dark) },
    { l: "Missing", v: missing > 0 ? `-${formatHubstaffTime(missing)}` : "✓", c: missing > 0 ? (dark ? "#F87171" : "#A32D2D") : (dark ? "#4ADE80" : "#0F6E56") },
  ];

  return (
    <div className={`rounded-xl border overflow-hidden ${tm.card}`}>
      <div className={`px-4 py-3 flex justify-between items-center border-b gap-3 ${tm.header}`}>
        <div>
          <span className={`text-sm font-semibold ${tm.text}`}>{title}</span>
          <div className={`text-[10px] mt-0.5 uppercase tracking-wide ${tm.muted}`}>
            Working Period
          </div>
        </div>

        <span
          className="inline-flex items-center justify-center text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap"
          style={{
            background: dark
              ? "linear-gradient(135deg, rgba(10,46,31,0.95), rgba(29,158,117,0.22))"
              : "linear-gradient(135deg, #E1F5EE, #F0FFF8)",
            color: dark ? "#4ADE80" : "#085041",
            border: dark ? "1px solid #1D9E75" : "1px solid #B7E4D4",
            boxShadow: dark
              ? "0 0 14px rgba(29,158,117,0.18)"
              : "0 6px 14px rgba(15,110,86,0.10)",
            letterSpacing: "0.2px",
          }}
        >
          {dateRange}
        </span>
      </div>
      <div className="p-4">
        <div className="flex mb-3">
          {nums.map((n, i) => (
            <div key={i}
              className={`flex-1 text-center ${i > 0 ? "border-l " + (dark ? "border-[#2a2d3a]" : "border-gray-100") : ""}`}>
              <div className={`text-xs mb-0.5 ${tm.muted}`}>{n.l}</div>
              <div className="text-base font-semibold" style={{ color: n.c }}>{n.v}</div>
            </div>
          ))}
        </div>
        <div className={`h-2 rounded-full overflow-hidden mb-1.5 relative ${tm.barBg}`}>
          <div className="absolute h-full rounded-full"
            style={{ width: `${minPct}%`, background: dark ? "rgba(96,165,250,0.2)" : "rgba(37,99,235,0.12)" }} />
          <div className="absolute h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, pct)}%`, background: barColor(pct) }} />
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className={tm.subtext}>{pct}% of expected</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: bs.bg, color: bs.c }}>
            {badgeTextValue}
          </span>
        </div>
      </div>
    </div>
  );
}

function ActivityDots({ activity, dark }) {
  return (
    <div className="flex gap-0.5 items-center">
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} className="w-1 h-1 rounded-sm"
          style={{ background: i < Math.round(activity / 10) ? "#1D9E75" : (dark ? "#2a2d3a" : "#e0e0e0") }} />
      ))}
    </div>
  );
}

function DailyRow({ day, year, month, whMin, whFull, tm, dark }) {
  const dow = new Date(year, month - 1, day.d).getDay();

  const pct = day.we
    ? (day.worked > 0 ? Math.min(100, (day.worked / parseHubstaffTime("4:00")) * 100) : 0)
    : Math.min(100, (day.worked / whFull) * 100);

  const missH = !day.we ? whMin - day.worked : null;
  const dateLabel = `${String(day.d).padStart(2, "0")} ${MONTHS[month - 1].slice(0, 3)}`;

  const activity = Number(day.activity || 0);
  const focus = Number(day.focus || 0);
  const hasWorked = day.worked > 0;
  const isWeekendOnly = day.we && !hasWorked;

  const progressMeta = value => {
    if (value >= 88) {
      return {
        fill: "linear-gradient(90deg, #0F6E56 0%, #1D9E75 55%, #4ADE80 100%)",
        glow: "rgba(29,158,117,0.38)",
        text: dark ? "#4ADE80" : "#0F6E56",
      };
    }

    if (value >= 60) {
      return {
        fill: "linear-gradient(90deg, #B45309 0%, #EF9F27 60%, #FBB040 100%)",
        glow: "rgba(239,159,39,0.35)",
        text: dark ? "#FBB040" : "#854F0B",
      };
    }

    return {
      fill: "linear-gradient(90deg, #A32D2D 0%, #E24B4A 65%, #F87171 100%)",
      glow: "rgba(226,75,74,0.35)",
      text: dark ? "#F87171" : "#A32D2D",
    };
  };

  const metricColor = value => {
    if (value >= 70) return dark ? "#4ADE80" : "#0F6E56";
    if (value >= 50) return dark ? "#FBB040" : "#854F0B";
    return dark ? "#F87171" : "#A32D2D";
  };

  const metricBg = value => {
    if (dark) {
      if (value >= 70) return "#0a2e1f";
      if (value >= 50) return "#2e1e05";
      return "#2e0a0a";
    }

    if (value >= 70) return "#E1F5EE";
    if (value >= 50) return "#FAEEDA";
    return "#FCEBEB";
  };

  const neutralBadgeStyle = {
    background: dark ? "#1d2230" : "#F3F4F6",
    color: dark ? "#8b8fa8" : "#6B7280",
  };

  const renderPercentBadge = value => (
    <span
      className="inline-flex items-center justify-center text-[11px] font-semibold px-2 py-1 rounded-full w-[56px] h-[26px]"
      style={{
        background: metricBg(value),
        color: metricColor(value),
      }}
    >
      {value}%
    </span>
  );

  const renderMutedPercentBadge = value => (
    <span
      className="inline-flex items-center justify-center text-[11px] font-medium px-2 py-1 rounded-full w-[56px] h-[26px]"
      style={neutralBadgeStyle}
    >
      {value}%
    </span>
  );

  const renderTimeBadge = value => (
    <span
      className="inline-flex items-center justify-center text-[11px] font-semibold px-2 py-1 rounded-full w-[68px] h-[26px]"
      style={{
        background: dark ? "#0b2035" : "#E8F1FF",
        color: dark ? "#60A5FA" : "#185FA5",
      }}
    >
      {value}
    </span>
  );

  const renderMutedTimeBadge = value => (
    <span
      className="inline-flex items-center justify-center text-[11px] font-medium px-2 py-1 rounded-full w-[68px] h-[26px]"
      style={neutralBadgeStyle}
    >
      {value}
    </span>
  );

  const meta = progressMeta(pct);

  const missEl = day.we
    ? day.worked > 0
      ? (
        <span
          className="inline-flex items-center justify-center text-[11px] font-semibold px-2 py-1 rounded-full w-[72px] h-[26px]"
          style={{
            background: dark ? "#0a2e1f" : "#E1F5EE",
            color: dark ? "#4ADE80" : "#0F6E56",
          }}
        >
          +{formatHubstaffTime(day.worked)}
        </span>
      )
      : <span className={`inline-flex items-center justify-end text-xs italic w-[72px] ${tm.muted}`}>Off</span>
    : missH <= 0
      ? (
        <span
          className="inline-flex items-center justify-center text-[11px] font-semibold px-2 py-1 rounded-full w-[72px] h-[26px]"
          style={{
            background: dark ? "#0a2e1f" : "#E1F5EE",
            color: dark ? "#4ADE80" : "#0F6E56",
          }}
        >
          ✓
        </span>
      )
      : (
        <span
          className="inline-flex items-center justify-center text-[11px] font-semibold px-2 py-1 rounded-full w-[72px] h-[26px]"
          style={{
            background: dark ? "#2e0a0a" : "#FCEBEB",
            color: dark ? "#F87171" : "#A32D2D",
          }}
        >
          -{formatHubstaffTime(missH)}
        </span>
      );

  return (
    <tr className={`border-b transition-colors ${day.we ? tm.rowAlt : ""} ${tm.rowBorder} ${dark ? "hover:bg-[#171b24]" : "hover:bg-gray-50"}`}>
      <td className={`px-3 py-3 text-xs font-semibold whitespace-nowrap ${tm.text}`}>
        {dateLabel}
      </td>

      <td className={`px-3 py-3 text-xs ${tm.muted}`}>
        {DAYS[dow]}
      </td>

      <td className="px-3 py-3">
        <div className="flex items-center gap-3">
          <div
            className="relative h-[10px] rounded-full overflow-hidden flex-1"
            style={{
              background: dark ? "linear-gradient(180deg, #303443, #252938)" : "linear-gradient(180deg, #E5E7EB, #DDE1E8)",
              boxShadow: dark ? "inset 0 1px 2px rgba(0,0,0,0.35)" : "inset 0 1px 2px rgba(15,23,42,0.10)",
            }}
          >
            <div
              className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
              style={{
                width: pct > 0 ? `${Math.max(7, pct)}%` : "0%",
                background: meta.fill,
                boxShadow: pct > 0 ? `0 0 12px ${meta.glow}` : "none",
              }}
            />
            <div
              className="absolute left-0 top-0 h-full rounded-full pointer-events-none"
              style={{
                width: pct > 0 ? `${Math.max(7, pct)}%` : "0%",
                background: "linear-gradient(180deg, rgba(255,255,255,0.34), rgba(255,255,255,0.02))",
              }}
            />
          </div>

          <span
            className="inline-flex items-center justify-center text-[10px] font-bold rounded-full w-[42px] h-[24px]"
            style={{
              background: dark ? "#111827" : "#F8FAFC",
              color: pct > 0 ? meta.text : (dark ? "#8b8fa8" : "#6B7280"),
              border: dark ? "1px solid #2a2d3a" : "1px solid #E5E7EB",
            }}
          >
            {Math.round(pct)}%
          </span>
        </div>
      </td>

      <td className={`px-5 py-3 text-xs font-semibold whitespace-nowrap ${tm.text}`}>
        {day.worked > 0 ? formatHubstaffTime(day.worked) : day.we ? "—" : "0:00"}
      </td>

      <td className="px-3 py-3">
        {isWeekendOnly
          ? <span className={`text-xs px-6 ${tm.muted}`}>—</span>
          : hasWorked
            ? renderPercentBadge(activity)
            : renderMutedPercentBadge(0)}
      </td>

      <td className="px-3 py-3">
        {isWeekendOnly
          ? <span className={`text-xs px-6 ${tm.muted}`}>—</span>
          : hasWorked
            ? renderPercentBadge(focus)
            : renderMutedPercentBadge(0)}
      </td>

      <td className="px-3 py-3">
        {isWeekendOnly
          ? <span className={`text-xs px-6 ${tm.muted}`}>—</span>
          : hasWorked
            ? renderTimeBadge(formatHubstaffTime(day.ssHours))
            : renderMutedTimeBadge("0:00")}
      </td>

      <td className="px-3 py-3 text-right">
        {missEl}
      </td>
    </tr>
  );
}

function InfoCard({ label, value, sub, color, tm }) {
  return (
    <div className={`rounded-xl p-3 border text-center ${tm.card}`}>
      <div className={`text-xs mb-1 ${tm.muted}`}>{label}</div>
      <div className={`text-base font-semibold ${tm.text}`} style={color ? { color } : {}}>{value}</div>
      <div className={`text-xs mt-0.5 ${tm.muted}`}>{sub}</div>
    </div>
  );
}

function SunIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export default function TimecardDashboard({ today = new Date() }) {
  const [dark, setDark] = useState(() => {
    try {
      const s = localStorage.getItem("bisviews_theme");
      return s ? s === "dark" : true;
    } catch {
      return true;
    }
  });

  const [employees, setEmployees] = useState([]);
  const [timeLogs, setTimeLogs] = useState({});
  const [availableMonths, setAvailableMonths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [error, setError] = useState(null);
  const [empId, setEmpId] = useState(null);
  const [{ year, month }, setSelectedMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });

  useEffect(() => {
    localStorage.setItem("bisviews_theme", dark ? "dark" : "light");
  }, [dark]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await employeeAPI.getAll();
      setEmployees(data);
      if (data.length > 0 && !empId) {
        setEmpId(data[0]._id);
      }
    } catch (err) {
      console.error("Failed to load employees:", err);
      setError("Failed to load employees. Please check if the server is running.");
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableMonths = async () => {
    if (!empId) return;

    try {
      const allLogs = await timeLogAPI.getByEmployee(empId);
      const months = buildAvailableMonths(allLogs);
      setAvailableMonths(months);

      if (months.length > 0) {
        const selectedKey = `${year}-${month}`;
        const exists = months.some(item => item.value === selectedKey);

        if (!exists) {
          setSelectedMonth({ year: months[0].year, month: months[0].month });
        }
      } else {
        setTimeLogs(prev => ({ ...prev, [empId]: [] }));
      }
    } catch (err) {
      console.error("Failed to load available months:", err);
      setAvailableMonths([]);
    }
  };

  const loadTimeLogs = async () => {
    if (!empId || availableMonths.length === 0) return;

    try {
      const logs = await timeLogAPI.getByEmployee(empId, year, month);
      setTimeLogs(prev => ({ ...prev, [empId]: logs }));
    } catch (err) {
      console.error("Failed to load time logs:", err);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    if (empId) {
      loadAvailableMonths();
    }
  }, [empId]);

  useEffect(() => {
    if (empId && availableMonths.length > 0) {
      loadTimeLogs();
    }
  }, [empId, year, month, availableMonths.length]);

  const tm = dark ? TH.dark : TH.light;
  const emp = employees.find(e => e._id === empId) || employees[0];

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${TH.dark.bg}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
          <p className={`mt-4 ${TH.dark.text}`}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${TH.dark.bg}`}>
        <div className={`text-center p-8 rounded-xl ${TH.dark.card}`}>
          <p className="text-lg mb-4 text-red-500">{error}</p>
          <button
            onClick={loadEmployees}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${TH.dark.bg}`}>
        <div className={`text-center p-8 rounded-xl ${TH.dark.card}`}>
          <p className={`text-lg mb-4 ${TH.dark.text}`}>No employees found. Please add employees first.</p>
        </div>
      </div>
    );
  }

  const WH_FULL = getEmployeeWorkMinutes(emp);
  const WH_MIN = getEmployeeMinMinutes(emp);
  const logs = timeLogs[empId] || [];
  const daysInMonth = new Date(year, month, 0).getDate();
  const isCurrent = year === today.getFullYear() && month === today.getMonth() + 1;
  const lastDay = isCurrent ? today.getDate() : daysInMonth;

  const daysWithLogs = Array.from({ length: lastDay }, (_, i) => {
    const d = i + 1;
    const dow = new Date(year, month - 1, d).getDay();
    const log = logs.find(l => {
      const parts = getDateParts(l.date);
      return parts.day === d && parts.month === month && parts.year === year;
    });

    return {
      d,
      we: dow === 0 || dow === 6,
      worked: log ? parseHubstaffTime(log.worked) : 0,
      activity: log ? Number(log.activity || 0) : 0,
      focus: log ? Number(log.focus || 0) : 0,
      ssHours: log ? parseHubstaffTime(log.ssHours) : 0,
    };
  });

  const p1 = daysWithLogs.filter(d => d.d <= 14);
  const p2 = daysWithLogs.filter(d => d.d >= 15);
  const e1 = getExp(p1, WH_FULL), w1 = getWork(p1), min1 = getExp(p1, WH_MIN);
  const m1 = Math.max(0, min1 - w1), pc1 = calcPct(w1, e1);
  const e2 = getExp(p2, WH_FULL), w2 = getWork(p2), min2 = getExp(p2, WH_MIN);
  const m2 = Math.max(0, min2 - w2), pc2 = calcPct(w2, e2);
  const eT = e1 + e2, wT = w1 + w2, minT = min1 + min2;
  const mT = Math.max(0, minT - wT), pcT = calcPct(wT, eT);
  const workDays = daysWithLogs.filter(d => !d.we).length;
  const workedDays = daysWithLogs.filter(d => !d.we && d.worked > 0).length;
  const workedRows = daysWithLogs.filter(d => !d.we && d.worked > 0);
  const avgAct = Math.round(workedRows.reduce((s, d) => s + d.activity, 0) / Math.max(1, workedDays));
  const focusPct = Math.round(workedRows.reduce((s, d) => s + d.focus, 0) / Math.max(1, workedDays));
  const totalSS = sumM(daysWithLogs, d => d.ssHours);
  const wkndDays = daysWithLogs.filter(d => d.we && d.worked > 0).length;
  const monthLabel = `${MONTHS[month - 1]} ${year}`;
  const reportStatus = pcT >= 88 ? "On Track" : pcT >= 65 ? "Behind" : "Critical";

  const handleDownloadExcel = async () => {
    if (!emp) return;

    try {
      setDownloadingExcel(true);

      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Bisviews";
      workbook.created = new Date();

      const sheet = workbook.addWorksheet("Timecard Report", {
        views: [{ showGridLines: true }],
      });

      sheet.columns = [
        { width: 18 },
        { width: 4 },
        { width: 20 },
        { width: 34 },
        { width: 16 },
        { width: 24 },
        { width: 15 },
        { width: 16 },
        { width: 24 },
        { width: 16 },
        { width: 17 },
        { width: 16 },
        { width: 14 },
        { width: 18 },
      ];

      const profileFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF6AA84F" } };
      const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFB45F06" } };
      const whiteFont = { color: { argb: "FFFFFFFF" }, bold: true };
      const border = {
        top: { style: "thin", color: { argb: "FFD9D9D9" } },
        left: { style: "thin", color: { argb: "FFD9D9D9" } },
        bottom: { style: "thin", color: { argb: "FFD9D9D9" } },
        right: { style: "thin", color: { argb: "FFD9D9D9" } },
      };

      const headers = [
        "Date",
        "Expected Hours",
        "Minimum Expected Hours",
        "Actual Hours",
        "Missing Hours",
        "Screenshots",
        "Status",
        "Avg. Activity",
        "Focus Time",
        "Work Time",
        "Remarks",
      ];

      const reportRows = daysWithLogs.map(day => {
        const expected = day.we ? 0 : WH_FULL;
        const minExpected = day.we ? 0 : WH_MIN;
        const actual = day.worked;
        const missing = Math.max(0, minExpected - actual);
        const hasWork = actual > 0;

        let status = "Not worked";
        if (expected > 0 && actual >= minExpected) status = "Completed";
        if (expected > 0 && actual > 0 && actual < minExpected) status = "Partial";
        if (expected > 0 && actual === 0) status = "Missed";
        if (expected === 0 && actual > 0) status = "Weekend work";

        const workTime = expected > 0 && hasWork
          ? `${calcPct(actual, expected)}%`
          : hasWork
            ? "Bonus"
            : "Not worked";

        return {
          date: formatReportDate(year, month, day.d),
          expected,
          minExpected,
          actual,
          missing,
          screenshots: hasWork ? `${formatHubstaffTime(day.ssHours)} hours` : "Not worked",
          status,
          activity: hasWork ? `${day.activity}%` : "Not worked",
          focus: hasWork ? `${day.focus}%` : "Not worked",
          workTime,
          remarks: "",
        };
      });

      const reportExpectedTotal = sumM(reportRows, r => r.expected);
      const reportMinExpectedTotal = sumM(reportRows, r => r.minExpected);
      const reportActualTotal = sumM(reportRows, r => r.actual);
      const reportMissingTotal = Math.max(0, reportMinExpectedTotal - reportActualTotal);

      sheet.getCell("A1").value = "Name";
      sheet.getCell("B1").value = ":";
      sheet.getCell("C1").value = emp.name || "";
      sheet.getCell("A2").value = "Country";
      sheet.getCell("B2").value = ":";
      sheet.getCell("C2").value = emp.country || "";
      sheet.getCell("A3").value = "Position";
      sheet.getCell("B3").value = ":";
      sheet.getCell("C3").value = emp.designation || "";
      sheet.getCell("A4").value = "Emp Type";
      sheet.getCell("B4").value = ":";
      sheet.getCell("C4").value = emp.type || "";

      headers.forEach((header, index) => {
        const cell = sheet.getCell(1, index + 4);
        cell.value = header;
        cell.fill = headerFill;
        cell.font = whiteFont;
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = border;
      });

      reportRows.forEach((row, index) => {
        const rowNumber = index + 2;

        sheet.getCell(rowNumber, 4).value = row.date;
        sheet.getCell(rowNumber, 5).value = formatHubstaffTime(row.expected);
        sheet.getCell(rowNumber, 6).value = formatHubstaffTime(row.minExpected);
        sheet.getCell(rowNumber, 7).value = formatHubstaffTime(row.actual);
        sheet.getCell(rowNumber, 8).value = formatHubstaffTime(row.missing);
        sheet.getCell(rowNumber, 9).value = row.screenshots;
        sheet.getCell(rowNumber, 10).value = row.status;
        sheet.getCell(rowNumber, 11).value = row.activity;
        sheet.getCell(rowNumber, 12).value = row.focus;
        sheet.getCell(rowNumber, 13).value = row.workTime;
        sheet.getCell(rowNumber, 14).value = row.remarks;

        for (let col = 4; col <= 14; col++) {
          const cell = sheet.getCell(rowNumber, col);
          cell.border = border;
          cell.alignment = {
            vertical: "middle",
            horizontal: col === 4 || col === 9 || col === 10 || col === 14 ? "left" : "center",
          };
        }
      });

      const totalRow = reportRows.length + 3;
      sheet.getCell(totalRow, 3).value = "Total :";
      sheet.getCell(totalRow, 5).value = formatHubstaffTimeWithSeconds(reportExpectedTotal);
      sheet.getCell(totalRow, 6).value = formatHubstaffTimeWithSeconds(reportMinExpectedTotal);
      sheet.getCell(totalRow, 7).value = formatHubstaffTimeWithSeconds(reportActualTotal);
      sheet.getCell(totalRow, 8).value = formatHubstaffTimeWithSeconds(reportMissingTotal);

      [3, 5, 6, 7, 8].forEach(col => {
        const cell = sheet.getCell(totalRow, col);
        cell.font = { bold: true };
        cell.alignment = { horizontal: "right", vertical: "middle" };
      });

      for (let row = 1; row <= totalRow; row++) {
        for (let col = 1; col <= 3; col++) {
          const cell = sheet.getCell(row, col);
          cell.fill = profileFill;
          cell.font = whiteFont;
          cell.border = {
            top: { style: "thin", color: { argb: "FF5B9445" } },
            left: { style: "thin", color: { argb: "FF5B9445" } },
            bottom: { style: "thin", color: { argb: "FF5B9445" } },
            right: { style: "thin", color: { argb: "FF5B9445" } },
          };
          cell.alignment = { vertical: "middle", horizontal: col === 2 ? "center" : "left" };
        }
      }

      for (let row = 1; row <= totalRow; row++) {
        sheet.getRow(row).height = row === 1 ? 24 : 20;
      }

      sheet.getRow(totalRow).height = 24;

      sheet.views = [
        {
          state: "frozen",
          xSplit: 3,
          ySplit: 1,
        },
      ];

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      saveAs(blob, `${safeFileName(emp.name)}_${safeFileName(monthLabel)}_timecard.xlsx`);
    } catch (err) {
      console.error("Failed to download Excel:", err);
      alert("Failed to download Excel report.");
    } finally {
      setDownloadingExcel(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!emp) return;

    try {
      setDownloadingPDF(true);

      const doc = new jsPDF("p", "mm", "a4");

      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();

      const margin = 14;
      const contentW = pageW - margin * 2;

      const green = [15, 110, 86];
      const darkGreen = [1, 50, 20];
      const lightGreen = [225, 245, 238];
      const softBg = [248, 250, 252];
      const white = [255, 255, 255];
      const textDark = [17, 24, 39];
      const textMuted = [100, 116, 139];
      const border = [226, 232, 240];
      const red = [185, 28, 28];
      const orange = [180, 83, 9];
      const blue = [24, 95, 165];

      const pdfText = value => String(value ?? "")
        .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, "")
        .replace(/[^\x20-\x7E]/g, "")
        .replace(/\s+/g, " ")
        .trim();

      const employeeName = pdfText(emp.name) || "Employee";
      const employeeCountry = pdfText(emp.country) || "Not specified";
      const employeePosition = pdfText(emp.designation) || "Not specified";
      const employeeType = pdfText(emp.type) || "Not specified";

      const setFont = (size = 10, color = textDark, bold = false) => {
        doc.setFont("helvetica", bold ? "bold" : "normal");
        doc.setFontSize(size);
        doc.setTextColor(...color);
      };

      const trimText = (value, maxWidth) => {
        let text = pdfText(value);
        if (!text) return "";

        if (doc.getTextWidth(text) <= maxWidth) return text;

        while (text.length > 3 && doc.getTextWidth(`${text}...`) > maxWidth) {
          text = text.slice(0, -1);
        }

        return `${text}...`;
      };

      const drawPageBg = () => {
        doc.setFillColor(...softBg);
        doc.rect(0, 0, pageW, pageH, "F");
      };

      const drawBox = (x, y, w, h, fill = white, stroke = border, radius = 4) => {
        doc.setFillColor(...fill);
        doc.setDrawColor(...stroke);
        doc.roundedRect(x, y, w, h, radius, radius, "FD");
      };

      const drawFooter = () => {
        setFont(7.5, textMuted);
        doc.text("Generated by Bisviews Timecard", margin, pageH - 8);
        doc.text(`Page ${doc.internal.getCurrentPageInfo().pageNumber}`, pageW - margin - 13, pageH - 8);
      };

      const getStatusMeta = pct => {
        if (pct >= 100) return { label: "On Track", color: green, bg: lightGreen };
        if (pct >= 80) return { label: "Needs Attention", color: orange, bg: [255, 247, 237] };
        return { label: "Critical Gap", color: red, bg: [254, 226, 226] };
      };

      const reportRows = daysWithLogs.map(day => {
        const expected = day.we ? 0 : WH_FULL;
        const minExpected = day.we ? 0 : WH_MIN;
        const actual = day.worked;
        const missing = Math.max(0, minExpected - actual);

        let status = "Off";
        if (!day.we && actual === 0) status = "Missed";
        if (!day.we && actual > 0 && actual < minExpected) status = "Partial";
        if (!day.we && actual >= minExpected) status = "Met";
        if (day.we && actual > 0) status = "Weekend Work";

        return {
          date: `${String(day.d).padStart(2, "0")} ${MONTHS[month - 1].slice(0, 3)}`,
          day: DAYS[new Date(year, month - 1, day.d).getDay()],
          expected,
          minExpected,
          actual,
          missing,
          status,
        };
      });

      const period1Rows = reportRows.filter((_, index) => index < 14);
      const period2Rows = reportRows.filter((_, index) => index >= 14);

      const getReportSummary = rows => {
        const expected = sumM(rows, r => r.expected);
        const minExpected = sumM(rows, r => r.minExpected);
        const actual = sumM(rows, r => r.actual);
        const missing = Math.max(0, minExpected - actual);
        const pct = minExpected > 0 ? Math.round((actual / minExpected) * 100) : 0;

        return { expected, minExpected, actual, missing, pct };
      };

      const period1 = getReportSummary(period1Rows);
      const period2 = getReportSummary(period2Rows);
      const total = getReportSummary(reportRows);

      const drawHeader = () => {
        doc.setFillColor(...darkGreen);
        doc.rect(0, 0, pageW, 36, "F");

        doc.setFillColor(...green);
        doc.roundedRect(margin, 10, 36, 12, 4, 4, "F");

        setFont(10, white, true);
        doc.text("BISVIEWS", margin + 6, 18);

        setFont(20, white, true);
        doc.text("Employee Timecard Report", margin + 44, 16);

        setFont(9.5, [220, 242, 223]);
        doc.text(`${monthLabel} performance summary`, margin + 45, 24);

        const status = getStatusMeta(total.pct);

        doc.setFillColor(...status.bg);
        doc.roundedRect(pageW - margin - 38, 11, 38, 12, 4, 4, "F");

        setFont(8.5, status.color, true);
        doc.text(status.label, pageW - margin - 31.5, 18.6);
      };

      const drawContinuationHeader = () => {
        setFont(13, darkGreen, true);
        doc.text("Employee Timecard Report", margin, 16);

        setFont(8.5, textMuted);
        doc.text(`${employeeName} • ${monthLabel}`, margin, 23);
      };

      const drawEmployeeInfo = y => {
        drawBox(margin, y, contentW, 34, white, border, 5);

        setFont(13, textDark, true);
        doc.text(trimText(employeeName, 80), margin + 6, y + 9);

        setFont(8.5, textMuted);
        doc.text(`Month: ${monthLabel}`, margin + 6, y + 18);
        doc.text(`Country: ${trimText(employeeCountry, 58)}`, margin + 6, y + 26);

        doc.text(`Position: ${trimText(employeePosition, 50)}`, margin + 78, y + 18);
        doc.text(`Employee Type: ${trimText(employeeType, 42)}`, margin + 78, y + 26);

        doc.text(`Daily Required: ${formatHubstaffTime(WH_FULL)}`, margin + 145, y + 18);
        doc.text(`Minimum Expected: ${formatHubstaffTime(WH_MIN)}`, margin + 145, y + 26);
      };

      const drawMetricCard = (x, y, w, h, label, value, color = green) => {
        drawBox(x, y, w, h, white, border, 4);

        setFont(7.5, textMuted);
        doc.text(label, x + 4, y + 6.5);

        setFont(13, color, true);
        doc.text(value, x + 4, y + 15.5);
      };

      const drawPeriodBlock = (title, summary, x, y, w) => {
        const h = 72;
        const status = getStatusMeta(summary.pct);

        drawBox(x, y, w, h, white, border, 5);

        setFont(11, textDark, true);
        doc.text(title, x + 5, y + 9);

        doc.setFillColor(...status.bg);
        doc.roundedRect(x + w - 40, y + 5, 34, 10, 4, 4, "F");

        setFont(7.5, status.color, true);
        doc.text(status.label, x + w - 35.5, y + 11.7);

        const cardW = (w - 15) / 2;
        const cardH = 18;

        drawMetricCard(x + 5, y + 22, cardW, cardH, "Required Hours", formatHubstaffTime(summary.expected), green);
        drawMetricCard(x + 9 + cardW, y + 22, cardW, cardH, "Minimum Expected", formatHubstaffTime(summary.minExpected), blue);

        drawMetricCard(x + 5, y + 45, cardW, cardH, "Actual Worked", formatHubstaffTime(summary.actual), summary.pct >= 100 ? green : orange);
        drawMetricCard(x + 9 + cardW, y + 45, cardW, cardH, "Missing Hours", formatHubstaffTime(summary.missing), summary.missing > 0 ? red : green);
      };

      const drawTotalBlock = y => {
        const status = getStatusMeta(total.pct);

        drawBox(margin, y, contentW, 61, white, border, 5);

        setFont(12, textDark, true);
        doc.text("Total Month Report", margin + 6, y + 10);

        doc.setFillColor(...status.bg);
        doc.roundedRect(pageW - margin - 42, y + 5, 34, 10, 4, 4, "F");

        setFont(7.5, status.color, true);
        doc.text(status.label, pageW - margin - 37.5, y + 11.7);

        const gap = 5;
        const cardW = (contentW - 22) / 4;
        const cardY = y + 24;

        drawMetricCard(margin + 6, cardY, cardW, 23, "Required Hours", formatHubstaffTime(total.expected), green);
        drawMetricCard(margin + 6 + cardW + gap, cardY, cardW, 23, "Minimum Expected", formatHubstaffTime(total.minExpected), blue);
        drawMetricCard(margin + 6 + (cardW + gap) * 2, cardY, cardW, 23, "Actual Worked", formatHubstaffTime(total.actual), total.pct >= 100 ? green : orange);
        drawMetricCard(margin + 6 + (cardW + gap) * 3, cardY, cardW, 23, "Missing Hours", formatHubstaffTime(total.missing), total.missing > 0 ? red : green);
      };

      const tableColumns = [
        { label: "Date", w: 25 },
        { label: "Day", w: 17 },
        { label: "Required", w: 28 },
        { label: "Minimum", w: 30 },
        { label: "Worked", w: 26 },
        { label: "Missing", w: 26 },
        { label: "Status", w: 28 },
      ];

      const drawTableHeader = y => {
        doc.setFillColor(...green);
        doc.roundedRect(margin, y, contentW, 9, 2, 2, "F");

        let x = margin;

        tableColumns.forEach(col => {
          setFont(7.5, white, true);
          doc.text(col.label, x + 3, y + 6);
          x += col.w;
        });
      };

      const drawDailyRows = startY => {
        let y = startY;
        const rowH = 8.2;

        reportRows.forEach((row, index) => {
          if (y > pageH - 24) {
            drawFooter();
            doc.addPage();
            drawPageBg();
            drawContinuationHeader();

            y = 32;
            drawTableHeader(y);
            y += 10;
          }

          const bg = index % 2 === 0 ? white : [249, 250, 251];

          doc.setFillColor(...bg);
          doc.setDrawColor(...border);
          doc.rect(margin, y - 1, contentW, rowH, "FD");

          const values = [
            row.date,
            row.day,
            formatHubstaffTime(row.expected),
            formatHubstaffTime(row.minExpected),
            formatHubstaffTime(row.actual),
            formatHubstaffTime(row.missing),
            row.status,
          ];

          let x = margin;

          values.forEach((value, i) => {
            const col = tableColumns[i];
            const isMissing = i === 5 && row.missing > 0;
            const isStatus = i === 6;

            if (isMissing) {
              setFont(7.4, red, true);
            } else if (isStatus && row.status === "Met") {
              setFont(7.4, green, true);
            } else if (isStatus && row.status === "Partial") {
              setFont(7.4, orange, true);
            } else if (isStatus && row.status === "Missed") {
              setFont(7.4, red, true);
            } else {
              setFont(7.4, textDark);
            }

            doc.text(trimText(value, col.w - 5), x + 3, y + 4.6);
            x += col.w;
          });

          y += rowH;
        });

        return y;
      };

      drawPageBg();
      drawHeader();

      let y = 46;

      drawEmployeeInfo(y);

      y += 43;

      const periodW = (contentW - 6) / 2;

      drawPeriodBlock("Period 1 Report", period1, margin, y, periodW);
      drawPeriodBlock("Period 2 Report", period2, margin + periodW + 6, y, periodW);

      y += 82;

      drawTotalBlock(y);

      y += 73;

      setFont(12.5, textDark, true);
      doc.text("Daily Report", margin, y);

      setFont(8, textMuted);
      doc.text("Missing hours are calculated from Minimum Expected Hours.", margin, y + 6);

      y += 13;

      drawTableHeader(y);
      y += 10;

      y = drawDailyRows(y);

      if (y > pageH - 38) {
        drawFooter();
        doc.addPage();
        drawPageBg();
        drawContinuationHeader();
        y = 34;
      }

      y += 5;

      drawBox(margin, y, contentW, 27, white, border, 5);

      setFont(9.5, textDark, true);
      doc.text("Final Monthly Total", margin + 6, y + 10);

      const finalW = (contentW - 12) / 4;
      const finalY = y + 15;

      setFont(7.6, textMuted);
      doc.text(`Required: ${formatHubstaffTimeWithSeconds(total.expected)}`, margin + 6, finalY);
      doc.text(`Minimum: ${formatHubstaffTimeWithSeconds(total.minExpected)}`, margin + 6 + finalW, finalY);
      doc.text(`Worked: ${formatHubstaffTimeWithSeconds(total.actual)}`, margin + 6 + finalW * 2, finalY);

      setFont(7.6, total.missing > 0 ? red : green, true);
      doc.text(`Missing: ${formatHubstaffTimeWithSeconds(total.missing)}`, margin + 6 + finalW * 3, finalY);

      drawFooter();

      doc.save(`${safeFileName(employeeName)}_${safeFileName(monthLabel)}_timecard_report.pdf`);
    } catch (err) {
      console.error("Failed to download PDF:", err);
      alert("Failed to download PDF.");
    } finally {
      setDownloadingPDF(false);
    }
  };

  return (
    <div className={`min-h-screen p-4 md:p-6 transition-colors duration-200 ${tm.bg}`}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-lg"
              style={{ background: "#0F6E56" }}>⏱</div>
            <div>
              <div className={`text-base font-semibold text-xl ${tm.text}`}>BisViews Time-Card</div>
              <div className={`text-xs ${tm.subtext}`}>{monthLabel}{isCurrent ? " · Live" : ""}</div>
            </div>
          </div>

          <div className="flex gap-2 items-center flex-wrap justify-end">
            <button
              onClick={handleDownloadExcel}
              disabled={downloadingExcel}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white cursor-pointer disabled:opacity-60 shadow-lg hover:opacity-90 active:scale-[0.98] transition-all flex items-center gap-2"
              style={{ background: "linear-gradient(135deg, #1D9E75, #0F6E56)" }}
            >
              <DownloadIcon />
              {downloadingExcel ? "Preparing Excel..." : "Download Excel"}
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={downloadingPDF}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white cursor-pointer disabled:opacity-60 shadow-lg hover:opacity-90 active:scale-[0.98] transition-all flex items-center gap-2"
              style={{ background: "linear-gradient(135deg, #185FA5, #123f73)" }}
            >
              <DownloadIcon />
              {downloadingPDF ? "Preparing PDF..." : "Download PDF"}
            </button>

            <select
              value={availableMonths.length > 0 ? `${year}-${month}` : ""}
              onChange={e => {
                if (!e.target.value) return;
                const [y, m] = e.target.value.split("-").map(Number);
                setSelectedMonth({ year: y, month: m });
              }}
              className={`px-4 py-2.5 rounded-xl border-2 cursor-pointer font-bold text-sm outline-none transition-all ${tm.input}`}
              style={{
                borderColor: "#1D9E75",
                boxShadow: dark ? "0 0 0 3px rgba(29,158,117,0.22)" : "0 0 0 3px rgba(29,158,117,0.16)",
                background: dark ? "#12251f" : "#F0FFF8",
                color: dark ? "#E9FFF5" : "#085041",
                minWidth: 156,
              }}
            >
              {availableMonths.length === 0 ? (
                <option value="">No data month</option>
              ) : (
                availableMonths.map(item => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))
              )}
            </select>

            <button onClick={() => setDark(d => !d)}
              className={`w-10 h-10 rounded-xl border flex items-center justify-center cursor-pointer transition-colors ${tm.card} ${tm.text}`}>
              {dark ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </div>

        <div className={`flex gap-2 flex-wrap mb-4 p-3 rounded-xl border ${tm.card}`}>
          {employees.map(e => (
            <button key={e._id} onClick={() => setEmpId(e._id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
              style={e._id === empId
                ? { background: "#1D9E75", color: "#fff", borderColor: "#1D9E75" }
                : { background: "transparent", color: dark ? "#8b8fa8" : "#6b7280", borderColor: dark ? "#2a2d3a" : "#e5e7eb" }}>
              <span className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: e._id === empId ? "rgba(255,255,255,0.7)" : e.color }} />
              {e.name}
            </button>
          ))}
        </div>

        <EmployeeDetailCard emp={emp} dark={dark} tm={tm} />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <SummaryCard label="Total expected hours (Month)" value={formatHubstaffTime(eT)} sub={`${workDays} working days`} tm={tm} />
          <SummaryCard label="Min. acceptable hours (Month)" value={formatHubstaffTime(minT)} sub={`${formatHubstaffTime(WH_MIN)}/day threshold`}
            color={dark ? "#60a5fa" : "#2563EB"} tm={tm} />
          <SummaryCard label="Total worked hours (Month)" value={formatHubstaffTime(wT)} sub={`${workedDays}/${workDays} days active`}
            color={valColor(pcT, dark)} tm={tm} />
          <SummaryCard label="Missing hours (Month)" value={mT > 0 ? `-${formatHubstaffTime(mT)}` : "0:00"} sub={`${pcT}% of expected`}
            color={mT === 0 ? (dark ? "#4ADE80" : "#0F6E56") : (dark ? "#F87171" : "#A32D2D")} tm={tm} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <PeriodCard title="Period 1"
            dateRange={`1-${Math.min(14, lastDay)} ${MONTHS[month - 1].slice(0, 3)}`}
            expected={e1} minAccept={min1} worked={w1} missing={m1} pct={pc1} tm={tm} dark={dark} />
          <PeriodCard title="Period 2"
            dateRange={`15-${lastDay} ${MONTHS[month - 1].slice(0, 3)}`}
            expected={e2} minAccept={min2} worked={w2} missing={m2} pct={pc2} tm={tm} dark={dark} />
        </div>

        <div className={`rounded-xl border overflow-hidden mb-4 ${tm.card}`}>
          <div className={`px-4 py-3 flex items-center justify-between border-b flex-wrap gap-2 ${tm.header}`}>
            <span className={`text-sm font-medium ${tm.text}`}>Daily log</span>
            <div className="flex gap-3 flex-wrap">
              {[["#1D9E75", "Full"], ["#EF9F27", "Partial"], ["#E24B4A", "Missed"], [dark ? "#3a3d4a" : "#C0BEB5", "Weekend"]].map(([c, l]) => (
                <span key={l} className={`flex items-center gap-1 text-xs ${tm.muted}`}>
                  <span className="w-2 h-2 rounded-sm inline-block" style={{ background: c }} />{l}
                </span>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse table-fixed" style={{ minWidth: 940 }}>
              <colgroup>
                <col style={{ width: 92 }} />
                <col style={{ width: 58 }} />
                <col style={{ width: 270 }} />
                <col style={{ width: 82 }} />
                <col style={{ width: 112 }} />
                <col style={{ width: 92 }} />
                <col style={{ width: 118 }} />
                <col style={{ width: 86 }} />
              </colgroup>

              <thead>
                <tr className={tm.thBg}>
                  {["Date", "Day", "Progress", "Worked", "Avg. Activity", "Focus", "Screenshot", "Missing"].map((h, i) => (
                    <th
                      key={h}
                      className={`px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-left ${tm.muted} ${i === 7 ? "text-right pr-4" : ""}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {daysWithLogs.map(day => (
                  <DailyRow
                    key={day.d}
                    day={day}
                    year={year}
                    month={month}
                    whMin={WH_MIN}
                    whFull={WH_FULL}
                    tm={tm}
                    dark={dark}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <InfoCard label="Avg. activity" value={`${avgAct}%`}
            sub={avgAct >= 70 ? "Good pace" : avgAct >= 50 ? "Moderate" : "Needs attention"}
            color={avgAct >= 70 ? (dark ? "#4ADE80" : "#0F6E56") : avgAct >= 50 ? (dark ? "#FBB040" : "#854F0B") : (dark ? "#F87171" : "#A32D2D")}
            tm={tm} />
          <InfoCard label="Focus time" value={`${focusPct}%`}
            sub={focusPct >= 70 ? "Good focus" : focusPct >= 50 ? "Moderate" : "Needs attention"}
            color={focusPct >= 70 ? (dark ? "#4ADE80" : "#0F6E56") : focusPct >= 50 ? (dark ? "#FBB040" : "#854F0B") : (dark ? "#F87171" : "#A32D2D")}
            tm={tm} />
          <InfoCard label="Screenshot hours" value={formatHubstaffTime(totalSS)}
            sub="of tracked time" color={dark ? "#60a5fa" : "#185FA5"} tm={tm} />
          <InfoCard label="Days absent" value={workDays - workedDays}
            sub={`of ${workDays} work days`}
            color={(workDays - workedDays) > 0 ? (dark ? "#F87171" : "#A32D2D") : (dark ? "#4ADE80" : "#0F6E56")}
            tm={tm} />
          <InfoCard label="Weekend work" value={`${wkndDays} days`}
            sub="bonus effort" color={dark ? "#4ADE80" : "#0F6E56"} tm={tm} />
        </div>
      </div>
    </div>
  );
}