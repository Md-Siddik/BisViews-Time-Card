// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 5001;

const TIME_RE = /^(\d{1,2}):([0-5]\d)$/;
const HOUR = 60;

function formatMinutes(minutes) {
  const total = Math.round(Number(minutes) || 0);
  const sign = total < 0 ? "-" : "";
  const abs = Math.abs(total);
  const hours = Math.floor(abs / HOUR);
  const mins = abs % HOUR;

  return `${sign}${hours}:${String(mins).padStart(2, "0")}`;
}

function parseTimeToMinutes(value) {
  if (value === null || value === undefined || value === "") return 0;

  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value * HOUR);
  }

  const text = String(value).trim();

  const timeMatch = text.match(/^(-)?(\d+):([0-5]\d)$/);
  if (timeMatch) {
    const sign = timeMatch[1] ? -1 : 1;
    const hours = Number(timeMatch[2]);
    const minutes = Number(timeMatch[3]);

    return sign * ((hours * HOUR) + minutes);
  }

  const decimal = Number(text);
  if (Number.isFinite(decimal)) {
    return Math.round(decimal * HOUR);
  }

  return 0;
}

function normalizeExistingTime(value, fallback = "0:00") {
  if (value === null || value === undefined || value === "") return fallback;

  if (typeof value === "number" && Number.isFinite(value)) {
    return formatMinutes(value * HOUR);
  }

  const text = String(value).trim();

  if (/^\d{1,2}:[0-5]\d$/.test(text)) {
    return formatMinutes(parseTimeToMinutes(text));
  }

  if (/^\d+(\.\d+)?$/.test(text)) {
    return formatMinutes(Number(text) * HOUR);
  }

  return fallback;
}

function normalizeExistingPercent(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;

  const clean = String(value).replace("%", "").trim();
  const num = Number(clean);

  if (!Number.isFinite(num) || num < 0 || num > 100) {
    return fallback;
  }

  return num;
}

function validateHubstaffTime(fieldName, value, options = {}) {
  const {
    required = true,
    fallback = "0:00",
    minMinutes = 0,
    maxMinutes = 16 * HOUR,
  } = options;

  if (value === undefined || value === null || value === "") {
    if (required) {
      return {
        ok: false,
        message: `${fieldName} is required and must be in 8:21 format`,
      };
    }

    return {
      ok: true,
      value: fallback,
      minutes: parseTimeToMinutes(fallback),
    };
  }

  if (typeof value !== "string") {
    return {
      ok: false,
      message: `${fieldName} must be a string in 8:21 format`,
    };
  }

  const clean = value.trim();

  if (!TIME_RE.test(clean)) {
    return {
      ok: false,
      message: `${fieldName} must be in 8:21 format`,
    };
  }

  const minutes = parseTimeToMinutes(clean);

  if (minutes < minMinutes || minutes > maxMinutes) {
    return {
      ok: false,
      message: `${fieldName} must be between ${formatMinutes(minMinutes)} and ${formatMinutes(maxMinutes)}`,
    };
  }

  return {
    ok: true,
    value: formatMinutes(minutes),
    minutes,
  };
}

function validatePercent(fieldName, value) {
  const clean = String(value ?? "").replace("%", "").trim();
  const percent = clean === "" ? 0 : Number(clean);

  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    return {
      ok: false,
      message: `${fieldName} must be between 0 and 100`,
    };
  }

  return {
    ok: true,
    value: percent,
  };
}

function isValidObjectId(id) {
  return ObjectId.isValid(id);
}

app.use(cors({
  origin: ["bisviews.exploretechify.com","https://bis-views-time-card-f84t.vercel.app"],
  credentials: true,
}));

app.use(express.json());

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mmuv9dp.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let employeesCollection;
let timeLogsCollection;

