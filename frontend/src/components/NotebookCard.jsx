import { Link, useNavigate } from "react-router-dom";
import { useContext, useState, useMemo, useRef, useEffect } from "react";
import { NotebookContext } from "../context/NotebookContext";
import { MdMoreVert, MdEdit, MdDelete } from "react-icons/md";
import { Modal } from "react-bootstrap";

export default function NotebookCard({ notebook }) {
  const navigate = useNavigate();
  const { removeNotebook, updateNotebookDetails, getNotebook, loading, currentNotebook } = useContext(NotebookContext);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [newName, setNewName] = useState(notebook.name);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
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
    await removeNotebook(notebook.id);
    setShowDeleteModal(false);
  };

  const handleUpdate = async (e) => {
    e.stopPropagation();
    if (newName.trim() && newName !== notebook.name) {
      await updateNotebookDetails(notebook.id, { name: newName });
    }
    setShowEditModal(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return new Date().toLocaleDateString();
    return new Date(dateString).toLocaleDateString();
  };

  const handleCardClick = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await getNotebook(notebook.id);
      navigate(`/notebook/${notebook.id}`);
    } finally {
      setIsLoading(false);
    }
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
    <div className="col-lg-4 col-md-6 col-sm-12 mb-4">
      <div
        className="card p-2 h-100"
        style={{
          background: gradientStyle,
          minHeight: "200px",
          maxHeight: "200px",
          position: "relative",
          border: "none",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)",
          transition: "transform 0.2s, box-shadow 0.2s",
          display: "flex",
          flexDirection: "column"
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 8px 12px rgba(0, 0, 0, 0.15), 0 3px 6px rgba(0, 0, 0, 0.1)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)";
        }}
      >
        {/* Top section with dropdown menu */}
        <div className="d-flex justify-content-end">
          <div className="position-relative" ref={dropdownRef}>
            <button
              className="btn btn-sm text-muted"
              onClick={(e) => {
                e.stopPropagation();
                setShowDropdown(!showDropdown);
              }}
              style={{ padding: "0.25rem 0.5rem" }}
            >
              <MdMoreVert className="react-icons" />
            </button>
            
            {showDropdown && (
              <div 
                className="dropdown-menu show"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  zIndex: 1000,
                  minWidth: '160px',
                  padding: '0.5rem 0',
                  margin: 0,
                  backgroundColor: 'white',
                  border: '1px solid rgba(0,0,0,.1)',
                  borderRadius: '0.375rem',
                  boxShadow: '0 0.5rem 1rem rgba(0,0,0,.15)'
                }}
              >
                <button
                  className="dropdown-item d-flex align-items-center gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDropdown(false);
                    setShowEditModal(true);
                  }}
                >
                  <MdEdit className="react-icons" />
                  Edit
                </button>
                <div className="dropdown-divider" style={{ margin: '0.5rem 0' }}></div>
                <button
                  className="dropdown-item d-flex align-items-center gap-2 text-danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDropdown(false);
                    setShowDeleteModal(true);
                  }}
                >
                  <MdDelete className="react-icons" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        <div
          className="text-decoration-none flex-grow-1"
          style={{
            display: "flex",
            flexDirection: "column",
            cursor: "pointer",
            transition: "transform 0.2s",
            padding: "0.5rem",
            borderRadius: "0.25rem"
          }}
          onClick={handleCardClick}
        >
          {/* Middle section with title */}
          <div className="d-flex align-items-center justify-content-center flex-grow-1">
            <h4 className="mb-0 text-truncate text-center" style={{ maxWidth: "100%" }}>{notebook.name}</h4>
          </div>

          {/* Bottom section - clickable */}
          <div className="d-flex justify-content-between align-items-center text-muted small mt-auto" style={{ padding: "0.25rem 0" }}>
            <span>Created: {formatDate(notebook.createdAt)}</span>
            <span>Sources: {notebook.sourceCount || 0}</span>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Notebook</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <input
            type="text"
            className="form-control"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Enter notebook name"
          />
        </Modal.Body>
        <Modal.Footer>
          <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleUpdate}>
            Save Changes
          </button>
        </Modal.Footer>
      </Modal>

      {/* Delete Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Delete Notebook</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete this notebook? This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={handleDelete}>
            Delete
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}