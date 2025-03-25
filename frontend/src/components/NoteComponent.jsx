import { useState, useEffect } from "react";
import { getNotes, createNote, deleteNote, updateNote } from "../api/api";

export default function NoteComponent({ notebookId }) {
  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingNote, setEditingNote] = useState(null);

  useEffect(() => {
    fetchNotes();
  }, [notebookId]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const response = await getNotes(notebookId);
      setNotes(response.data.reverse());
      setError(null);
    } catch (err) {
      setError("Failed to fetch notes");
      console.error("Error fetching notes:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim() || saving) return;

    try {
      setSaving(true);
      await createNote({ notebookId, text: noteText });
      setNoteText("");
      await fetchNotes();
      setError(null);
    } catch (err) {
      setError("Failed to create note");
      console.error("Error creating note:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (id) => {
    if (!window.confirm("Are you sure you want to delete this note?")) return;

    try {
      setLoading(true);
      await deleteNote(id);
      await fetchNotes();
      setError(null);
    } catch (err) {
      setError("Failed to delete note");
      console.error("Error deleting note:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateNote = async (id, text) => {
    try {
      setLoading(true);
      await updateNote(id, { text });
      await fetchNotes();
      setEditingNote(null);
      setError(null);
    } catch (err) {
      setError("Failed to update note");
      console.error("Error updating note:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddNote();
    }
  };

  if (loading && notes.length === 0) {
    return (
      <div className="card p-3">
        <h5>Notes</h5>
        <div className="d-flex justify-content-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-3 h-100">
      <h5>Notes</h5>
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      <div className="note-input mb-3">
        <textarea
          className="form-control"
          rows="2"
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Add a new note..."
          disabled={saving}
        />
        <button
          className="btn btn-primary w-100 mt-2"
          onClick={handleAddNote}
          disabled={saving || !noteText.trim()}
        >
          {saving ? (
            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
          ) : null}
          Add Note
        </button>
      </div>
      <div className="notes-list" style={{ overflowY: "auto", maxHeight: "calc(100% - 200px)" }}>
        {notes.length > 0 ? (
          <div className="list-group">
            {notes.map((note) => (
              <div key={note.id} className="list-group-item">
                {editingNote === note.id ? (
                  <div>
                    <textarea
                      className="form-control mb-2"
                      rows="3"
                      defaultValue={note.text}
                      onBlur={(e) => handleUpdateNote(note.id, e.target.value)}
                    />
                    <div className="d-flex justify-content-end gap-2">
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => setEditingNote(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="d-flex justify-content-between align-items-start">
                    <p className="mb-0">{note.text}</p>
                    <div className="btn-group">
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => setEditingNote(note.id)}
                      >
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDeleteNote(note.id)}
                        disabled={loading}
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted text-center mb-0">No notes yet</p>
        )}
      </div>
    </div>
  );
}
