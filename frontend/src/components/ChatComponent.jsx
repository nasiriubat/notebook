import React, { useState, useEffect, useRef } from "react";
import { sendChatMessage, uploadSource } from "../api/api";
import { FaPaperPlane, FaCopy, FaPlus, FaRedo } from "react-icons/fa";
import { Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import './ChatComponent.css';

const ChatComponent = ({ notebookId, selectedSources, onSourceAdded }) => {
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

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

      // Prepare context from selected sources
      const context = selectedSources.length > 0
        ? selectedSources.map(source => source.description).join('\n')
        : '';

      // Send message to backend with proper format
      const response = await sendChatMessage({
        context,
        query: query.trim()
      });
      
      // Add bot response
      setMessages(prev => [...prev, { role: "assistant", content: response.data.reply }]);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send message");
      console.error("Error sending message:", err);
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
      setError(err.response?.data?.message || "Failed to add to sources");
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

      // Send message to backend with proper format
      const response = await sendChatMessage({
        context,
        query: userMessage.content.trim(),
        regenerate: true  // Add flag to indicate this is a regeneration
      });
      
      // Add new bot response after the existing messages
      setMessages(prev => [...prev, { role: "assistant", content: response.data.reply }]);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to regenerate response");
      console.error("Error regenerating response:", err);
    } finally {
      setSending(false);
    }
  };

  if (loading && messages.length === 0) {
    return (
      <div className="card p-3">
        <h5>Chat</h5>
        <div className="d-flex justify-content-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="p-3 h-100 d-flex flex-column">
      <h5 className="mb-3">Chat</h5>
      {error && (
        <Alert variant="danger" role="alert">
          {error}
        </Alert>
      )}
      <div 
        className="chat-box flex-grow-1 d-flex flex-column mb-3"
      >
        <div className="chat-messages">
          <div className="d-flex flex-column">
            {!selectedSources?.length ? (
              <div className="text-center text-muted py-5">
                <i className="bi bi-chat-dots display-4 mb-3"></i>
                <p className="mb-0">Select sources to start the conversation</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-muted py-5">
                <i className="bi bi-chat-dots display-4 mb-3"></i>
                <p className="mb-0">Start a conversation with your sources</p>
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
                      {message.role === "assistant" && (
                        <div className="message-actions">
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            className="action-button"
                            onClick={() => handleCopyMessage(message.content)}
                            title="Copy message"
                          >
                            <FaCopy />
                          </Button>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            className="action-button"
                            onClick={() => handleAddToSource(message.content)}
                            title="Add to sources"
                          >
                            <FaPlus />
                          </Button>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            className="action-button"
                            onClick={() => handleRegenerate(index)}
                            title="Regenerate response"
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
            placeholder={selectedSources?.length ? "Type your message..." : "Select sources to start chatting"}
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
