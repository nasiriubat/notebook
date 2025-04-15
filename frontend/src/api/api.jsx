import axios from "axios";

// Get API URL from environment variables with fallback
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

if (!import.meta.env.VITE_API_URL) {
  console.warn("VITE_API_URL is not set in environment variables. Using default URL:", API_BASE_URL);
}

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

// Add response interceptor to handle authentication errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token but preserve the original error response
      localStorage.removeItem("token");
    }
    return Promise.reject(error);
  }
);

// Authentication Endpoints
export const registerUser = (data) => api.post("/register", data);
export const loginUser = (data) => api.post("/login", data);
export const changePassword = (data) => api.post("/change-password", data);
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
export const uploadSource = (data) => {
  // If data contains a file, use FormData
  if (data.file) {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('notebook_id', data.notebook_id);
    if (data.title) formData.append('title', data.title);
    if (data.description) formData.append('description', data.description);
    
    // Create a new axios instance for this request with the correct content type
    const fileApi = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${localStorage.getItem("token")}`
      }
    });

    // Add the same response interceptor to handle authentication errors
    fileApi.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem("token");
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }
    );
    
    return fileApi.post("/sources", formData);
  }
  
  // For text input, create FormData
  if (data.text) {
    const formData = new FormData();
    formData.append('text', data.text);
    formData.append('notebook_id', data.notebook_id);
    formData.append('type', data.type || 'text');
    formData.append('is_note', data.is_note ? '1' : '0');
    
    // Create a new axios instance for this request with the correct content type
    const textApi = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${localStorage.getItem("token")}`
      }
    });

    // Add the same response interceptor to handle authentication errors
    textApi.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem("token");
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }
    );
    
    return textApi.post("/sources", formData);
  }
  
  // For non-file uploads, use the regular api instance
  return api.post("/sources", data);
};
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
export const getChatMessages = (notebookId) => api.get(`/chat/${notebookId}`);
export const deleteChatMessages = (notebookId) => api.delete(`/chat/${notebookId}`);