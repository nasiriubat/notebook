import React, { useState, useEffect, useRef } from "react";
import { sendChatMessage, uploadSource } from "../api/api";
import { FaPaperPlane, FaCopy, FaPlus, FaRedo } from "react-icons/fa";
import { Card, Form, Button, Alert, Spinner } from 'react-bootstrap';

const ChatComponent = ({ notebookId, selectedSources }) => {
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
      await uploadSource({
        description: content,
        notebook_id: notebookId,
      });
      // Optionally show success message or refresh sources
    } catch (err) {
      console.error("Error adding to sources:", err);
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

      // Remove the old bot message
      setMessages(prev => prev.filter((_, index) => index !== messageIndex));

      // Prepare context from selected sources
      const context = selectedSources.length > 0
        ? selectedSources.map(source => source.description).join('\n')
        : '';

      // Send message to backend with proper format
      const response = await sendChatMessage({
        context,
        query: userMessage.content.trim()
      });
      
      // Add new bot response
      setMessages(prev => [...prev, { role: "assistant", content: response.data.message }]);
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
    <Card className="p-3 h-100">
      <h5>Chat</h5>
      {error && (
        <Alert variant="danger" role="alert">
          {error}
        </Alert>
      )}
      <div className="chat-box" style={{ height: "calc(100% - 150px)", overflowY: "auto" }}>
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
              className={`message ${message.role === "user" ? "user-message" : "bot-message"}`}
            >
              <div className="message-content">
                {message.content}
                {message.role === "assistant" && (
                  <div className="message-actions">
                    <button
                      onClick={() => handleCopyMessage(message.content)}
                      className="action-button"
                      title="Copy message"
                    >
                      <FaCopy />
                    </button>
                    <button
                      onClick={() => handleAddToSource(message.content)}
                      className="action-button"
                      title="Add to sources"
                    >
                      <FaPlus />
                    </button>
                    <button
                      onClick={() => handleRegenerate(index)}
                      className="action-button"
                      title="Regenerate response"
                    >
                      <FaRedo />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input mt-3">
        <div className="input-group">
          <textarea
            className="form-control"
            rows="2"
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
              <Spinner animation="border" size="sm" className="me-2" />
            ) : null}
            <FaPaperPlane />
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ChatComponent;