async function migrateExistingTimeFields() {
  const employees = await employeesCollection.find({}).toArray();

  for (const emp of employees) {
    const updates = {};

    const normalizedWorkHours = normalizeExistingTime(emp.workHours, "8:00");
    const normalizedMinHours = normalizeExistingTime(emp.minHours, "7:00");

    if (emp.workHours !== normalizedWorkHours) updates.workHours = normalizedWorkHours;
    if (emp.minHours !== normalizedMinHours) updates.minHours = normalizedMinHours;

    if (Object.keys(updates).length > 0) {
      await employeesCollection.updateOne(
        { _id: emp._id },
        { $set: updates }
      );
    }
  }

  const logs = await timeLogsCollection.find({}).toArray();

  for (const log of logs) {
    const updates = {};

    const normalizedWorked = normalizeExistingTime(log.worked, "0:00");
    const normalizedSSHours = normalizeExistingTime(log.ssHours, "0:00");
    const normalizedActivity = normalizeExistingPercent(log.activity, 0);
    const normalizedFocus = normalizeExistingPercent(log.focus, 0);

    if (log.worked !== normalizedWorked) updates.worked = normalizedWorked;
    if (log.ssHours !== normalizedSSHours) updates.ssHours = normalizedSSHours;
    if (log.activity !== normalizedActivity) updates.activity = normalizedActivity;
    if (log.focus !== normalizedFocus) updates.focus = normalizedFocus;

    if (Object.keys(updates).length > 0) {
      await timeLogsCollection.updateOne(
        { _id: log._id },
        { $set: updates }
      );
    }
  }

  console.log("⏱ Existing fields normalized");
}

