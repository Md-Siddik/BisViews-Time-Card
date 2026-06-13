/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/set-state-in-effect */
// src/components/DataEntryForm.jsx
import { useState, useEffect, useRef } from "react";
import { employeeAPI, timeLogAPI } from "../services/api";

const COUNTRIES = [
  "🇧🇩 Bangladesh", "🇺🇸 USA", "🇬🇧 UK", "🇮🇳 India",
  "🇵🇰 Pakistan", "🇳🇬 Nigeria", "🇨🇦 Canada", "🇦🇺 Australia", "🇩🇪 Germany",
  "🇫🇷 France", "🇸🇬 Singapore",
];

const COLORS = [
  "#1D9E75", "#378ADD", "#EF9F27", "#D4537E", "#534AB7",
  "#993C1D", "#185FA5", "#639922", "#854F0B", "#993556", "#3B6D11", "#C2410C",
];

const TH = {
  dark: {
    bg: "bg-[#0f1117]", card: "bg-[#1a1d27] border-[#2a2d3a]",
    header: "bg-[#14171f] border-[#2a2d3a]", text: "text-[#f1f2f6]",
    subtext: "text-[#8b8fa8]", muted: "text-[#5a5d73]",
    input: "bg-[#0f1117] border-[#2a2d3a] text-[#f1f2f6] placeholder-[#5a5d73]",
    rowAlt: "bg-[#14171f]", chip: "bg-[#0a2e1f] border-[#1a4d38] text-[#4ADE80]",
    info: "bg-[#0c1e33] border-[#1e3a5f] text-[#93C5FD]",
    warn: "bg-[#1a1505] border-[#3d2e08] text-[#FBB040]",
  },
  light: {
    bg: "bg-gray-100", card: "bg-white border-gray-200",
    header: "bg-gray-50 border-gray-200", text: "text-gray-800",
    subtext: "text-gray-500", muted: "text-gray-400",
    input: "bg-gray-50 border-gray-300 text-gray-800 placeholder-gray-400",
    rowAlt: "bg-gray-50", chip: "bg-green-50 border-green-200 text-green-700",
    info: "bg-blue-50 border-blue-200 text-blue-700",
    warn: "bg-amber-50 border-amber-200 text-amber-700",
  },
};

const TIME_RE = /^\d{1,2}:[0-5]\d$/;
const HOUR = 60;

const isHubstaffTime = value => TIME_RE.test(String(value || "").trim());

const parseHubstaffTime = value => {
  if (value === null || value === undefined || value === "") return 0;

  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value * HOUR);
  }

  const text = String(value).trim();
  if (!text) return 0;

  const clean = text.replace(/[hH]/g, "").trim();
  const timeMatch = clean.match(/^(-)?(\d+):([0-5]\d)$/);

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

const formatMinutes = minutes => {
  const total = Math.round(Number(minutes) || 0);
  const sign = total < 0 ? "-" : "";
  const abs = Math.abs(total);
  const hours = Math.floor(abs / HOUR);
  const mins = abs % HOUR;
  return `${sign}${hours}:${String(mins).padStart(2, "0")}`;
};

const formatStoredTime = value => formatMinutes(parseHubstaffTime(value));

const cleanTimeInput = value => String(value || "").trim();

const validateRequiredTime = (label, value, minMinutes, maxMinutes, showToast) => {
  const clean = cleanTimeInput(value);

  if (!isHubstaffTime(clean)) {
    showToast(`${label} must be in 8:21 format.`, false);
    return null;
  }

  const minutes = parseHubstaffTime(clean);

  if (minutes < minMinutes || minutes > maxMinutes) {
    showToast(`${label} must be between ${formatMinutes(minMinutes)} and ${formatMinutes(maxMinutes)}.`, false);
    return null;
  }

  return minutes;
};

