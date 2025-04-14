import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Spinner } from 'react-bootstrap';
import { FaPlus, FaEdit, FaTrash, FaSave, FaTimes } from 'react-icons/fa';
import axios from 'axios';
import { getTranslation } from '../utils/ln';
import PodcastComponent from './PodcastComponent';

const NoteComponent = ({ notebookId, selectedSources, notebookName }) => {
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingNote, setEditingNote] = useState(null);
    const [newNote, setNewNote] = useState({ title: '', content: '' });
    const [isAddingNote, setIsAddingNote] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchNotes();
    }, [notebookId]);

    const fetchNotes = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`/api/notebooks/${notebookId}/sources`);
            // Ensure we have an array of sources
            const sources = Array.isArray(response.data) ? response.data : [];
            // Filter for notes only
            const notesData = sources.filter(source => source.is_note);
            setNotes(notesData);
        } catch (err) {
            setError(getTranslation('failedToFetchNotes'));
            console.error('Error fetching notes:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddNote = async () => {
        if (!newNote.content.trim() || uploading) return;

        try {
            setUploading(true);
            setError(null);
            
            if (newNote.content.length > 1000) {
                setError(getTranslation('noteTooLong', { max: 1000, current: newNote.content.length }));
                return;
            }

            const formData = new FormData();
            formData.append("text", newNote.content);
            formData.append("notebook_id", notebookId);
            formData.append("is_note", "1");
            if (newNote.title) {
                formData.append("title", newNote.title);
            }

            const response = await axios.post('/api/sources', formData);
            if (response.data.error) {
                setError(response.data.error);
                return;
            }

            setNewNote({ title: '', content: '' });
            setIsAddingNote(false);
            fetchNotes();
        } catch (err) {
            console.error("Error creating note:", err);
            const errorMessage = err.response?.data?.error || err.message || getTranslation('failedToCreateNote');
            setError(errorMessage);
        } finally {
            setUploading(false);
        }
    };

    const handleSaveEdit = async (note) => {
        try {
            setUploading(true);
            const response = await axios.put(`/api/sources/${note.id}`, {
                title: note.title,
                text: note.content,
                is_note: true
            });
            if (response.data.error) {
                setError(response.data.error);
                return;
            }
            setEditingNote(null);
            fetchNotes();
        } catch (err) {
            setError(getTranslation('failedToUpdateNote'));
            console.error('Error updating note:', err);
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteNote = async (noteId) => {
        if (!window.confirm(getTranslation('confirmDeleteNote'))) return;

        try {
            setUploading(true);
            const response = await axios.delete(`/api/sources/${noteId}`);
            if (response.data.error) {
                setError(response.data.error);
                return;
            }
            fetchNotes();
        } catch (err) {
            setError(getTranslation('failedToDeleteNote'));
            console.error('Error deleting note:', err);
        } finally {
            setUploading(false);
        }
    };

    return (
        <Container fluid className="note-component">
            <Row>
                <Col>
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h2>{getTranslation('notes')}</h2>
                        <Button
                            variant="primary"
                            onClick={() => setIsAddingNote(true)}
                        >
                            <FaPlus className="me-2" />
                            {getTranslation('addNote')}
                        </Button>
                    </div>

                    {/* Podcast Generation Section */}
                    <div className="mb-4">
                        <PodcastComponent 
                            selectedSources={selectedSources} 
                            notebookName={notebookName}
                            notebookId={notebookId}
                        />
                    </div>

                    {/* Notes List */}
                    {loading ? (
                        <div className="text-center">
                            <Spinner animation="border" />
                        </div>
                    ) : error ? (
                        <div className="alert alert-danger">{error}</div>
                    ) : (
                        <div className="notes-grid">
                            {notes.map(note => (
                                <Card key={note.id} className="note-card">
                                    <Card.Body>
                                        {editingNote?.id === note.id ? (
                                            <Form>
                                                <Form.Group className="mb-3">
                                                    <Form.Control
                                                        type="text"
                                                        value={editingNote.title}
                                                        onChange={(e) => setEditingNote({
                                                            ...editingNote,
                                                            title: e.target.value
                                                        })}
                                                    />
                                                </Form.Group>
                                                <Form.Group className="mb-3">
                                                    <Form.Control
                                                        as="textarea"
                                                        rows={3}
                                                        value={editingNote.text}
                                                        onChange={(e) => setEditingNote({
                                                            ...editingNote,
                                                            content: e.target.value
                                                        })}
                                                    />
                                                </Form.Group>
                                                <div className="d-flex gap-2">
                                                    <Button
                                                        variant="success"
                                                        size="sm"
                                                        onClick={() => handleSaveEdit(editingNote)}
                                                    >
                                                        <FaSave className="me-1" />
                                                        {getTranslation('save')}
                                                    </Button>
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        onClick={() => setEditingNote(null)}
                                                    >
                                                        <FaTimes className="me-1" />
                                                        {getTranslation('cancel')}
                                                    </Button>
                                                </div>
                                            </Form>
                                        ) : (
                                            <>
                                                <div className="d-flex justify-content-between align-items-start mb-2">
                                                    <Card.Title>{note.title}</Card.Title>
                                                    <div className="note-actions">
                                                        <Button
                                                            variant="outline-primary"
                                                            size="sm"
                                                            className="me-2"
                                                            onClick={() => setEditingNote(note)}
                                                        >
                                                            <FaEdit />
                                                        </Button>
                                                        <Button
                                                            variant="outline-danger"
                                                            size="sm"
                                                            onClick={() => handleDeleteNote(note.id)}
                                                        >
                                                            <FaTrash />
                                                        </Button>
                                                    </div>
                                                </div>
                                                <Card.Text>{note.text}</Card.Text>
                                            </>
                                        )}
                                    </Card.Body>
                                </Card>
                            ))}
                        </div>
                    )}

                    {/* Add Note Modal */}
                    {isAddingNote && (
                        <Card className="add-note-card">
                            <Card.Body>
                                <Form>
                                    <Form.Group className="mb-3">
                                        <Form.Label>{getTranslation('noteTitle')}</Form.Label>
                                        <Form.Control
                                            type="text"
                                            value={newNote.title}
                                            onChange={(e) => setNewNote({
                                                ...newNote,
                                                title: e.target.value
                                            })}
                                        />
                                    </Form.Group>
                                    <Form.Group className="mb-3">
                                        <Form.Label>{getTranslation('noteContent')}</Form.Label>
                                        <Form.Control
                                            as="textarea"
                                            rows={3}
                                            value={newNote.content}
                                            onChange={(e) => setNewNote({
                                                ...newNote,
                                                content: e.target.value
                                            })}
                                        />
                                    </Form.Group>
                                    <div className="d-flex gap-2">
                                        <Button
                                            variant="primary"
                                            onClick={handleAddNote}
                                        >
                                            {getTranslation('save')}
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            onClick={() => {
                                                setIsAddingNote(false);
                                                setNewNote({ title: '', content: '' });
                                            }}
                                        >
                                            {getTranslation('cancel')}
                                        </Button>
                                    </div>
                                </Form>
                            </Card.Body>
                        </Card>
                    )}
                </Col>
            </Row>
        </Container>
    );
};

export default NoteComponent;
