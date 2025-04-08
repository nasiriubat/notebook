import { useState } from "react";
import { uploadSource } from "../api/api";
import { MdContentPaste, MdSend } from "react-icons/md";
import { Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { getTranslation } from '../utils/ln';

export default function NoteComponent({ notebookId, onNoteAdded }) {
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
        setError(getTranslation('noteTooLong', { max: 1000, current: noteText.length }));
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
      if (onNoteAdded) {
        onNoteAdded();
      }
    } catch (err) {
      console.error("Error creating note:", err);
      const errorMessage = err.response?.data?.error || err.message || getTranslation('failedToCreateNote');
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
      setError(getTranslation('failedToPaste'));
    }
  };

  return (
    <Card className="p-3">
      <h5>{getTranslation('addNote')}</h5>
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
          placeholder={getTranslation('enterNote')}
          maxLength={1000}
        />
        <div className="d-flex justify-content-between align-items-center mb-2">
          <small className="text-muted">
            {noteText.length}/1000 {getTranslation('characters')}
          </small>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-secondary" className="flex-grow-1" onClick={handlePaste}>
            <MdContentPaste className="me-1 react-icons" style={{ fontSize: '1rem' }} /> {getTranslation('paste')}
          </Button>
          <Button variant="primary" className="flex-grow-1" onClick={handleAddNote} disabled={uploading}>
            {getTranslation('addToSources')}
          </Button>
        </div>
      </div>
    </Card>
  );
}
