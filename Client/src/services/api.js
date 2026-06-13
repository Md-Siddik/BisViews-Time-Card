// src/services/api.js
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Employee API
export const employeeAPI = {
  getAll: async () => {
    const response = await api.get("/api/employees");
    return response.data;
  },
  
  create: async (employeeData) => {
    const response = await api.post("/api/employees", employeeData);
    return response.data;
  },
  
  update: async (id, employeeData) => {
    const response = await api.put(`/api/employees/${id}`, employeeData);
    return response.data;
  },
  
  delete: async (id) => {
    const response = await api.delete(`/api/employees/${id}`);
    return response.data;
  },
};

// Time Log API
export const timeLogAPI = {
  getByEmployee: async (empId, year, month) => {
    const response = await api.get(`/api/timelogs/${empId}`, {
      params: { year, month }
    });
    return response.data;
  },
  
  save: async (logData) => {
    const response = await api.post("/api/timelogs", logData);
    return response.data;
  },
  
  delete: async (empId, date) => {
    const response = await api.delete(`/api/timelogs/${empId}/${date}`);
    return response.data;
  },
};

export default api;