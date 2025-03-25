import { createContext, useState, useEffect } from "react";
import { getNotebooks, createNotebook, deleteNotebook, getNotebookById, updateNotebook } from "../api/api";

export const NotebookContext = createContext();

export const NotebookProvider = ({ children }) => {
  const [notebooks, setNotebooks] = useState([]);
  const [currentNotebook, setCurrentNotebook] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchNotebooks();
  }, []);

  const fetchNotebooks = async () => {
    try {
      setLoading(true);
      const response = await getNotebooks();
      setNotebooks(response.data.reverse());
      setError(null);
    } catch (err) {
      setError("Failed to fetch notebooks");
      console.error("Error fetching notebooks:", err);
    } finally {
      setLoading(false);
    }
  };

  const addNotebook = async (name) => {
    try {
      setLoading(true);
      await createNotebook({ name });
      await fetchNotebooks();
      setError(null);
    } catch (err) {
      setError("Failed to create notebook");
      console.error("Error creating notebook:", err);
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
      setError("Failed to delete notebook");
      console.error("Error deleting notebook:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotebookById = async (id) => {
    try {
      setLoading(true);
      const response = await getNotebookById(id);
      setCurrentNotebook(response.data);
      setError(null);
    } catch (err) {
      setError("Failed to fetch notebook details");
      console.error("Error fetching notebook:", err);
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
      setError("Failed to update notebook");
      console.error("Error updating notebook:", err);
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
        fetchNotebookById,
        updateNotebookDetails,
        fetchNotebooks
      }}
    >
      {children}
    </NotebookContext.Provider>
  );
};
