import { createContext, useState, useEffect } from "react";
import { getNotebooks, createNotebook, deleteNotebook, getNotebookById, updateNotebook } from "../api/api";
import { useAuth } from "./AuthContext";

export const NotebookContext = createContext();

export const NotebookProvider = ({ children }) => {
  const { user } = useAuth();
  const [notebooks, setNotebooks] = useState([]);
  const [currentNotebook, setCurrentNotebook] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      fetchNotebooks();
    }
  }, [user]);

  const fetchNotebooks = async () => {
    try {
      setLoading(true);
      const response = await getNotebooks();
      setNotebooks(response.data.reverse());
      setError(null);
    } catch (err) {
      console.error("Error fetching notebooks:", err);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const addNotebook = async (name) => {
    try {
      setLoading(true);
      setError(null);
      const data = { name: name.trim() };
      console.log('Creating notebook with data:', data);
      const response = await createNotebook(data);
      console.log('Notebook creation response:', response);
      await fetchNotebooks();
    } catch (err) {
      console.error("Error creating notebook:", err);
      console.error("Error response:", err.response);
      setError(err.response?.data?.message || err.message || "Failed to create notebook");
    } finally {
      setLoading(false);
    }
  };

  const removeNotebook = async (id) => {
    try {
      setLoading(true);
      await deleteNotebook(id);
      await fetchNotebooks();
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || null);
      console.error("Error deleting notebook:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateNotebookDetails = async (id, data) => {
    try {
      setLoading(true);
      await updateNotebook(id, data);
      await fetchNotebooks();
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || null);
      console.error("Error updating notebook:", err);
    } finally {
      setLoading(false);
    }
  };

  const getNotebook = async (id) => {
    try {
      setLoading(true);
      setError(null);
      const response = await getNotebookById(id);
      setCurrentNotebook(response.data);
    } catch (err) {
      console.error("Error fetching notebook:", err);
      setError(err.response?.data?.message || "Failed to fetch notebook");
      setCurrentNotebook(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <NotebookContext.Provider
      value={{
        notebooks,
        currentNotebook,
        loading,
        error,
        addNotebook,
        removeNotebook,
        updateNotebookDetails,
        getNotebook,
        refreshNotebooks: fetchNotebooks
      }}
    >
      {children}
    </NotebookContext.Provider>
  );
};
