import { useState, useEffect } from "react";
import { getSources, uploadSource, deleteSource } from "../api/api";

export default function SourceComponent({ notebookId }) {
  const [sources, setSources] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchSources();
  }, [notebookId]);

  const fetchSources = async () => {
    try {
      setLoading(true);
      const response = await getSources(notebookId);
      setSources(response.data.reverse());
      setError(null);
    } catch (err) {
      setError("Failed to fetch sources");
      console.error("Error fetching sources:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;

    await handleFileUpload(file);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    await handleFileUpload(file);
  };

  const handleFileUpload = async (file) => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("notebookId", notebookId);
      await uploadSource(formData);
      await fetchSources();
      setError(null);
    } catch (err) {
      setError("Failed to upload file");
      console.error("Error uploading file:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteSource = async (id) => {
    try {
      setLoading(true);
      await deleteSource(id);
      await fetchSources();
      setError(null);
    } catch (err) {
      setError("Failed to delete source");
      console.error("Error deleting source:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && sources.length === 0) {
    return (
      <div className="card p-3">
        <h5>Sources</h5>
        <div className="d-flex justify-content-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-3">
      <h5>Sources</h5>
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      <div
        className={`upload-area p-3 text-center mb-3 ${
          dragging ? "border border-primary" : "border border-dashed"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-upload"
          className="d-none"
          onChange={handleFileSelect}
          disabled={uploading}
        />
        <label htmlFor="file-upload" className="mb-0" style={{ cursor: "pointer" }}>
          {uploading ? (
            <div className="spinner-border spinner-border-sm text-primary me-2" role="status" aria-hidden="true"></div>
          ) : (
            <i className="bi bi-cloud-upload me-2"></i>
          )}
          {uploading ? "Uploading..." : "Drag & drop files here or click to upload"}
        </label>
      </div>
      <div className="sources-list">
        {sources.length > 0 ? (
          <ul className="list-group">
            {sources.map((src) => (
              <li key={src.id} className="list-group-item d-flex justify-content-between align-items-center">
                <span>{src.filename}</span>
                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => handleDeleteSource(src.id)}
                  disabled={loading}
                >
                  <i className="bi bi-trash"></i>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted text-center mb-0">No sources uploaded yet</p>
        )}
      </div>
    </div>
  );
}
