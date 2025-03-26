import { useState, useEffect, useRef } from "react";
import { sendChatMessage, getChatMessages, getSources } from "../api/api";

export default function ChatComponent({ notebookId }) {
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [hasSources, setHasSources] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchMessages();
    checkSources();
  }, [notebookId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const checkSources = async () => {
    try {
      const response = await getSources(notebookId);
      setHasSources(response.data.length > 0);
    } catch (err) {
      console.error("Error checking sources:", err);
      setHasSources(false);
    }
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await getChatMessages(notebookId);
      setMessages(response.data.reverse());
      setError(null);
    } catch (err) {
      console.error("Error fetching messages:", err);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!query.trim() || sending || !hasSources) return;

    try {
      setSending(true);
      const response = await sendChatMessage({ notebookId, query });
      setMessages([...messages, { user: query }, { bot: response.data.reply }]);
      setQuery("");
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || null);
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
    <div className="card p-3 h-100">
      <h5>Chat</h5>
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      <div className="chat-box" style={{ height: "calc(100% - 150px)", overflowY: "auto" }}>
        {!hasSources ? (
          <div className="text-center text-muted py-5">
            <i className="bi bi-chat-dots display-4 mb-3"></i>
            <p className="mb-0">Add sources to start the conversation</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted py-5">
            <i className="bi bi-chat-dots display-4 mb-3"></i>
            <p className="mb-0">Start a conversation with your sources</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`message mb-3 ${
                msg.user ? "text-end" : "text-start"
              }`}
            >
              <div
                className={`d-inline-block p-2 rounded ${
                  msg.user
                    ? "bg-primary text-white"
                    : "bg-light text-dark"
                }`}
                style={{ maxWidth: "80%" }}
              >
                {msg.user || msg.bot}
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
            placeholder={hasSources ? "Type your message..." : "Add sources to start chatting"}
            disabled={sending || !hasSources}
          />
          <button
            className="btn btn-primary"
            onClick={handleSendMessage}
            disabled={sending || !query.trim() || !hasSources}
          >
            {sending ? (
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            ) : null}
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
