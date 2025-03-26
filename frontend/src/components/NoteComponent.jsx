import { useState } from "react";
import { uploadSource } from "../api/api";
import { MdContentPaste, MdSend } from "react-icons/md";
import { Card, Form, Button, Alert, Spinner } from 'react-bootstrap';

export default function NoteComponent({ notebookId }) {
  const [noteText, setNoteText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleAddNote = async () => {
    if (!noteText.trim() || uploading) return;

    try {
      setUploading(true);
      setError(null);
      
      if (noteText.length > 1000) {
        setError(`Note text cannot exceed 1000 characters. Current length: ${noteText.length}`);
        return;
      }

      const formData = new FormData();
      formData.append("text", noteText);
      formData.append("notebook_id", notebookId);
      formData.append("is_note", "1");

      const response = await uploadSource(formData);
      if (response.data.error) {
        setError(response.data.error);
        return;
      }

      setNoteText("");
    } catch (err) {
      console.error("Error creating note:", err);
      const errorMessage = err.response?.data?.error || err.message || "Failed to create note";
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setNoteText(text);
    } catch (err) {
      setError("Failed to paste from clipboard");
    }
  };

  return (
    <Card className="p-3">
      <h5>Add Note</h5>
      {error && (
        <Alert variant="danger">
          {error}
        </Alert>
      )}
      <div className="mb-3">
        <Form.Control
          as="textarea"
          rows={4}
          className="mb-2"
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Enter your note here..."
          maxLength={1000}
        />
        <div className="d-flex justify-content-between align-items-center mb-2">
          <small className="text-muted">
            {noteText.length}/1000 characters
          </small>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-secondary" className="flex-grow-1" onClick={handlePaste}>
            <MdContentPaste className="me-1 react-icons" style={{ fontSize: '1rem' }} /> Paste
          </Button>
          <Button variant="primary" className="flex-grow-1" onClick={handleAddNote} disabled={uploading}>
            <MdSend className="me-1 react-icons" style={{ fontSize: '1rem' }} /> Add to sources
          </Button>
        </div>
      </div>
    </Card>
  );
}