const validateOptionalTime = (label, value, maxMinutes, showToast) => {
  const clean = cleanTimeInput(value);

  if (!clean) return "0:00";

  if (!isHubstaffTime(clean)) {
    showToast(`${label} must be in 8:21 format.`, false);
    return null;
  }

  const minutes = parseHubstaffTime(clean);

  if (minutes < 0 || minutes > maxMinutes) {
    showToast(`${label} must be between 0:00 and ${formatMinutes(maxMinutes)}.`, false);
    return null;
  }

  return clean;
};

const validatePercent = (label, value, showToast) => {
  const clean = String(value || "").trim();

  if (!clean) return 0;

  const num = Number(clean);

  if (!Number.isFinite(num) || num < 0 || num > 100) {
    showToast(`${label} must be between 0 and 100.`, false);
    return null;
  }

  return num;
};

function useToast() {
  const [toast, setToast] = useState(null);
  const show = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2800);
  };
  return { toast, show };
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-medium text-white shadow-2xl"
         style={{ background: toast.ok ? "#0F6E56" : "#A32D2D", animation: "fadeUp 0.2s ease" }}>
      {toast.msg}
    </div>
  );
}

function Label({ children }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ opacity: 0.6 }}>
      {children}
    </label>
  );
}

function Input({ className = "", suffix, ...props }) {
  return (
    <div className="relative">
      <input className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20 transition-all duration-150 ${className}`} {...props} />
      {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-40">{suffix}</span>}
    </div>
  );
}

function Select({ className = "", children, ...props }) {
  return (
    <select className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none cursor-pointer focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/20 transition-all duration-150 ${className}`} {...props}>
      {children}
    </select>
  );
}

