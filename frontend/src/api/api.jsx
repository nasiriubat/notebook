import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:5000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach Authorization Token for Requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('Request config:', {
      url: config.url,
      method: config.method,
      headers: config.headers,
      data: config.data
    });
    return config;
  },
  (error) => Promise.reject(error)
);

// Authentication Endpoints
export const registerUser = (data) => api.post("/register", data);
export const loginUser = (data) => api.post("/login", data);
export const changePassword = (data) => api.post("/reset-password", data);
export const refreshToken = (data) => api.post("/generate-new-token", data);

// Protected Routes (Notebook, Sources, Notes)
export const getNotebooks = () => api.get("/notebooks");
export const createNotebook = (data) => api.post("/notebooks", data);
export const deleteNotebook = (id) => api.delete(`/notebooks/${id}`);
export const getNotebookById = (id) => api.get(`/notebooks/${id}`);
export const updateNotebook = (id, data) => api.put(`/notebooks/${id}`, data);

// Source endpoints
export const getSources = (notebookId) => api.get(`/sources/${notebookId}`);
export const createSource = (data) => api.post("/sources", data);
export const uploadSource = (data) => api.post("/sources", data);
export const deleteSource = (id) => api.delete(`/sources/${id}`);
export const getSource = (id) => api.get(`/single-source/${id}`);
export const updateSource = (id, data) => api.put(`/sources/${id}`, data);

// Note endpoints (legacy, will be removed)
export const getNotes = () => api.get("/note");
export const createNote = (data) => api.post("/note", data);
export const deleteNote = (id) => api.delete(`/note/${id}`);
export const getNoteById = (id) => api.get(`/note/${id}`);
export const updateNote = (id, data) => api.put(`/note/${id}`, data);

// Chat endpoints
export const sendChatMessage = (data) => api.post("/chat", data);
export const getChatMessages = () => api.get("/chat");