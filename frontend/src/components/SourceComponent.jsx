import { useState, useEffect } from "react";
import { getSources, uploadSource, deleteSource, updateSource } from "../api/api";
import { MdSend, MdContentPaste, MdClose, MdCloudUpload, MdMoreVert, MdEdit, MdDelete } from "react-icons/md";
import { Card, Form, Button, Alert, Spinner, ListGroup, Modal, Dropdown } from 'react-bootstrap';
import { NotebookContext } from "../context/NotebookContext";
import { useContext } from "react";

export default function SourceComponent({ notebookId, onSourceSelect }) {
  const { refreshNotebooks } = useContext(NotebookContext);
  const [sources, setSources] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selectedInputType, setSelectedInputType] = useState("file");
  const [textInput, setTextInput] = useState("");
  const [linkInput, setLinkInput] = useState("");
  const [youtubeInput, setYoutubeInput] = useState("");
  const [fileError, setFileError] = useState("");
  const [inputError, setInputError] = useState("");
  const [selectedSources, setSelectedSources] = useState(new Set());
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSource, setEditingSource] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editError, setEditError] = useState(null);

  const ALLOWED_FILE_TYPES = ["pdf", "txt", "jpg", "jpeg", "png"];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
  const MAX_TEXT_LENGTH = 1000;

  useEffect(() => {
    fetchSources();
  }, [notebookId]);

  useEffect(() => {
    // Notify parent component of selected sources
    if (onSourceSelect) {
      const selectedSourceTexts = sources
        .filter(source => selectedSources.has(source.id))
        .map(source => source.description);
      onSourceSelect(selectedSourceTexts);
    }
  }, [selectedSources, sources, onSourceSelect]);

  const fetchSources = async () => {
    try {
      setLoading(true);
      const response = await getSources(notebookId);
      setSources(response.data.reverse());
      setError(null);
    } catch (err) {
      setError("Upload file to start");
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

  const validateFileType = (file) => {
    const extension = file.name.split('.').pop().toLowerCase();
    return ALLOWED_FILE_TYPES.includes(extension);
  };

  const validateFileSize = (file) => {
    return file.size <= MAX_FILE_SIZE;
  };

  const validateUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const validateYoutubeUrl = (url) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    return youtubeRegex.test(url);
  };

  const handleFileUpload = async (file) => {
    try {
      setFileError("");
      
      // Frontend validation
      if (!validateFileType(file)) {
        setFileError(`File type not supported. Please upload one of: ${ALLOWED_FILE_TYPES.join(', ')}`);
        return;
      }

      if (!validateFileSize(file)) {
        setFileError(`File size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds 10MB limit`);
        return;
      }

      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("notebook_id", notebookId);

      const response = await uploadSource(formData);
      if (response.data.error) {
        setFileError(response.data.error);
        return;
      }
      await fetchSources();
      setError(null);
    } catch (err) {
      console.error("Error uploading file:", err);
      const errorMessage = err.response?.data?.error || err.message || "Failed to upload file. Please try again.";
      setFileError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleTextSubmit = async () => {
    try {
      setInputError("");
      
      if (!textInput.trim()) {
        setInputError("Please enter some text");
        return;
      }

      if (textInput.length > MAX_TEXT_LENGTH) {
        setInputError(`Text exceeds ${MAX_TEXT_LENGTH} characters limit`);
        return;
      }

      setUploading(true);
      const formData = new FormData();
      formData.append("text", textInput);
      formData.append("notebook_id", notebookId);
      formData.append("is_note", "1");

      const response = await uploadSource(formData);
      if (response.data.error) {
        setInputError(response.data.error);
        return;
      }
      setTextInput("");
      await fetchSources();
    } catch (err) {
      console.error("Error uploading text:", err);
      const errorMessage = err.response?.data?.error || err.message || "Failed to upload text";
      setInputError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleLinkSubmit = async () => {
    try {
      setInputError("");
      
      if (!linkInput.trim()) {
        setInputError("Please enter a link");
        return;
      }

      if (!validateUrl(linkInput)) {
        setInputError("Please enter a valid URL");
        return;
      }

      setUploading(true);
      const formData = new FormData();
      formData.append("link", linkInput);
      formData.append("notebook_id", notebookId);

      const response = await uploadSource(formData);
      if (response.data.error) {
        setInputError(response.data.error);
        return;
      }
      setLinkInput("");
      await fetchSources();
    } catch (err) {
      console.error("Error uploading link:", err);
      const errorMessage = err.response?.data?.error || err.message || "Failed to upload link";
      setInputError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleYoutubeSubmit = async () => {
    try {
      setInputError("");
      
      if (!youtubeInput.trim()) {
        setInputError("Please enter a YouTube link");
        return;
      }

      if (!validateYoutubeUrl(youtubeInput)) {
        setInputError("Please enter a valid YouTube URL");
        return;
      }

      setUploading(true);
      const formData = new FormData();
      formData.append("link", youtubeInput);
      formData.append("notebook_id", notebookId);

      const response = await uploadSource(formData);
      if (response.data.error) {
        setInputError(response.data.error);
        return;
      }
      setYoutubeInput("");
      await fetchSources();
    } catch (err) {
      console.error("Error uploading YouTube link:", err);
      const errorMessage = err.response?.data?.error || err.message || "Failed to upload YouTube link";
      setInputError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteSource = async (id) => {
    try {
      setLoading(true);
      const response = await deleteSource(id);
      if (response.data.error) {
        setError(response.data.error);
        return;
      }
      await fetchSources();
      await refreshNotebooks();
      setError(null);
    } catch (err) {
      console.error("Error deleting source:", err);
      const errorMessage = err.response?.data?.error || err.message || "Failed to delete source";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSourceSelect = (sourceId) => {
    setSelectedSources(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(sourceId)) {
        newSelected.delete(sourceId);
      } else {
        newSelected.add(sourceId);
      }
      return newSelected;
    });
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      switch (selectedInputType) {
        case "text":
          setTextInput(text);
          break;
        case "link":
          setLinkInput(text);
          break;
        case "youtube":
          setYoutubeInput(text);
          break;
        default:
          break;
      }
    } catch (err) {
      setInputError("Failed to paste from clipboard");
    }
  };

  const handleEditSource = (source) => {
    setEditingSource(source);
    setEditTitle(source.title);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) {
      setEditError("Title cannot be empty");
      return;
    }

    try {
      setLoading(true);
      const response = await updateSource(editingSource.id, { title: editTitle });
      if (response.data.error) {
        setEditError(response.data.error);
        return;
      }
      await fetchSources();
      setShowEditModal(false);
      setEditingSource(null);
      setEditTitle("");
      setEditError(null);
    } catch (err) {
      console.error("Error updating source:", err);
      setEditError(err.response?.data?.error || "Failed to update source");
    } finally {
      setLoading(false);
    }
  };

  if (loading && sources.length === 0) {
    return (
      <Card className="p-3">
        <h5>Sources</h5>
        <div className="d-flex justify-content-center">
          <Spinner animation="border" variant="primary" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-3">
      <h5>Sources</h5>
      {error && (
        <Alert variant="info">
          {error}
        </Alert>
      )}
      
      {/* Input Type Selection */}
      <Form.Select 
        className="mb-3"
        value={selectedInputType}
        onChange={(e) => setSelectedInputType(e.target.value)}
      >
        <option value="file">File Upload</option>
        <option value="text">Text Input</option>
        <option value="link">Web Link</option>
        <option value="youtube">YouTube Link</option>
      </Form.Select>

      {/* File Upload Section */}
      {selectedInputType === "file" && (
        <>
          <div
            className={`upload-area p-3 text-center mb-2 ${
              dragging ? "border border-primary" : "border border-dashed"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            style={{ cursor: "pointer" }}
          >
            <input
              type="file"
              id="file-upload"
              className="d-none"
              onChange={handleFileSelect}
              disabled={uploading}
              accept={ALLOWED_FILE_TYPES.map(type => `.${type}`).join(',')}
            />
            <div 
              onClick={() => document.getElementById('file-upload').click()}
              className="mb-0"
            >
              {uploading ? (
                <Spinner animation="border" size="sm" className="me-2" />
              ) : (
                <MdCloudUpload className="me-2 react-icons" />
              )}
              {uploading ? "Uploading..." : "Drag & drop files here or click to upload"}
            </div>
          </div>
          <Alert variant="warning" className="mb-3 py-2">
            <small className="d-block mb-1">
              <i className="bi bi-exclamation-triangle me-1"></i>
              Allowed file types: {ALLOWED_FILE_TYPES.join(', ')}
            </small>
            <small className="d-block">
              <i className="bi bi-exclamation-triangle me-1"></i>
              Maximum file size: 10MB
            </small>
          </Alert>
          {fileError && (
            <Alert variant="danger">
              {fileError}
            </Alert>
          )}
        </>
      )}

      {/* Text Input Section */}
      {selectedInputType === "text" && (
        <div className="mb-3">
          <Form.Control
            as="textarea"
            rows={4}
            className="mb-2"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Enter your text here..."
            maxLength={MAX_TEXT_LENGTH}
          />
          <div className="d-flex justify-content-between align-items-center mb-2">
            <small className="text-muted">
              {textInput.length}/{MAX_TEXT_LENGTH} characters
            </small>
          </div>
          <div className="d-flex gap-2">
            <Button variant="outline-secondary" className="flex-grow-1" onClick={handlePaste}>
              <MdContentPaste className="me-1 react-icons" style={{ fontSize: '1rem' }} /> Paste
            </Button>
            <Button variant="primary" className="flex-grow-1" onClick={handleTextSubmit} disabled={uploading}>
              <MdSend className="me-1 react-icons" style={{ fontSize: '1rem' }} /> Send
            </Button>
          </div>
        </div>
      )}

      {/* Link Input Section */}
      {selectedInputType === "link" && (
        <div className="mb-3">
          <div className="input-group">
            <Form.Control
              type="url"
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              placeholder="Enter web link or YouTube link..."
            />
            <Button variant="outline-secondary" onClick={handlePaste}>
              <MdContentPaste className="react-icons" style={{ fontSize: '1.2rem' }} />
            </Button>
            <Button variant="primary" onClick={handleLinkSubmit} disabled={uploading}>
              <MdSend className="react-icons" style={{ fontSize: '1.2rem' }} />
            </Button>
          </div>
          <small className="text-muted mt-2 d-block">
            Supports both web links and YouTube links
          </small>
        </div>
      )}

      {/* YouTube Input Section */}
      {selectedInputType === "youtube" && (
        <div className="mb-3">
          <div className="input-group">
            <Form.Control
              type="url"
              value={youtubeInput}
              onChange={(e) => setYoutubeInput(e.target.value)}
              placeholder="Enter YouTube link..."
            />
            <Button variant="outline-secondary" onClick={handlePaste}>
              <MdContentPaste className="react-icons" style={{ fontSize: '1.2rem' }} />
            </Button>
            <Button variant="primary" onClick={handleYoutubeSubmit} disabled={uploading}>
              <MdSend className="react-icons" style={{ fontSize: '1.2rem' }} />
            </Button>
          </div>
        </div>
      )}

      {inputError && (
        <Alert variant="danger">
          {inputError}
        </Alert>
      )}

      <div className="sources-list">
        {sources.length > 0 ? (
          <ListGroup>
            {sources.map((src) => (
              <ListGroup.Item key={src.id} className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center">
                  <Form.Check
                    type="checkbox"
                    className="me-2"
                    checked={selectedSources.has(src.id)}
                    onChange={() => handleSourceSelect(src.id)}
                  />
                  <div className="d-flex flex-column">
                    <span>{src.title}</span>
                    {src.is_note && (
                      <small className="text-warning">
                        <i className="bi bi-exclamation-triangle me-1"></i>
                        Note
                      </small>
                    )}
                  </div>
                </div>
                <div className="d-flex gap-2">
                  <Dropdown>
                    <Dropdown.Toggle variant="link" className="p-0" style={{ boxShadow: 'none' }}>
                      <MdMoreVert className="react-icons" />
                    </Dropdown.Toggle>
                    <Dropdown.Menu align="end">
                      <Dropdown.Item onClick={() => handleEditSource(src)}>
                        <MdEdit className="me-2 react-icons" /> Edit Title
                      </Dropdown.Item>
                      <Dropdown.Item onClick={() => handleDeleteSource(src.id)} className="text-danger">
                        <MdDelete className="me-2 react-icons" /> Delete
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        ) : null}
      </div>

      {/* Edit Title Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Source Title</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editError && (
            <Alert variant="danger">
              {editError}
            </Alert>
          )}
          <Form>
            <Form.Group>
              <Form.Label>Title</Form.Label>
              <Form.Control
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Enter source title"
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveEdit} disabled={loading}>
            {loading ? (
              <Spinner animation="border" size="sm" className="me-2" />
            ) : null}
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>
    </Card>
  );
}
