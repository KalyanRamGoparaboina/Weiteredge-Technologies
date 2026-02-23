/**
 * AI SUPPORT ASSISTANT - FRONTEND
 * Built with React.js
 * Features: Session management, Markdown support, and real-time chat.
 */

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Send, MessageCircle, Trash, Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const API_BASE = 'http://localhost:5000/api';

function App() {
    const [messages, setMessages] = useState([]); // All messages in current chat
    const [input, setInput] = useState('');      // Current input value
    const [sessionId, setSessionId] = useState(''); // Current active session
    const [sessions, setSessions] = useState([]);   // List of all previous sessions
    const [loading, setLoading] = useState(false);  // Is AI thinking?

    const endOfMessagesRef = useRef(null); // To scroll chat to bottom

    // 1. On page load: Get or create a sessionId
    useEffect(() => {
        let id = localStorage.getItem('sessionId');
        if (!id) {
            id = uuidv4();
            localStorage.setItem('sessionId', id);
        }
        setSessionId(id);
        loadAllSessions(); // Load history sidebar
    }, []);

    // 2. Whenever sessionId changes, load that conversation
    useEffect(() => {
        if (sessionId) {
            loadMessages(sessionId);
        }
    }, [sessionId]);

    // 3. Auto-scroll to bottom
    useEffect(() => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    // --- ACTIONS ---

    const loadMessages = async (id) => {
        try {
            const res = await axios.get(`${API_BASE}/conversations/${id}`);
            setMessages(res.data);
        } catch (err) {
            console.error('Error loading chat:', err);
        }
    };

    const loadAllSessions = async () => {
        try {
            const res = await axios.get(`${API_BASE}/sessions`);
            setSessions(res.data);
        } catch (err) {
            console.error('Error loading sessions:', err);
        }
    };

    const startNewChat = () => {
        const newId = uuidv4();
        localStorage.setItem('sessionId', newId);
        setSessionId(newId);
        setMessages([]);
    };

    const deleteChat = async (e, id) => {
        e.stopPropagation(); // Don't switch to the chat we are deleting
        if (!window.confirm('Delete this conversation?')) return;
        try {
            await axios.delete(`${API_BASE}/sessions/${id}`);
            if (id === sessionId) startNewChat();
            loadAllSessions();
        } catch (err) {
            alert('Delete failed');
        }
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userText = input;
        setInput('');

        // Add user message to UI immediately
        const userMsg = { role: 'user', content: userText, created_at: new Date().toISOString() };
        setMessages(prev => [...prev, userMsg]);

        setLoading(true);

        try {
            // Call backend
            const res = await axios.post(`${API_BASE}/chat`, {
                sessionId,
                message: userText
            });

            // Add AI reply to UI
            const botMsg = {
                role: 'assistant',
                content: res.data.reply,
                created_at: new Date().toISOString()
            };
            setMessages(prev => [...prev, botMsg]);
            loadAllSessions(); // Update lastUpdated time in sidebar
        } catch (err) {
            console.error('Chat failed:', err);
            // Show error in chat
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "Sorry, I'm having trouble connecting. Is the backend server running?",
                created_at: new Date().toISOString()
            }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="app">
            {/* SIDEBAR: Session History */}
            <aside className="sidebar">
                <h2 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Bot size={22} color="#4f46e5" /> Support Bot
                </h2>

                <button className="new-chat-btn" onClick={startNewChat}>
                    <Plus size={18} /> New Chat
                </button>

                <div className="history-list">
                    <p style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '10px' }}>Recent Chats</p>
                    {sessions.map(s => (
                        <div
                            key={s.sessionId}
                            className={`session-tab ${s.sessionId === sessionId ? 'active' : ''}`}
                            onClick={() => setSessionId(s.sessionId)}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                                <MessageCircle size={16} />
                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '14px' }}>
                                    {s.sessionId.substring(0, 8)}
                                </span>
                            </div>
                            <button className="delete-btn" onClick={(e) => deleteChat(e, s.sessionId)}>
                                <Trash size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            </aside>

            {/* MAIN CHAT AREA */}
            <main className="chat-container">
                <header className="chat-header">
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Bot size={18} color="#4f46e5" />
                    </div>
                    <h3 style={{ fontSize: '16px' }}>AI Support Assistant</h3>
                </header>

                <div className="messages">
                    {messages.length === 0 && !loading && (
                        <div className="welcome-screen">
                            <Bot size={50} color="#cbd5e1" style={{ marginBottom: '15px' }} />
                            <h2 style={{ fontSize: '24px', marginBottom: '10px' }}>How can I help?</h2>
                            <p style={{ color: '#64748b' }}>Ask me about password resets, refunds, or your account.</p>
                        </div>
                    )}

                    {messages.map((m, i) => (
                        <div key={i} className={`message ${m.role === 'user' ? 'user' : 'bot'}`}>
                            <div className="message-content">
                                {m.role === 'assistant' ? (
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                                ) : (
                                    m.content
                                )}
                            </div>
                            <div className="message-meta">
                                {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div className="message bot">
                            <div className="typing">
                                <span></span><span></span><span></span>
                            </div>
                        </div>
                    )}
                    <div ref={endOfMessagesRef} />
                </div>

                <div className="input-area">
                    <form className="input-form" onSubmit={sendMessage}>
                        <input
                            type="text"
                            placeholder="Ask a question..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={loading}
                        />
                        <button className="send-button" disabled={loading || !input.trim()}>
                            <Send size={18} />
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
}

export default App;
