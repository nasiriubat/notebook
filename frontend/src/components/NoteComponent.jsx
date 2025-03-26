import { useState, useEffect } from "react";
import { getSources, createSource, deleteSource } from "../api/api";
import { MdClose } from "react-icons/md";

export default function NoteComponent({ notebookId }) {
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState("");
  const [noteText, setNoteText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, [notebookId]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const response = await getSources(notebookId);
      // Filter only notes from sources
      const notes = response.data.filter(source => source.is_note).reverse();
      setNotes(notes);
      setError(null);
    } catch (err) {
      console.error("Error fetching notes:", err);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!title.trim() || !noteText.trim() || saving) return;

    try {
      setSaving(true);
      setError(null);
      
      if (title.length > 200) {
        setError(`Title cannot exceed 200 characters. Current length: ${title.length}`);
        return;
      }

      if (noteText.length > 1000) {
        setError(`Note text cannot exceed 1000 characters. Current length: ${noteText.length}`);
        return;
      }

      // Create a temporary file path for the note
      const tempFilePath = `notes/${Date.now()}_${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
      
      await createSource({
        notebookId,
        title,
        description: noteText,
        fileType: 'text',
        filePath: tempFilePath,
        faissFileName: '', // Not needed for notes
        isNote: true
      });

      setTitle("");
      setNoteText("");
      await fetchNotes();
    } catch (err) {
      const errorMessage = err.response?.data?.message;
      if (errorMessage) {
        setError(errorMessage);
      } else if (err.response?.status === 413) {
        setError("Note is too long. Maximum length is 1000 characters.");
      } else if (err.response?.status === 400) {
        setError("Invalid note content. Please check your input.");
      } else {
        setError("Failed to create note. Please try again.");
      }
      console.error("Error creating note:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (id) => {
    if (!window.confirm("Are you sure you want to delete this note?")) return;

    try {
      setLoading(true);
      await deleteSource(id);
      await fetchNotes();
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || null);
      console.error("Error deleting note:", err);
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
        <div className="mb-2">
          <input
            type="text"
            className="form-control"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter note title..."
            disabled={saving}
          />
        </div>
        
        <textarea
          className="form-control"
          rows="3"
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Add a new note..."
          disabled={saving}
        />
        <div className="d-flex justify-content-between align-items-center mb-1">
          <small className="text-muted">Maximum 1000 characters</small>
          <small className={`${noteText.length > 1000 ? 'text-danger' : 'text-muted'}`}>
            {noteText.length}/1000
          </small>
        </div>
        <button
          className="btn btn-primary w-100 mt-2"
          onClick={handleAddNote}
          disabled={saving || !title.trim() || !noteText.trim()}
        >
          {saving ? (
            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
          ) : null}
          Add to Source
        </button>
      </div>
      <div className="notes-list" style={{ overflowY: "auto", maxHeight: "calc(100% - 250px)" }}>
        {notes.length > 0 ? (
          <div className="list-group">
            {notes.map((note) => (
              <div key={note.id} className="list-group-item">
                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start gap-2">
                  <div className="flex-grow-1">
                    <h6 className="mb-1">{note.title}</h6>
                    <p className="mb-0">{note.description}</p>
                  </div>
                  <button
                    className="btn btn-sm "
                    onClick={() => handleDeleteNote(note.id)}
                    disabled={loading}
                  >
                    <MdClose className="react-icons border-none" />
                  </button>
                </div>
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
