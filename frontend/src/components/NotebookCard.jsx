import { Link, useNavigate } from "react-router-dom";
import { useContext, useState, useMemo, useRef, useEffect } from "react";
import { NotebookContext } from "../context/NotebookContext";
import { MdMoreVert, MdEdit, MdDelete, MdOpenInNew, MdSource } from "react-icons/md";
import { Modal } from "react-bootstrap";
import "../styles/notebook-card.css";

export default function NotebookCard({ notebook, onDelete, onUpdate, viewMode = "grid" }) {
  const navigate = useNavigate();
  const { getNotebook, loading, currentNotebook } = useContext(NotebookContext);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [newName, setNewName] = useState(notebook.name);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef(null);
  const [activeMenu, setActiveMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(notebook.name);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current && 
        !menuRef.current.contains(event.target) && 
        !buttonRef.current.contains(event.target)
      ) {
        setActiveMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Generate random gradient based on notebook ID to keep it consistent
  const gradientStyle = useMemo(() => {
    const gradients = [
      "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)", // Light gray
      "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)", // Light blue
      "linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)", // Light purple
      "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)", // Light green
      "linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)", // Light orange
      "linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%)", // Light pink
      "linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%)", // Light teal
      "linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)", // Light neutral
    ];
    
    // Convert ID to string and get a numeric value
    const idString = String(notebook.id);
    const numericValue = idString.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const index = numericValue % gradients.length;
    return gradients[index];
  }, [notebook.id]);

  const handleDelete = async (e) => {
    e.stopPropagation();
    await onDelete(notebook.id);
    setShowDeleteModal(false);
  };

  const handleUpdate = async (e) => {
    e.stopPropagation();
    if (newName.trim() && newName !== notebook.name) {
      await onUpdate(notebook.id, { name: newName });
    }
    setShowEditModal(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const handleCardClick = (e) => {
    if (e.target.closest('.notebook-menu') || 
        e.target.closest('.notebook-actions') || 
        e.target.closest('.edit-form')) {
      return;
    }
    setIsLoading(true);
    try {
      navigate(`/notebook/${notebook.id}`);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMenu = (e) => {
    e.stopPropagation();
    setActiveMenu(!activeMenu);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setActiveMenu(false);
  };

  const handleSave = async () => {
    if (!editName.trim()) return;
    try {
      await onUpdate(notebook.id, { name: editName });
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating notebook:", error);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditName(notebook.name);
  };

  if (isLoading) {
    return (
      <div className="col-lg-4 col-md-6 col-sm-12 mb-4">
        <div className="card p-2 h-100">
          <div className="d-flex justify-content-center align-items-center" style={{ height: "200px" }}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`notebook-card ${viewMode}`}
      onClick={handleCardClick}
    >
      <div className="notebook-header">
        {isEditing ? (
          <div className="edit-form">
            <input
              type="text"
              className="form-control"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSave()}
              autoFocus
            />
            <div className="edit-actions">
              <button
                className="btn btn-sm btn-primary"
                onClick={handleSave}
              >
                Save
              </button>
              <button
                className="btn btn-sm btn-outline"
                onClick={handleCancel}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <h3 className="notebook-title">{notebook.name}</h3>
        )}
        <div className="notebook-actions">
          <button
            ref={buttonRef}
            className="btn btn-link"
            onClick={toggleMenu}
            title="More options"
          >
            <MdMoreVert size={20} />
          </button>
          {activeMenu && (
            <div className="notebook-menu" ref={menuRef}>
              <button
                className="menu-item"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/notebook/${notebook.id}`);
                }}
              >
                <MdOpenInNew size={18} className="me-2" />
                Open
              </button>
              <button
                className="menu-item"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit();
                }}
              >
                <MdEdit size={18} className="me-2" />
                Edit
              </button>
              <button
                className="menu-item text-danger"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(notebook.id);
                }}
              >
                <MdDelete size={18} className="me-2" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="notebook-footer">
        <span className="notebook-date">
          Created {formatDate(notebook.createdAt)}
        </span>
        <span className="notebook-sources">
          <MdSource size={16} className="me-1" />
          {notebook.sources?.length || 0} sources
        </span>
      </div>
    </div>
  );
}