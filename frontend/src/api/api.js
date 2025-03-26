import axios from "axios";

const API_URL = "http://127.0.0.1:5000";

// Add authorization header to all requests
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Source endpoints
export const getSources = async (notebookId) => {
  try {
    const response = await axios.get(`${API_URL}/sources/${notebookId}`);
    return response;
  } catch (error) {
    throw error;
  }
};

export const uploadSource = async (data) => {
  try {
    const response = await axios.post(`${API_URL}/sources`, data);
    return response;
  } catch (error) {
    throw error;
  }
};

export const deleteSource = async (sourceId) => {
  try {
    const response = await axios.delete(`${API_URL}/sources/${sourceId}`);
    return response;
  } catch (error) {
    throw error;
  }
};

export const updateSource = async (sourceId, data) => {
  try {
    const response = await axios.put(`${API_URL}/sources/${sourceId}`, data);
    return response;
  } catch (error) {
    throw error;
  }
}; 