import React, { useState, useEffect, useRef } from "react";
import { sendChatMessage, uploadSource, deleteChatMessages, getChatMessages } from "../api/api";
import { FaPaperPlane, FaCopy, FaPlus, FaRedo, FaTrash } from "react-icons/fa";
import { Card, Form, Button, Alert, Spinner, Modal } from 'react-bootstrap';
import { getCurrentLanguage, getTranslation } from '../utils/ln';
import './ChatComponent.css';

const ChatComponent = ({ notebookId, selectedSources, onSourceAdded }) => {
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const messagesEndRef = useRef(null);

  // Load messages when component mounts or notebook changes
  useEffect(() => {
    const loadMessages = async () => {
      if (!notebookId) return;

      setLoading(true);
      setError(null);

      try {
        const response = await getChatMessages(notebookId);
        setMessages(response.data.messages);
      } catch (err) {
        console.error("Error loading chat messages:", err);
        setError(err.response?.data?.message || getTranslation('failedToLoadMessages'));
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [notebookId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (!query.trim() || sending) return;

    setSending(true);
    setError(null);

    try {
      // Add user message immediately
      setMessages(prev => [...prev, { role: "user", content: query }]);
      setQuery("");

      // Get source IDs from selected sources
      const sourceIds = selectedSources.map(source => source.id);

      // Get current language
      const currentLang = getCurrentLanguage();

      // Send message to backend with proper format
      const response = await sendChatMessage({
        query: query.trim(),
        notebook_id: notebookId,
        source_ids: sourceIds,
        language: currentLang
      });

      // Add bot response with sources
      setMessages(prev => [...prev, {
        role: "assistant",
        content: response.data.reply,
        sources: response.data.sources,
        warning: response.data.warning
      }]);
    } catch (err) {
      console.error("Error sending message:", err);
      const errorMessage = err.response?.data?.error ||
        err.response?.data?.message ||
        getTranslation('failedToSendMessage');
      setError(errorMessage);

      // If unauthorized, remove the user message we added
      if (err.response?.status === 403) {
        setMessages(prev => prev.slice(0, -1));
      }
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopyMessage = (content) => {
    navigator.clipboard.writeText(content);
  };

  const handleAddToSource = async (content) => {
    try {
      setLoading(true);
      const response = await uploadSource({
        text: content,
        notebook_id: notebookId,
        type: 'text',
        is_note: true
      });

      // Show success message
      setError(null);
      // Notify parent component about the new source
      if (onSourceAdded) {
        onSourceAdded(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || getTranslation('failedToAddToSources'));
      console.error("Error adding to sources:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async (messageIndex) => {
    if (sending) return;

    setSending(true);
    setError(null);

    try {
      // Get the user message that preceded this bot message
      const userMessage = messages[messageIndex - 1];
      if (!userMessage) return;

      // Prepare context from selected sources
      const context = selectedSources.length > 0
        ? selectedSources.map(source => source.description).join('\n')
        : '';

      // Get source IDs from selected sources
      const sourceIds = selectedSources.map(source => source.id);

      // Send message to backend with proper format
      const response = await sendChatMessage({
        context,
        query: userMessage.content.trim(),
        notebook_id: notebookId,
        source_ids: sourceIds,
        regenerate: true
      });

      // Add new bot response after the existing messages with sources
      setMessages(prev => [...prev, {
        role: "assistant",
        content: response.data.reply,
        sources: response.data.sources,
        warning: response.data.warning
      }]);
    } catch (err) {
      setError(err.response?.data?.message || getTranslation('failedToRegenerate'));
      console.error("Error regenerating response:", err);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteChat = async () => {
    setDeleting(true);
    setError(null);

    try {
      await deleteChatMessages(notebookId);
      setMessages([]); // Clear messages locally
      setShowDeleteModal(false);
    } catch (err) {
      console.error("Error deleting chat:", err);
      setError(err.response?.data?.message || getTranslation('failedToDeleteChat'));
    } finally {
      setDeleting(false);
    }
  };

  if (loading && messages.length === 0) {
    return (
      <div className="card p-3">
        <h5>{getTranslation('chat')}</h5>
        <div className="d-flex justify-content-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">{getTranslation('loading')}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="d-flex flex-column border-0 bg-transparent shadow-none">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">{getTranslation('chat')}</h5>
        {messages.length > 0 && (
          <Button
            variant="outline-danger"
            size="sm"
            onClick={() => setShowDeleteModal(true)}
            className="d-flex align-items-center"
          >
            <FaTrash className="me-1" />
            {getTranslation('clearChat')}
          </Button>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{getTranslation('clearChatHistory')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {getTranslation('clearChatConfirm')}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            {getTranslation('cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteChat}
            disabled={deleting}
          >
            {deleting ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                {getTranslation('deleting')}
              </>
            ) : (
              getTranslation('delete')
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {error && (
        <Alert variant="danger" role="alert">
          {error}
        </Alert>
      )}
      <div className="chat-box flex-grow-1 d-flex flex-column mb-3">
        <div className="chat-messages">
          <div className="d-flex flex-column">
            {messages.length === 0 ? (
              <div className="text-center text-muted py-5">
                <i className="bi bi-chat-dots display-4 mb-3"></i>
                <p className="mb-0">{getTranslation('startConversation')}</p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`message-wrapper ${message.role === "user" ? "user-message-wrapper" : "bot-message-wrapper"}`}
                >
                  <div className={`message ${message.role === "user" ? "user-message" : "bot-message"}`}>
                    <div className="message-content">
                      {message.content}
                      {message.role === "assistant" && message.sources && message.sources.length > 0 && (
                        <div className="message-sources mt-2">
                          <small className="text-muted">{getTranslation('sources')}:</small>
                          <div className="source-tags">
                            {message.sources.map((source, idx) => (
                              <span key={idx} className="badge bg-secondary me-1">
                                {(() => {
                                  const parts = source.split('.');
                                  const name = parts[0];
                                  const ext = parts[1] || '';
                                  const shortName = name.length > 40 ? name.slice(0, 40) + '...' : name;
                                  return `${shortName}.${ext}`;
                                })()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {message.role === "assistant" && message.warning && (
                        <div className="message-warning mt-2">
                          <small className="text-warning">
                            <i className="bi bi-exclamation-triangle me-1"></i>
                            {message.warning}
                          </small>
                        </div>
                      )}
                      {message.role === "assistant" && (
                        <div className="message-actions">
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            className="action-button"
                            onClick={() => handleCopyMessage(message.content)}
                            title={getTranslation('copyMessage')}
                          >
                            <FaCopy />
                          </Button>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            className="action-button"
                            onClick={() => handleAddToSource(message.content)}
                            title={getTranslation('addToSources')}
                          >
                            <FaPlus />
                          </Button>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            className="action-button"
                            onClick={() => handleRegenerate(index)}
                            title={getTranslation('regenerateResponse')}
                          >
                            <FaRedo />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>
      <div className="chat-input mt-auto">
        <div className="input-group">
          <textarea
            className="form-control"
            rows="1"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={selectedSources?.length ? getTranslation('typeMessage') : getTranslation('selectSources')}
            disabled={sending || !selectedSources?.length}
          />
          <Button
            variant="primary"
            onClick={handleSendMessage}
            disabled={sending || !query.trim() || !selectedSources?.length}
          >
            {sending ? (
              <Spinner animation="border" size="sm" />
            ) : (
              <FaPaperPlane />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ChatComponent;
