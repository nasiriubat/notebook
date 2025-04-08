import { useState, useEffect } from "react";
import { getSources, uploadSource, deleteSource, updateSource } from "../api/api";
import { MdSend, MdContentPaste, MdClose, MdCloudUpload, MdMoreVert, MdEdit, MdDelete, MdContentCopy } from "react-icons/md";
import { Card, Form, Button, Alert, Spinner, ListGroup, Modal, Dropdown } from 'react-bootstrap';
import { NotebookContext } from "../context/NotebookContext";
import { useContext } from "react";
import { getTranslation } from '../utils/ln';

export default function SourceComponent({ notebookId, onSourceSelect, sources, onSourcesUpdate, onSourceDeleted }) {
  const { refreshNotebooks } = useContext(NotebookContext);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [creatingSource, setCreatingSource] = useState(false);
  const [selectedInputType, setSelectedInputType] = useState("file");
  const [textInputs, setTextInputs] = useState({});
  const [linkInput, setLinkInput] = useState("");
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
    // Only notify parent if selectedSources has changed and is not empty
    if (onSourceSelect && selectedSources.size > 0) {
      const selectedArray = Array.from(selectedSources);
      onSourceSelect(selectedArray);
    }
  }, [selectedSources]);

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
      setCreatingSource(true);
      
      // Frontend validation
      if (!validateFileType(file)) {
        setFileError(getTranslation('fileTypeNotSupported', { types: ALLOWED_FILE_TYPES.join(', ') }));
        return;
      }

      if (!validateFileSize(file)) {
        setFileError(getTranslation('fileSizeExceeded', { size: (file.size / (1024 * 1024)).toFixed(2) }));
        return;
      }

      setUploading(true);
      
      // Pass the file directly to uploadSource
      const response = await uploadSource({
        file,
        notebook_id: notebookId
      });

      if (response.data.error) {
        setError(response.data.error);
        return;
      }

      // Notify parent component about the new source
      if (onSourcesUpdate) {
        onSourcesUpdate();
      }
      setError(null);
    } catch (err) {
      console.error("Error uploading file:", err);
      setError(err.response?.data?.message || getTranslation('failedToUploadFile'));
    } finally {
      setUploading(false);
      setCreatingSource(false);
    }
  };

  const handleTextSubmit = async (inputId) => {
    const text = textInputs[inputId];
    if (!text?.trim() || uploading) return;

    try {
      setCreatingSource(true);
      setError(null);

      if (text.length > MAX_TEXT_LENGTH) {
        setError(getTranslation('textTooLong', { max: MAX_TEXT_LENGTH }));
        return;
      }

      const formData = new FormData();
      formData.append("text", text);
      formData.append("notebook_id", notebookId);
      formData.append("is_note", "0");

      const response = await uploadSource(formData);
      if (response.data.error) {
        setError(response.data.error);
        return;
      }

      // Clear only this specific text input
      setTextInputs(prev => {
        const newInputs = { ...prev };
        delete newInputs[inputId];
        return newInputs;
      });

      if (onSourcesUpdate) {
        onSourcesUpdate();
      }
    } catch (err) {
      console.error("Error creating text source:", err);
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error || 
                          getTranslation('failedToCreateTextSource');
      setError(errorMessage);
    } finally {
      setCreatingSource(false);
    }
  };

  const handleLinkSubmit = async () => {
    if (!linkInput.trim() || uploading) return;

    try {
      setCreatingSource(true);
      setError(null);

      const isYoutube = validateYoutubeUrl(linkInput);
      if (!validateUrl(linkInput)) {
        setError(getTranslation('invalidUrl'));
        return;
      }

      const formData = new FormData();
      formData.append("link", linkInput);
      formData.append("notebook_id", notebookId);
      formData.append("is_note", "0");

      const response = await uploadSource(formData);
      if (response.data.error) {
        setError(response.data.error);
        return;
      }

      setLinkInput("");
      if (onSourcesUpdate) {
        onSourcesUpdate();
      }
    } catch (err) {
      console.error("Error creating link source:", err);
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error || 
                          getTranslation('failedToCreateLinkSource');
      setError(errorMessage);
    } finally {
      setCreatingSource(false);
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
      // Notify parent component about the deleted source
      if (onSourceDeleted) {
        onSourceDeleted(id);
      }
      setError(null);
    } catch (err) {
      console.error("Error deleting source:", err);
      const errorMessage = err.response?.data?.error || err.message || getTranslation('failedToDeleteSource');
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

  const handlePaste = async (inputId) => {
    try {
      const text = await navigator.clipboard.readText();
      if (selectedInputType === "text") {
        setTextInputs(prev => ({
          ...prev,
          [inputId]: text
        }));
      } else if (selectedInputType === "link") {
        setLinkInput(text);
      }
    } catch (err) {
      setInputError(getTranslation('failedToPaste'));
    }
  };

  const handleEditSource = (source) => {
    setEditingSource(source);
    setEditTitle(source.title);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) {
      setEditError(getTranslation('titleCannotBeEmpty'));
      return;
    }

    try {
      setLoading(true);
      const response = await updateSource(editingSource.id, { title: editTitle });
      if (response.data.error) {
        setEditError(response.data.error);
        return;
      }
      if (onSourcesUpdate) {
        onSourcesUpdate();
      }
      setShowEditModal(false);
      setEditingSource(null);
      setEditTitle("");
      setEditError(null);
    } catch (err) {
      console.error("Error updating source:", err);
      setEditError(err.response?.data?.error || getTranslation('failedToUpdateSource'));
    } finally {
      setLoading(false);
    }
  };

  const handleCopyDescription = async (description) => {
    try {
      await navigator.clipboard.writeText(description);
    } catch (err) {
      setError(getTranslation('failedToCopy'));
    }
  };

  const handleInputTypeChange = (e) => {
    const newType = e.target.value;
    setSelectedInputType(newType);
    // Clear text inputs when switching to text type
    if (newType === "text") {
      setTextInputs({
        "text-1": "" // Initialize with one empty text input
      });
    }
  };

  if (loading && sources.length === 0) {
    return (
      <Card className="p-3">
        <h5>{getTranslation('sources')}</h5>
        <div className="d-flex justify-content-center">
          <Spinner animation="border" variant="primary" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-3">
      <h5>{getTranslation('sources')}</h5>
      {error && (
        <Alert variant="info">
          {error}
        </Alert>
      )}
      
      {/* Input Type Selection */}
      <div className="source-input-area">
        <Form.Select 
          className="mb-3"
          value={selectedInputType}
          onChange={handleInputTypeChange}
        >
          <option value="file">{getTranslation('fileUpload')}</option>
          <option value="text">{getTranslation('textInput')}</option>
          <option value="link">{getTranslation('webLink')}</option>
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
                {uploading ? getTranslation('uploading') : getTranslation('uploadFile')}
              </div>
            </div>
            <Alert variant="warning" className="mb-2 py-1 text-center ">
              <small className="d-block mb-1">
                <i className="bi bi-exclamation-triangle me-1"></i>
                {ALLOWED_FILE_TYPES.join(', ')} 
                {getTranslation('maxFileSize')}
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
            {Object.entries(textInputs).map(([inputId, text]) => (
              <div key={inputId} className="mb-3">
                <Form.Control
                  as="textarea"
                  rows={4}
                  className="mb-2"
                  value={text}
                  onChange={(e) => setTextInputs(prev => ({
                    ...prev,
                    [inputId]: e.target.value
                  }))}
                  placeholder={getTranslation('enterText')}
                  maxLength={MAX_TEXT_LENGTH}
                />
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <small className="text-muted">
                    {text.length}/{MAX_TEXT_LENGTH} {getTranslation('characters')}
                  </small>
                </div>
                <div className="d-flex gap-2">
                  <Button variant="outline-secondary" className="flex-grow-1" onClick={() => handlePaste(inputId)}>
                    <MdContentPaste className="me-1 react-icons" style={{ fontSize: '1rem' }} /> {getTranslation('paste')}
                  </Button>
                  <Button variant="primary" className="flex-grow-1" onClick={() => handleTextSubmit(inputId)} disabled={uploading}>
                    <MdSend className="me-1 react-icons" style={{ fontSize: '1rem' }} /> {getTranslation('send')}
                  </Button>
                </div>
              </div>
            ))}
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
                placeholder={getTranslation('enterWebLink')}
              />
              <Button variant="outline-secondary" onClick={() => handlePaste('link')}>
                <MdContentPaste className="react-icons" style={{ fontSize: '1.2rem' }} />
              </Button>
              <Button variant="primary" onClick={handleLinkSubmit} disabled={uploading}>
                <MdSend className="react-icons" style={{ fontSize: '1.2rem' }} />
              </Button>
            </div>
            <small className="text-muted mt-2 d-block">
              {getTranslation('supportsLinks')} <br />
              <small>{getTranslation('supportsYoutube')}</small>
            </small>
          </div>
        )}

        {inputError && (
          <Alert variant="danger">
            {inputError}
          </Alert>
        )}
      </div>

      <div className="sources-list">
        {sources.length > 0 ? (
          <ListGroup>
            {sources.map((src) => (
              <ListGroup.Item key={src.id} className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                  <Form.Check
                    type="checkbox"
                    className="me-2"
                    checked={selectedSources.has(src.id)}
                    onChange={() => handleSourceSelect(src.id)}
                  />
                  <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                    <span className="text-truncate" style={{ maxWidth: '250px' }}>{src.title}</span>
                  </div>
                </div>
                <div className="d-flex align-items-center ms-2">
                  <Dropdown>
                    <Dropdown.Toggle variant="link" className="p-0" style={{ boxShadow: 'none' }}>
                      <MdMoreVert className="react-icons" />
                    </Dropdown.Toggle>
                    <Dropdown.Menu align="end">
                      <Dropdown.Item onClick={() => handleCopyDescription(src.description)}>
                        <MdContentCopy className="me-2 react-icons" /> {getTranslation('copyText')}
                      </Dropdown.Item>
                      <Dropdown.Item onClick={() => handleEditSource(src)}>
                        <MdEdit className="me-2 react-icons" /> {getTranslation('editTitle')}
                      </Dropdown.Item>
                      <Dropdown.Item onClick={() => handleDeleteSource(src.id)} className="text-danger">
                        <MdDelete className="me-2 react-icons" /> {getTranslation('delete')}
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                </div>
              </ListGroup.Item>
            ))}
            {creatingSource && (
              <ListGroup.Item className="d-flex align-items-center">
                <div className="d-flex align-items-center">
                  <Spinner animation="border" size="sm" className="me-2" />
                  <span>{getTranslation('creatingSource')}</span>
                </div>
              </ListGroup.Item>
            )}
          </ListGroup>
        ) : (
          <div className="text-center py-3">
            {creatingSource ? (
              <div className="d-flex align-items-center justify-content-center">
                <Spinner animation="border" size="sm" className="me-2" />
                <span>{getTranslation('creatingSource')}</span>
              </div>
            ) : (
              <span className="text-muted">{getTranslation('noSources')}</span>
            )}
          </div>
        )}
      </div>

      {/* Edit Title Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{getTranslation('editSourceTitle')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editError && (
            <Alert variant="danger">
              {editError}
            </Alert>
          )}
          <Form>
            <Form.Group>
              <Form.Label>{getTranslation('title')}</Form.Label>
              <Form.Control
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder={getTranslation('enterSourceTitle')}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            {getTranslation('cancel')}
          </Button>
          <Button variant="primary" onClick={handleSaveEdit} disabled={loading}>
            {loading ? (
              <Spinner animation="border" size="sm" className="me-2" />
            ) : null}
            {getTranslation('saveChanges')}
          </Button>
        </Modal.Footer>
      </Modal>
    </Card>
  );
}