async function startServer() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB!");

    const db = client.db("BisViews");
    employeesCollection = db.collection("employees");
    timeLogsCollection = db.collection("timeLogs");

    await employeesCollection.createIndex({ name: 1 });
    await timeLogsCollection.createIndex({ empId: 1, date: 1 });

    await migrateExistingTimeFields();

    console.log("📁 Collections ready: employees, timeLogs");

    app.get("/api/employees", async (req, res) => {
      try {
        const employees = await employeesCollection.find({}).toArray();
        res.json(employees);
      } catch (error) {
        console.error("Error fetching employees:", error);
        res.status(500).json({ error: "Failed to fetch employees" });
      }
    });

    app.get("/api/employees/:id", async (req, res) => {
      try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
          return res.status(400).json({ error: "Invalid employee ID" });
        }

        const employee = await employeesCollection.findOne({ _id: new ObjectId(id) });

        if (!employee) {
          return res.status(404).json({ error: "Employee not found" });
        }

        res.json(employee);
      } catch (error) {
        console.error("Error fetching employee:", error);
        res.status(500).json({ error: "Failed to fetch employee" });
      }
    });

    app.post("/api/employees", async (req, res) => {
      try {
        const { name, designation, country, type, workHours, minHours, color } = req.body;

        if (!name || !designation) {
          return res.status(400).json({ error: "Name and designation are required" });
        }

        const workHoursCheck = validateHubstaffTime("workHours", workHours || "8:00", {
          required: true,
          minMinutes: 1 * HOUR,
          maxMinutes: 12 * HOUR,
        });

        if (!workHoursCheck.ok) {
          return res.status(400).json({ error: workHoursCheck.message });
        }

        const minHoursCheck = validateHubstaffTime("minHours", minHours || "7:00", {
          required: true,
          minMinutes: 1 * HOUR,
          maxMinutes: 12 * HOUR,
        });

        if (!minHoursCheck.ok) {
          return res.status(400).json({ error: minHoursCheck.message });
        }

        if (minHoursCheck.minutes > workHoursCheck.minutes) {
          return res.status(400).json({ error: "minHours must be equal to or less than workHours" });
        }

        const newEmployee = {
          name,
          designation,
          country: country || "🇧🇩 Bangladesh",
          type: type || "Full-time",
          workHours: workHoursCheck.value,
          minHours: minHoursCheck.value,
          color: color || "#1D9E75",
          createdAt: new Date(),
        };

        const result = await employeesCollection.insertOne(newEmployee);

        res.json({ ...newEmployee, _id: result.insertedId });
      } catch (error) {
        console.error("Error adding employee:", error);
        res.status(500).json({ error: "Failed to add employee" });
      }
    });

    app.put("/api/employees/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const { name, designation, country, type, workHours, minHours, color } = req.body;

        if (!isValidObjectId(id)) {
          return res.status(400).json({ error: "Invalid employee ID" });
        }

        if (!name || !designation) {
          return res.status(400).json({ error: "Name and designation are required" });
        }

        const workHoursCheck = validateHubstaffTime("workHours", workHours, {
          required: true,
          minMinutes: 1 * HOUR,
          maxMinutes: 12 * HOUR,
        });

        if (!workHoursCheck.ok) {
          return res.status(400).json({ error: workHoursCheck.message });
        }

        const minHoursCheck = validateHubstaffTime("minHours", minHours, {
          required: true,
          minMinutes: 1 * HOUR,
          maxMinutes: 12 * HOUR,
        });

        if (!minHoursCheck.ok) {
          return res.status(400).json({ error: minHoursCheck.message });
        }

        if (minHoursCheck.minutes > workHoursCheck.minutes) {
          return res.status(400).json({ error: "minHours must be equal to or less than workHours" });
        }

        const result = await employeesCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              name,
              designation,
              country,
              type,
              workHours: workHoursCheck.value,
              minHours: minHoursCheck.value,
              color,
              updatedAt: new Date(),
            },
          }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ error: "Employee not found" });
        }

        const updatedEmployee = await employeesCollection.findOne({ _id: new ObjectId(id) });
        res.json(updatedEmployee);
      } catch (error) {
        console.error("Error updating employee:", error);
        res.status(500).json({ error: "Failed to update employee" });
      }
    });

    app.delete("/api/employees/:id", async (req, res) => {
      try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
          return res.status(400).json({ error: "Invalid employee ID" });
        }

        const employeeResult = await employeesCollection.deleteOne({ _id: new ObjectId(id) });

        await timeLogsCollection.deleteMany({ empId: id });

        if (employeeResult.deletedCount === 0) {
          return res.status(404).json({ error: "Employee not found" });
        }

        res.json({ message: "Employee deleted successfully" });
      } catch (error) {
        console.error("Error deleting employee:", error);
        res.status(500).json({ error: "Failed to delete employee" });
      }
    });

    app.get("/api/timelogs/:empId", async (req, res) => {
      try {
        const { empId } = req.params;
        const { year, month } = req.query;

        let query = { empId };

        if (year && month) {
          const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
          const endDate = `${year}-${String(month).padStart(2, "0")}-31`;
          query.date = { $gte: startDate, $lte: endDate };
        }

        const logs = await timeLogsCollection.find(query).sort({ date: -1 }).toArray();

        res.json(logs);
      } catch (error) {
        console.error("Error fetching time logs:", error);
        res.status(500).json({ error: "Failed to fetch time logs" });
      }
    });

    app.get("/api/timelogs/:empId/:date", async (req, res) => {
      try {
        const { empId, date } = req.params;
        const log = await timeLogsCollection.findOne({ empId, date });

        res.json(log || null);
      } catch (error) {
        console.error("Error fetching time log:", error);
        res.status(500).json({ error: "Failed to fetch time log" });
      }
    });

    app.post("/api/timelogs", async (req, res) => {
      try {
        const { empId, date, worked, activity, focus, ssHours } = req.body;

        if (!empId || !date || worked === undefined) {
          return res.status(400).json({ error: "Missing required fields: empId, date, worked" });
        }

        const workedCheck = validateHubstaffTime("worked", worked, {
          required: true,
          minMinutes: 0,
          maxMinutes: 16 * HOUR,
        });

        if (!workedCheck.ok) {
          return res.status(400).json({ error: workedCheck.message });
        }

        const activityCheck = validatePercent("activity", activity);

        if (!activityCheck.ok) {
          return res.status(400).json({ error: activityCheck.message });
        }

        const focusCheck = validatePercent("focus", focus);

        if (!focusCheck.ok) {
          return res.status(400).json({ error: focusCheck.message });
        }

        const ssHoursCheck = validateHubstaffTime("ssHours", ssHours, {
          required: false,
          fallback: "0:00",
          minMinutes: 0,
          maxMinutes: 16 * HOUR,
        });

        if (!ssHoursCheck.ok) {
          return res.status(400).json({ error: ssHoursCheck.message });
        }

        await timeLogsCollection.updateOne(
          { empId, date },
          {
            $set: {
              empId,
              date,
              worked: workedCheck.value,
              activity: activityCheck.value,
              focus: focusCheck.value,
              ssHours: ssHoursCheck.value,
              updatedAt: new Date(),
            },
          },
          { upsert: true }
        );

        const savedLog = await timeLogsCollection.findOne({ empId, date });

        res.json({ message: "Time log saved", log: savedLog });
      } catch (error) {
        console.error("Error saving time log:", error);
        res.status(500).json({ error: "Failed to save time log" });
      }
    });

    app.delete("/api/timelogs/:empId/:date", async (req, res) => {
      try {
        const { empId, date } = req.params;
        const result = await timeLogsCollection.deleteOne({ empId, date });

        if (result.deletedCount === 0) {
          return res.status(404).json({ error: "Time log not found" });
        }

        res.json({ message: "Time log deleted successfully" });
      } catch (error) {
        console.error("Error deleting time log:", error);
        res.status(500).json({ error: "Failed to delete time log" });
      }
    });

    app.get("/api/dashboard/:empId", async (req, res) => {
      try {
        const { empId } = req.params;
        const { year, month } = req.query;

        if (!isValidObjectId(empId)) {
          return res.status(400).json({ error: "Invalid employee ID" });
        }

        const employee = await employeesCollection.findOne({ _id: new ObjectId(empId) });

        if (!employee) {
          return res.status(404).json({ error: "Employee not found" });
        }

        let query = { empId };

        if (year && month) {
          const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
          const endDate = `${year}-${String(month).padStart(2, "0")}-31`;
          query.date = { $gte: startDate, $lte: endDate };
        }

        const logs = await timeLogsCollection.find(query).sort({ date: 1 }).toArray();

        res.json({
          employee,
          logs,
          summary: {
            totalLogs: logs.length,
            dateRange: year && month ? `${year}-${month}` : "all",
          },
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        res.status(500).json({ error: "Failed to fetch dashboard data" });
      }
    });

    app.get("/api/summary/all", async (req, res) => {
      try {
        const employees = await employeesCollection.find({}).toArray();
        const allLogs = await timeLogsCollection.find({}).toArray();

        const summary = employees.map(emp => {
          const empLogs = allLogs.filter(log => log.empId === emp._id.toString());
          const totalMinutes = empLogs.reduce((sum, log) => sum + parseTimeToMinutes(log.worked), 0);

          return {
            id: emp._id,
            name: emp.name,
            totalLogs: empLogs.length,
            totalHours: formatMinutes(totalMinutes),
            totalMinutes,
          };
        });

        res.json({
          totalEmployees: employees.length,
          totalTimeEntries: allLogs.length,
          employeeSummary: summary,
        });
      } catch (error) {
        console.error("Error fetching summary:", error);
        res.status(500).json({ error: "Failed to fetch summary" });
      }
    });

    app.get("/api/health", (req, res) => {
      res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        services: {
          mongodb: "connected",
          employees: employeesCollection ? "ready" : "not ready",
          timeLogs: timeLogsCollection ? "ready" : "not ready",
        },
      });
    });

    app.get("/", (req, res) => {
      res.json({
        message: "Bisviews Timecard API",
        version: "1.0.0",
        timeFormat: "Hubstaff H:MM format, for example 8:21",
        percentFormat: "Focus and activity are stored as numbers from 0 to 100",
        endpoints: {
          employees: "/api/employees",
          timeLogs: "/api/timelogs/:empId",
          dashboard: "/api/dashboard/:empId",
          health: "/api/health",
        },
      });
    });

    app.use((err, req, res, next) => {
      console.error("Error:", err);
      res.status(500).json({ error: "Internal server error" });
    });

    app.listen(port, () => {
      console.log(`\n🚀 Server running on http://localhost:${port}`);
      console.log("📡 API endpoints:");
      console.log("   GET  /api/employees");
      console.log("   POST /api/employees");
      console.log("   GET  /api/timelogs/:empId");
      console.log("   POST /api/timelogs");
      console.log("   GET  /api/dashboard/:empId");
      console.log("   GET  /api/health");
      console.log("\n✅ Ready to accept requests!\n");
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    console.error("Error details:", error.message);
    process.exit(1);
  }
}

process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down gracefully...");
  if (client) {
    await client.close();
    console.log("MongoDB connection closed");
  }
  process.exit(0);
});

startServer();