function EmployeeTab({ dark, tm, onDataChange, showToast }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [color, setColor] = useState(COLORS[0]);

  const getFormFromEditing = editingEmployee => {
    if (editingEmployee) {
      return {
        name: editingEmployee.name,
        designation: editingEmployee.designation,
        country: editingEmployee.country,
        type: editingEmployee.type,
        workHours: formatStoredTime(editingEmployee.workHours ?? "8:00"),
        minHours: formatStoredTime(editingEmployee.minHours ?? "7:00"),
      };
    }

    return {
      name: "",
      designation: "",
      country: COUNTRIES[0],
      type: "Full-time",
      workHours: "8:00",
      minHours: "7:00",
    };
  };

  const [form, setForm] = useState(() => getFormFromEditing(null));
  const isInitialMount = useRef(true);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const data = await employeeAPI.getAll();
      setEmployees(data);
      onDataChange?.();
    } catch (error) {
      showToast("Failed to load employees", false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      loadEmployees();
    }
  }, []);

  const handleEdit = employee => {
    setEditing(employee);
    setForm(getFormFromEditing(employee));
    setColor(employee.color);
  };

  const resetForm = () => {
    setEditing(null);
    setColor(COLORS[0]);
    setForm(getFormFromEditing(null));
  };

  const handleTypeChange = type => {
    setForm(f => ({
      ...f,
      type,
      workHours: type === "Part-time" ? "4:00" : "8:00",
      minHours: type === "Part-time" ? "4:00" : "7:00",
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.designation.trim()) {
      showToast("Name and designation are required.", false);
      return;
    }

    const wh = validateRequiredTime("Daily work hours", form.workHours, parseHubstaffTime("1:00"), parseHubstaffTime("12:00"), showToast);
    if (wh === null) return;

    const mh = validateRequiredTime("Min hours", form.minHours, parseHubstaffTime("1:00"), parseHubstaffTime("12:00"), showToast);
    if (mh === null) return;

    if (mh > wh) {
      showToast("Min hours must be equal to or less than work hours.", false);
      return;
    }

    const payload = {
      ...form,
      workHours: cleanTimeInput(form.workHours),
      minHours: cleanTimeInput(form.minHours),
      color,
    };

    try {
      if (editing) {
        await employeeAPI.update(editing._id, payload);
        showToast("Employee updated!");
      } else {
        await employeeAPI.create(payload);
        showToast("Employee added!");
      }
      await loadEmployees();
      resetForm();
    } catch (error) {
      showToast("Failed to save employee", false);
    }
  };

  const handleDelete = async id => {
    if (window.confirm("Are you sure you want to delete this employee?")) {
      try {
        await employeeAPI.delete(id);
        await loadEmployees();
        if (editing?._id === id) resetForm();
        showToast("Employee removed.");
      } catch (error) {
        showToast("Failed to delete employee", false);
      }
    }
  };

  const inputCls = `${tm.input}`;
  const cardBorder = dark ? "border-[#2a2d3a]" : "border-gray-200";

  if (loading && employees.length === 0) {
    return (
      <div className={`rounded-2xl border p-8 text-center ${tm.card}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
        <p className={`mt-2 text-sm ${tm.subtext}`}>Loading employees...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start text-white">
      <div className={`rounded-2xl border overflow-hidden ${tm.card}`}>
        <div className={`px-5 py-4 border-b flex justify-between items-center ${tm.header}`}>
          <div>
            <div className={`text-sm font-semibold ${tm.text}`}>
              {editing ? "Edit Employee" : "Add New Employee"}
            </div>
            <div className={`text-xs mt-0.5 ${tm.muted}`}>
              {editing ? "Update profile details" : "Fill in profile details"}
            </div>
          </div>
          {editing && (
            <button
              onClick={resetForm}
              className={`text-xs px-3 py-1.5 rounded-lg border cursor-pointer transition-all ${tm.subtext} ${cardBorder}`}
              style={{ background: "transparent" }}
            >
              ✕ Cancel
            </button>
          )}
        </div>
        <div className="p-5 flex flex-col gap-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Full name *</Label>
              <Input
                className={inputCls}
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Rafiul Islam"
              />
            </div>
            <div>
              <Label>Designation *</Label>
              <Input
                className={inputCls}
                value={form.designation}
                onChange={e => setForm(f => ({ ...f, designation: e.target.value }))}
                placeholder="e.g. UI/UX Designer"
              />
            </div>
          </div>
          <div>
            <Label>Country</Label>
            <Select
              className={inputCls}
              value={form.country}
              onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
            >
              {COUNTRIES.map(c => <option key={c}>{c}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Employment type *</Label>
              <Select
                className={inputCls}
                value={form.type}
                onChange={e => handleTypeChange(e.target.value)}
              >
                <option>Full-time</option>
                <option>Part-time</option>
                <option>Contractor</option>
              </Select>
            </div>
            <div>
              <Label>Color tag</Label>
              <div className="flex gap-1.5 flex-wrap mt-1">
                {COLORS.map(c => (
                  <div
                    key={c}
                    onClick={() => setColor(c)}
                    className="w-6 h-6 rounded-md cursor-pointer transition-all duration-150"
                    style={{
                      background: c,
                      border: `2px solid ${color === c ? "#fff" : "transparent"}`,
                      boxShadow: color === c ? `0 0 0 2px #1D9E75` : "none",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Daily work hours *</Label>
              <Input
                className={inputCls}
                type="text"
                inputMode="text"
                pattern="^\\d{1,2}:[0-5]\\d$"
                maxLength="5"
                value={form.workHours}
                suffix="hrs"
                placeholder="e.g. 8:21"
                onChange={e => setForm(f => ({ ...f, workHours: e.target.value }))}
              />
            </div>
            <div>
              <Label>Min. acceptable hrs *</Label>
              <Input
                className={inputCls}
                type="text"
                inputMode="text"
                pattern="^\\d{1,2}:[0-5]\\d$"
                maxLength="5"
                value={form.minHours}
                suffix="hrs"
                placeholder="e.g. 7:00"
                onChange={e => setForm(f => ({ ...f, minHours: e.target.value }))}
              />
            </div>
          </div>
          <div className={`rounded-xl border px-3 py-2.5 text-xs ${tm.info}`}>
            💡 <b>Full-time:</b> 8:00/day, min 7:00 recommended. <b>Part-time:</b> 4:00/day.
          </div>
          <button
            onClick={handleSave}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer transition-all duration-200 hover:opacity-90 active:scale-[0.99] mt-1"
            style={{ background: "#1D9E75" }}
          >
            {editing ? "💾 Update Employee" : "✚ Add Employee"}
          </button>
        </div>
      </div>

      <div className={`rounded-2xl border overflow-hidden ${tm.card}`}>
        <div className={`px-5 py-3.5 border-b flex justify-between items-center ${tm.header}`}>
          <div className={`text-sm font-semibold ${tm.text}`}>Employee List</div>
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{
              background: dark ? "#0a2e1f" : "#E1F5EE",
              color: dark ? "#4ADE80" : "#085041",
            }}
          >
            {employees.length} employees
          </span>
        </div>
        <div className="p-3 flex flex-col gap-2 max-h-[460px] overflow-y-auto">
          {employees.length === 0 ? (
            <div className={`text-center py-10 text-sm ${tm.muted}`}>
              No employees yet.<br />Add one from the form.
            </div>
          ) : (
            employees.map(e => (
              <div
                key={e._id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${cardBorder}`}
                style={{
                  background: editing?._id === e._id ? (dark ? "#0a2e1f" : "#E1F5EE") : "transparent",
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ background: e.color }}
                >
                  {e.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium truncate ${tm.text}`}>{e.name}</div>
                  <div className={`text-xs ${tm.muted}`}>{e.designation} · {e.type}</div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleEdit(e)}
                    className={`px-2.5 py-1 rounded-lg border text-xs cursor-pointer transition-all hover:bg-green-900/30 hover:text-green-400 ${cardBorder} ${tm.subtext}`}
                    style={{ background: "transparent" }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(e._id)}
                    className={`px-2.5 py-1 rounded-lg border text-xs cursor-pointer transition-all hover:bg-red-900/30 hover:text-red-400 ${cardBorder} ${tm.muted}`}
                    style={{ background: "transparent" }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function DailyLogTab({ dark, tm, onDataChange, showToast }) {
  const [employees, setEmployees] = useState([]);
  const [empId, setEmpId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    worked: "", activity: "", focus: "", ssHours: "",
  });

  const isInitialMount = useRef(true);

  const loadEmployees = async () => {
    try {
      const data = await employeeAPI.getAll();
      setEmployees(data);
      if (data.length > 0 && !empId) setEmpId(data[0]._id);
    } catch (error) {
      showToast("Failed to load employees", false);
    }
  };

  const loadLogs = async () => {
    if (!empId) return;
    try {
      setLoading(true);
      const data = await timeLogAPI.getByEmployee(empId);
      setLogs(data);
    } catch (error) {
      showToast("Failed to load time logs", false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      loadEmployees();
    }
  }, []);

  useEffect(() => {
    if (empId) {
      loadLogs();
    }
  }, [empId]);

  const handleSave = async () => {
    if (!form.date) {
      showToast("Date is required.", false);
      return;
    }

    const workedMinutes = validateRequiredTime("Worked hours", form.worked, 0, parseHubstaffTime("16:00"), showToast);
    if (workedMinutes === null) return;

    const activityValue = validatePercent("Activity", form.activity, showToast);
    if (activityValue === null) return;

    const focusValue = validatePercent("Focus time", form.focus, showToast);
    if (focusValue === null) return;

    const ssHoursValue = validateOptionalTime("Screenshot hours", form.ssHours, parseHubstaffTime("16:00"), showToast);
    if (ssHoursValue === null) return;

    try {
      await timeLogAPI.save({
        empId,
        date: form.date,
        worked: cleanTimeInput(form.worked),
        activity: activityValue,
        focus: focusValue,
        ssHours: ssHoursValue,
      });
      showToast("Daily log saved!");
      await loadLogs();
      onDataChange?.();
      setForm(f => ({ ...f, worked: "", activity: "", focus: "", ssHours: "" }));
    } catch (error) {
      showToast("Failed to save daily log", false);
    }
  };

  const handleDelete = async date => {
    if (window.confirm("Delete this log entry?")) {
      try {
        await timeLogAPI.delete(empId, date);
        await loadLogs();
        onDataChange?.();
        showToast("Log entry deleted.");
      } catch (error) {
        showToast("Failed to delete log entry", false);
      }
    }
  };

  const emp = employees.find(e => e._id === empId);
  const inputCls = tm.input;
  const cardBorder = dark ? "border-[#2a2d3a]" : "border-gray-200";

  if (employees.length === 0) {
    return (
      <div className={`rounded-2xl border p-8 text-center ${tm.card}`}>
        <p className={`text-sm ${tm.subtext}`}>
          No employees found. Please add employees first in the Employee Profiles tab.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start text-white">
      <div className={`rounded-2xl border overflow-hidden ${tm.card}`}>
        <div className={`px-5 py-4 border-b ${tm.header}`}>
          <div className={`text-sm font-semibold ${tm.text}`}>Log Daily Hours</div>
          <div className={`text-xs mt-0.5 ${tm.muted}`}>Enter Hubstaff data for a specific date</div>
        </div>
        <div className="p-5 flex flex-col gap-3.5">
          <div>
            <Label>Select Employee *</Label>
            <Select
              className={inputCls}
              value={empId || ""}
              onChange={e => setEmpId(e.target.value)}
            >
              {employees.map(e => (
                <option key={e._id} value={e._id}>{e.name} - {e.designation}</option>
              ))}
            </Select>
          </div>
          {emp && (
            <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${tm.chip}`}>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                style={{ background: emp.color }}
              >
                {emp.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
              </div>
              <div>
                <div className="text-sm font-semibold">{emp.name}</div>
                <div className="text-xs opacity-80">
                  {emp.designation} · {emp.type} · Expected {formatStoredTime(emp.workHours ?? "8:00")}/day
                </div>
              </div>
            </div>
          )}
          {emp && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Date *</Label>
                  <Input
                    className={`${inputCls} ${dark ? "date-input-dark" : ""}`}
                    type="date"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Worked hours *</Label>
                  <Input
                    className={inputCls}
                    type="text"
                    inputMode="text"
                    pattern="^\\d{1,2}:[0-5]\\d$"
                    maxLength="5"
                    placeholder="e.g. 8:21"
                    suffix="hrs"
                    value={form.worked}
                    onChange={e => setForm(f => ({ ...f, worked: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Activity % (Hubstaff)</Label>
                  <Input
                    className={inputCls}
                    type="number"
                    min="0"
                    max="100"
                    placeholder="e.g. 78"
                    suffix="%"
                    value={form.activity}
                    onChange={e => setForm(f => ({ ...f, activity: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Focus time</Label>
                  <Input
                    className={inputCls}
                    type="number"
                    min="0"
                    max="100"
                    placeholder="e.g. 78"
                    suffix="%"
                    value={form.focus}
                    onChange={e => setForm(f => ({ ...f, focus: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label>Screenshot hours</Label>
                <Input
                  className={inputCls}
                  type="text"
                  inputMode="text"
                  pattern="^\\d{1,2}:[0-5]\\d$"
                  maxLength="5"
                  placeholder="e.g. 6:54"
                  suffix="hrs"
                  value={form.ssHours}
                  onChange={e => setForm(f => ({ ...f, ssHours: e.target.value }))}
                />
              </div>
              <div className={`rounded-xl border px-3 py-2.5 text-xs ${tm.warn}`}>
                ⚠️ If a log already exists for this date, it will be <b>overwritten</b>.
              </div>
              <button
                onClick={handleSave}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white cursor-pointer transition-all duration-200 hover:opacity-90 active:scale-[0.99] mt-1"
                style={{ background: "#1D9E75" }}
              >
                ✚ Save Daily Log
              </button>
            </>
          )}
        </div>
      </div>

      <div className={`rounded-2xl border overflow-hidden ${tm.card}`}>
        <div className={`px-5 py-3.5 border-b flex justify-between items-center ${tm.header}`}>
          <div className={`text-sm font-semibold ${tm.text}`}>Log History</div>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${tm.subtext} ${cardBorder}`}
            style={{ background: "transparent" }}
          >
            {logs.length} entries
          </span>
        </div>
        <div className="p-3 flex flex-col gap-2 max-h-[480px] overflow-y-auto">
          {loading ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500 mx-auto"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className={`text-center py-10 text-sm ${tm.muted}`}>
              No logs for this employee yet.
            </div>
          ) : (
            logs.map(l => {
              const d = new Date(l.date + "T00:00:00");
              const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
              const expH = parseHubstaffTime(emp?.workHours ?? "8:00");
              const minH = parseHubstaffTime(emp?.minHours ?? "7:00");
              const workedH = parseHubstaffTime(l.worked);
              const focusPct = Number(l.focus || 0);
              const ssH = parseHubstaffTime(l.ssHours);
              const miss = Math.max(0, minH - workedH);
              const pct = expH > 0 ? Math.round((workedH / expH) * 100) : 0;

              return (
                <div
                  key={l.date}
                  className={`p-3 rounded-xl border ${cardBorder}`}
                  style={{ background: dark ? "#14171f" : "#f9fafb" }}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${tm.text}`}>{l.date}</span>
                      <span className={`text-xs ${tm.muted}`}>{dayName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs font-semibold"
                        style={{
                          color: miss === 0 ? (dark ? "#4ADE80" : "#0F6E56") : (dark ? "#F87171" : "#A32D2D"),
                        }}
                      >
                        {miss === 0 ? "✓ Met" : `-${formatMinutes(miss)}`}
                      </span>
                      <button
                        onClick={() => handleDelete(l.date)}
                        className={`w-6 h-6 rounded-lg border flex items-center justify-center text-xs cursor-pointer transition-all hover:bg-red-900/30 hover:text-red-400 ${cardBorder} ${tm.muted}`}
                        style={{ background: "transparent" }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      ["Worked", formatMinutes(workedH)],
                      ["Activity", `${l.activity}%`],
                      ["Focus", `${focusPct}%`],
                      ["SS Hours", formatMinutes(ssH)],
                    ].map(([k, v]) => (
                      <div
                        key={k}
                        className="text-center py-1.5 rounded-lg"
                        style={{ background: dark ? "#0f1117" : "#f3f4f6" }}
                      >
                        <div className={`text-xs mb-0.5 ${tm.muted}`} style={{ fontSize: 9 }}>
                          {k}
                        </div>
                        <div className={`text-xs font-semibold ${tm.text}`}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default function DataEntryForm({ dark = true, onDataChange }) {
  const [tab, setTab] = useState("employee");
  const tm = dark ? TH.dark : TH.light;
  const { toast, show } = useToast();

  return (
    <div className={`min-h-screen p-4 md:p-6 ${tm.bg}`}>
      <style>{`
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(8px) }
          to { opacity:1; transform:translateY(0) }
        }

        .date-input-dark::-webkit-calendar-picker-indicator {
          filter: invert(1);
          opacity: 0.85;
          cursor: pointer;
        }
      `}</style>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: "#0F6E56" }}
          >
            📋
          </div>
          <div>
            <div className={`text-base font-bold ${tm.text}`}>Bisviews Data Entry</div>
            <div className={`text-xs ${tm.subtext}`}>Manage employees & daily time logs</div>
          </div>
        </div>
        <div className={`flex gap-1 p-1.5 rounded-2xl border mb-6 ${tm.card}`}>
          {[
            { key: "employee", label: "👤 Employee Profiles" },
            { key: "daily", label: "📅 Daily Time Log" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200 border-none"
              style={{
                background: tab === key ? "#1D9E75" : "transparent",
                color: tab === key ? "#fff" : (dark ? "#8b8fa8" : "#6b7280"),
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === "employee" ? (
          <EmployeeTab dark={dark} tm={tm} onDataChange={onDataChange} showToast={show} />
        ) : (
          <DailyLogTab dark={dark} tm={tm} onDataChange={onDataChange} showToast={show} />
        )}
      </div>
      <Toast toast={toast} />
    </div>
  );
}