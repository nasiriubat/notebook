import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { NotebookContext } from "../context/NotebookContext";
import { MdAdd, MdGridOn, MdList, MdDelete, MdEdit, MdMoreVert, MdOpenInNew, MdSource } from "react-icons/md";
import Navbar from "../components/Navbar";
import NotebookCard from "../components/NotebookCard";
import "../styles/home.css";
import { getTranslation } from "../utils/ln";

export default function Home() {
  const navigate = useNavigate();
  const { notebooks, addNotebook, removeNotebook, updateNotebookDetails } = useContext(NotebookContext);
  const [viewMode, setViewMode] = useState("grid");
  const [isCreating, setIsCreating] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState("");
  const [activeMenu, setActiveMenu] = useState(null);
  const [editingNotebook, setEditingNotebook] = useState(null);
  const [editName, setEditName] = useState("");

  const handleCreateNotebook = async () => {
    if (!newNotebookName.trim()) return;
    
    try {
      await addNotebook(newNotebookName);
      setNewNotebookName("");
      setIsCreating(false);
    } catch (error) {
      console.error("Error creating notebook:", error);
    }
  };

  const handleDeleteNotebook = async (id) => {
    if (window.confirm("Are you sure you want to delete this notebook?")) {
      try {
        await removeNotebook(id);
      } catch (error) {
        console.error("Error deleting notebook:", error);
      }
    }
  };

  const handleEditNotebook = (notebook) => {
    setEditingNotebook(notebook.id);
    setEditName(notebook.name);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) return;
    
    try {
      await updateNotebookDetails(editingNotebook, { name: editName });
      setEditingNotebook(null);
      setEditName("");
    } catch (error) {
      console.error("Error updating notebook:", error);
    }
  };

  const handleCancelEdit = () => {
    setEditingNotebook(null);
    setEditName("");
  };

  const formatDate = (dateString) => {
    if (!dateString) return new Date().toLocaleDateString();
    return new Date(dateString).toLocaleDateString();
  };

  const handleCardClick = (notebookId, event) => {
    // Don't navigate if clicking on the menu, its items, or edit form
    if (event.target.closest('.notebook-menu') || 
        event.target.closest('.notebook-actions') || 
        event.target.closest('.edit-form')) {
      return;
    }
    navigate(`/notebook/${notebookId}`);
  };

  const toggleMenu = (notebookId, event) => {
    event.stopPropagation(); // Prevent card click
    setActiveMenu(activeMenu === notebookId ? null : notebookId);
  };

  // Close menu when clicking outside
  const handleClickOutside = (event) => {
    if (!event.target.closest('.notebook-menu')) {
      setActiveMenu(null);
    }
  };

  return (
    <div className="min-vh-100" onClick={handleClickOutside}>
      <Navbar />
      <div className="container py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1 className="h2 mb-0">{getTranslation("myNotebooks")}</h1>
          <div className="d-flex gap-2">
            <button
              className="btn btn-outline"
              onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              title={`Switch to ${viewMode === "grid" ? "list" : "grid"} view`}
            >
              {viewMode === "grid" ? <MdList size={24} /> : <MdGridOn size={24} />}
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setIsCreating(true)}
            >
              <MdAdd size={24} className="me-2" />
              {getTranslation("createNotebook")}
            </button>
          </div>
        </div>

        {isCreating && (
          <div className="create-notebook-form">
            <div className="input-group">
              <input
                type="text"
                className="form-control"
                placeholder={getTranslation("createNotebookPlaceholder")}
                value={newNotebookName}
                onChange={(e) => setNewNotebookName(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleCreateNotebook()}
              />
              <button
                className="btn btn-primary"
                onClick={handleCreateNotebook}
              >
                {getTranslation("create")}
              </button>
              <button
                className="btn btn-outline"
                onClick={() => {
                  setIsCreating(false);
                  setNewNotebookName("");
                }}
              >
                {getTranslation("cancel")}
              </button>
            </div>
          </div>
        )}

        {notebooks.length === 0 ? (
          <div className="empty-state">
            <h3 className="text-muted mb-3">{getTranslation("noNotebookYet")}</h3>
            <p className="text-muted mb-4">{getTranslation("createYourFirstNotebook")}</p>
            <button
              className="btn btn-primary"
              onClick={() => setIsCreating(true)  }
            >
              <MdAdd size={24} className="me-2" />
              {getTranslation("createNotebook")}
            </button>
          </div>
        ) : (
          <div className={`notebook-${viewMode}`}>
            {notebooks.map((notebook) => (
              <NotebookCard
                key={notebook.id}
                notebook={notebook}
                viewMode={viewMode}
                onDelete={handleDeleteNotebook}
                onUpdate={updateNotebookDetails}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
