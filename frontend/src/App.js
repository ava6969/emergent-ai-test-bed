import { useState, useEffect } from "react";
import "@/App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch messages
  const fetchMessages = async () => {
    try {
      const response = await axios.get(`${API}/messages`);
      setMessages(response.data);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  // Submit new message
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setLoading(true);
    try {
      await axios.post(`${API}/messages`, { text: newMessage });
      setNewMessage("");
      await fetchMessages();
    } catch (error) {
      console.error("Error posting message:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  return (
    <div className="app-container">
      <div className="content-wrapper">
        <h1 className="title">Quick Messages</h1>
        
        {/* Input Form */}
        <form onSubmit={handleSubmit} className="message-form">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="message-input"
            disabled={loading}
            data-testid="message-input"
          />
          <button 
            type="submit" 
            className="submit-btn"
            disabled={loading || !newMessage.trim()}
            data-testid="submit-button"
          >
            {loading ? "Sending..." : "Send"}
          </button>
        </form>

        {/* Messages List */}
        <div className="messages-container">
          {messages.length === 0 ? (
            <p className="empty-state">No messages yet. Be the first to post!</p>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="message-card" data-testid="message-card">
                <p className="message-text">{msg.text}</p>
                <span className="message-time">
                  {new Date(msg.timestamp).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default App;