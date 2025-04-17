import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Spinner } from 'react-bootstrap';
import { FaPlus, FaEdit, FaTrash, FaSave, FaTimes } from 'react-icons/fa';
import { getTranslation } from '../utils/ln';
import PodcastComponent from './PodcastComponent';
import { uploadSource } from '../api/api';

const NoteComponent = ({ notebookId, selectedSources, notebookName, onNoteAdded }) => {
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingNote, setEditingNote] = useState(null);
    const [newNote, setNewNote] = useState({ title: '', content: '' });
    const [isAddingNote, setIsAddingNote] = useState(false);
    const [uploading, setUploading] = useState(false);


 

    const handleAddNote = async () => {
        if (!newNote.content.trim() || uploading) return;

        try {
            setUploading(true);
            setError(null);
            
            if (newNote.content.length > 10000) {
                setError(getTranslation('noteTooLong', { max: 10000, current: newNote.content.length }));
                return;
            }

            const response = await uploadSource({
                text: newNote.content,
                notebook_id: notebookId,
                is_note: true,
                title: newNote.title || undefined
            });

            if (response.data.error) {
                setError(response.data.error);
                return;
            }

            setNewNote({ title: '', content: '' });
            setIsAddingNote(false);
            
            // Call the onNoteAdded callback to refresh the sources list
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

                    
                    {/* Add Note Modal */}
                    {isAddingNote && (
                        <Card className="add-note-card">
                            <Card.Body>
                                <Form>
                                    
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
                                            disabled={uploading}
                                        >
                                            {uploading ? (
                                                <>
                                                    <Spinner animation="border" size="sm" className="me-2" />
                                                    {getTranslation('saving')}
                                                </>
                                            ) : (
                                                getTranslation('save')
                                            )}
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

                    {/* Podcast Generation Section */}
                    <div className="mt-3">
                        <PodcastComponent 
                            selectedSources={selectedSources} 
                            notebookName={notebookName}
                            notebookId={notebookId}
                        />
                    </div>
                </Col>
            </Row>
        </Container>
    );
};

export default NoteComponent;
