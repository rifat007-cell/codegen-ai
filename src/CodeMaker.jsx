import React, { useState, useRef, useEffect } from 'react';

import { Menu, Plus, MessageSquare, Trash2, Edit3, Check, X } from 'lucide-react';
import { useCart } from "./Contexts"

const AICodeGenerator = () => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [downloadUrl, setDownloadUrl] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
    const [chatHistory, setChatHistory] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const [currentChatId, setCurrentChatId] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [editingTitle, setEditingTitle] = useState('');
    const [formData, setFormData] = useState({
        language: 'go',
        template: 'go-gin',
        basePackage: 'github.com/user/app',
        workerCount: 4,
        model: 'o3-mini',
        prompt: '',
        projectName: ''
    });
    const { user } = useCart()

    const { id } = user;

    const consoleRef = useRef(null);
    const websocketRef = useRef(null);

    // Fetch user's code generation history
    const fetchUserHistory = async () => {
        try {
            setIsLoadingHistory(true);
            const response = await fetch(`https://codegen-ai-2.onrender.com/api/history?user_id=${id}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Transform the data to match the expected format
            const transformedHistory = data.map(item => ({
                id: item.id,
                title: item.projectname || (item.prompt.slice(0, 50) + (item.prompt.length > 50 ? '...' : '')),
                timestamp: formatTimestamp(item.id), // You can improve this by adding created_at to your DB
                prompt: item.prompt,
                language: item.language,
                template: item.template,
                basePackage: item.basepackage,
                workers: item.workers,
                model: item.model,
                projectName: item.projectname
            }));

            setChatHistory(transformedHistory);
        } catch (error) {
            console.error('Error fetching user history:', error);
            setChatHistory([]);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    // Simple timestamp formatter (you should improve this)
    const formatTimestamp = (id) => {
        const now = new Date();
        const daysDiff = Math.floor(Math.random() * 30); // Random for demo - add created_at to your database
        if (daysDiff === 0) return 'Today';
        if (daysDiff === 1) return '1 day ago';
        if (daysDiff < 7) return `${daysDiff} days ago`;
        if (daysDiff < 30) return `${Math.floor(daysDiff / 7)} week${Math.floor(daysDiff / 7) > 1 ? 's' : ''} ago`;
        return `${Math.floor(daysDiff / 30)} month${Math.floor(daysDiff / 30) > 1 ? 's' : ''} ago`;
    };

    // Load user history on component mount
    useEffect(() => {
        if (id) {
            fetchUserHistory();
        }
    }, [id]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const log = (type, message) => {
        if (consoleRef.current) {
            const p = document.createElement('p');
            p.className = type;
            p.textContent = message;
            consoleRef.current.appendChild(p);
            consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
        }
    };

    const startNewChat = () => {
        setCurrentChatId(null);
        setShowResults(false);
        setFormData({
            language: 'go',
            template: 'go-gin',
            basePackage: 'github.com/user/app',
            workerCount: 4,
            model: 'o3-mini',
            prompt: '',
            projectName: ''
        });
        if (consoleRef.current) {
            consoleRef.current.innerHTML = '';
        }
    };

    const loadChat = (chat) => {
        setCurrentChatId(chat.id);
        setFormData({
            language: chat.language || 'go',
            template: chat.template || 'go-gin',
            basePackage: chat.basePackage || 'github.com/user/app',
            workerCount: chat.workers || 4,
            model: chat.model || 'o3-mini',
            prompt: chat.prompt,
            projectName: chat.projectName || ''
        });
        // Close sidebar on mobile after selecting chat
        if (window.innerWidth <= 768) {
            setSidebarOpen(false);
        }
    };

    const deleteChat = (chatId) => {
        setChatHistory(prev => prev.filter(chat => chat.id !== chatId));
        if (currentChatId === chatId) {
            startNewChat();
        }
    };

    const startEditing = (chat) => {
        setEditingId(chat.id);
        setEditingTitle(chat.title);
    };

    const saveEdit = () => {
        setChatHistory(prev => prev.map(chat =>
            chat.id === editingId ? { ...chat, title: editingTitle } : chat
        ));
        setEditingId(null);
        setEditingTitle('');
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditingTitle('');
    };

    const startGeneration = () => {
        setShowResults(true);
        setIsGenerating(true);
        setDownloadUrl('');

        // Save current generation as new chat if it's a new one
        if (!currentChatId && formData.prompt.trim()) {
            const newChat = {
                id: Date.now(),
                title: formData.prompt.slice(0, 50) + (formData.prompt.length > 50 ? '...' : ''),
                timestamp: 'Now',
                prompt: formData.prompt
            };
            setChatHistory(prev => [newChat, ...prev]);
            setCurrentChatId(newChat.id);
        }

        if (consoleRef.current) {
            consoleRef.current.innerHTML = '';
        }

        // Connect to WebSocket
        websocketRef.current = new WebSocket(`wss://codegen-ai-2.onrender.com/api/generate`);

        websocketRef.current.onopen = () => {
            websocketRef.current.send(JSON.stringify({
                id: id,
                ...formData,
                workerCount: parseInt(formData.workerCount),
                projectName: formData.projectName || `${formData.language}-project`
            }));

            log('info', 'Connected to server. Starting code generation...');
        };

        websocketRef.current.onmessage = (event) => {
            const data = JSON.parse(event.data);

            switch (data.type) {
                case 'start':
                    log('info', data.message);
                    break;
                case 'file':
                    log('info', `Writing file: ${data.file}`);
                    break;
                case 'error':
                    log('error', `Error: ${data.error}`);
                    setIsGenerating(false);
                    break;
                case 'complete':
                    log('success', data.message);
                    setDownloadUrl(data.zipUrl);
                    setIsGenerating(false);
                    // Refresh history after successful generation
                    fetchUserHistory();
                    break;
            }
        };

        websocketRef.current.onerror = (error) => {
            log('error', `WebSocket error: ${error}`);
            setIsGenerating(false);
        };

        websocketRef.current.onclose = () => {
            log('info', 'Connection closed');
        };
    };

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 768 && !sidebarOpen) {
                setSidebarOpen(true);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            if (websocketRef.current) {
                websocketRef.current.close();
            }
        };
    }, [sidebarOpen]);

    return (
        <>
            <style jsx>{`
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                    font-family: "Fira Code", monospace;
                }

                body {
                    background: #0a0a0a;
                    color: #eaeaea;
                    line-height: 1.6;
                }

                .app-container {
                    display: flex;
                    height: 100vh;
                    background: #0a0a0a;
                    color: #eaeaea;
                }

                /* Sidebar Styles */
                .sidebar {
                    width: ${sidebarOpen ? '320px' : '0'};
                    background: #0d0d0d;
                    border-right: 1px solid #222;
                    display: flex;
                    flex-direction: column;
                    transition: width 0.3s ease;
                    overflow: hidden;
                    position: relative;
                }

                .sidebar-header {
                    padding: 1rem;
                    border-bottom: 1px solid #222;
                }

                .new-chat-btn {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.75rem;
                    background: #111;
                    color: #eaeaea;
                    border: 1px solid #333;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-family: "Fira Code", monospace;
                    font-size: 0.9rem;
                }

                .new-chat-btn:hover {
                    background: #1a1a1a;
                    border-color: #00ffe7;
                }

                .chat-history {
                    flex: 1;
                    overflow-y: auto;
                    padding: 1rem;
                }

                .chat-history h3 {
                    font-size: 0.8rem;
                    color: #00ffe7;
                    margin-bottom: 0.75rem;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .chat-item {
                    position: relative;
                    padding: 0.75rem;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    margin-bottom: 0.5rem;
                    border: 1px solid transparent;
                }

                .chat-item:hover {
                    background: #111;
                    border-color: #333;
                }

                .chat-item.active {
                    background: #111;
                    border-color: #00ffe7;
                    box-shadow: 0 0 8px rgba(0, 255, 231, 0.2);
                }

                .chat-content {
                    display: flex;
                    align-items: flex-start;
                    gap: 0.5rem;
                }

                .chat-icon {
                    color: #00ffe7;
                    flex-shrink: 0;
                    margin-top: 0.1rem;
                }

                .chat-details {
                    flex: 1;
                    min-width: 0;
                }

                .chat-title {
                    font-size: 0.85rem;
                    font-weight: 500;
                    color: #eaeaea;
                    margin-bottom: 0.25rem;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .chat-timestamp {
                    font-size: 0.7rem;
                    color: #777;
                }

                .chat-actions {
                    position: absolute;
                    right: 0.5rem;
                    top: 0.5rem;
                    display: flex;
                    gap: 0.25rem;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }

                .chat-item:hover .chat-actions {
                    opacity: 1;
                }

                .chat-action-btn {
                    padding: 0.25rem;
                    background: none;
                    border: none;
                    color: #777;
                    cursor: pointer;
                    border-radius: 3px;
                    transition: all 0.3s ease;
                }

                .chat-action-btn:hover {
                    color: #eaeaea;
                    background: #333;
                }

                .chat-action-btn.delete:hover {
                    color: #ff4d4f;
                }

                .edit-input {
                    background: #1a1a1a;
                    border: 1px solid #00ffe7;
                    border-radius: 4px;
                    padding: 0.25rem 0.5rem;
                    color: #eaeaea;
                    font-size: 0.85rem;
                    width: 100%;
                    font-family: "Fira Code", monospace;
                }

                .edit-actions {
                    display: flex;
                    gap: 0.25rem;
                    margin-top: 0.5rem;
                }

                /* Main Content */
                .main-content {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }

                .main-header {
                    background: #0d0d0d;
                    border-bottom: 1px solid #222;
                    padding: 1rem 1.5rem;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .menu-toggle {
                    background: none;
                    border: none;
                    color: #eaeaea;
                    cursor: pointer;
                    padding: 0.5rem;
                    border-radius: 4px;
                    transition: all 0.3s ease;
                }

                .menu-toggle:hover {
                    background: #1a1a1a;
                    color: #00ffe7;
                }

                .header-content h1 {
                    font-size: 1.5rem;
                    color: #00ffe7;
                    text-shadow: 0 0 10px rgba(0, 255, 231, 0.5);
                    margin-bottom: 0.25rem;
                }

                .header-content p {
                    font-size: 0.9rem;
                    color: #bbb;
                }

                .main-scroll {
                    flex: 1;
                    overflow-y: auto;
                    padding: 2rem;
                }

                .form-container {
                    max-width: 1200px;
                    margin: 0 auto;
                }

                .generator-form {
                    background: #111;
                    border: 1px solid #222;
                    border-radius: 12px;
                    padding: 2rem;
                    margin-bottom: 2rem;
                    transition: all 0.3s ease;
                }

                .generator-form:hover {
                    border-color: #00ffe7;
                    box-shadow: 0 0 15px rgba(0, 255, 231, 0.3);
                }

                .form-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 1.5rem;
                    margin-bottom: 1.5rem;
                }

                .form-group {
                    display: flex;
                    flex-direction: column;
                }

                .form-label {
                    font-size: 0.9rem;
                    font-weight: bold;
                    color: #00ffe7;
                    margin-bottom: 0.5rem;
                }

                .form-input,
                .form-select,
                .form-textarea {
                    background: #0d0d0d;
                    border: 1px solid #333;
                    border-radius: 6px;
                    padding: 0.75rem;
                    color: #eaeaea;
                    font-family: "Fira Code", monospace;
                    transition: all 0.3s ease;
                    font-size: 0.9rem;
                }

                .form-input:focus,
                .form-select:focus,
                .form-textarea:focus {
                    outline: none;
                    border-color: #00ffe7;
                    box-shadow: 0 0 8px rgba(0, 255, 231, 0.4);
                }

                .form-textarea {
                    min-height: 120px;
                    resize: vertical;
                }

                .form-actions {
                    display: flex;
                    justify-content: flex-end;
                    margin-top: 1.5rem;
                }

                .generate-btn {
                    padding: 0.9rem 2rem;
                    font-size: 1rem;
                    font-weight: bold;
                    color: #0a0a0a;
                    background: #00ffe7;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-family: "Fira Code", monospace;
                }

                .generate-btn:hover:not(:disabled) {
                    background: #00ccb5;
                    transform: translateY(-3px);
                    box-shadow: 0 0 15px rgba(0, 255, 231, 0.6);
                }

                .generate-btn:disabled {
                    background: #333;
                    color: #777;
                    cursor: not-allowed;
                    transform: none;
                    box-shadow: none;
                }

                .results-section {
                    background: #111;
                    border: 1px solid #222;
                    border-radius: 12px;
                    padding: 2rem;
                    transition: all 0.3s ease;
                }

                .results-section:hover {
                    border-color: #00ffe7;
                    box-shadow: 0 0 15px rgba(0, 255, 231, 0.3);
                }

                .results-title {
                    font-size: 1.4rem;
                    margin-bottom: 1rem;
                    color: #00ffe7;
                }

                .console {
                    background-color: #1e1e1e;
                    color: #f1f1f1;
                    font-family: "Fira Code", monospace;
                    height: 300px;
                    overflow-y: auto;
                    padding: 1rem;
                    border-radius: 8px;
                    border: 1px solid #333;
                    margin-bottom: 1.5rem;
                    scrollbar-width: thin;
                    scrollbar-color: #333 #1e1e1e;
                }

                .console::-webkit-scrollbar {
                    width: 8px;
                }

                .console::-webkit-scrollbar-track {
                    background: #1e1e1e;
                }

                .console::-webkit-scrollbar-thumb {
                    background: #333;
                    border-radius: 4px;
                }

                .console p {
                    margin: 0;
                    line-height: 1.5;
                    font-size: 0.85rem;
                }

                .console .info {
                    color: #7dcfff;
                }

                .console .success {
                    color: #73d13d;
                }

                .console .error {
                    color: #ff4d4f;
                }

                .download-section {
                    text-align: center;
                }

                .download-btn {
                    display: inline-block;
                    padding: 0.9rem 2rem;
                    font-size: 1rem;
                    font-weight: bold;
                    color: #0a0a0a;
                    background: #73d13d;
                    border-radius: 6px;
                    text-decoration: none;
                    transition: all 0.3s ease;
                    font-family: "Fira Code", monospace;
                }

                .download-btn:hover {
                    background: #52c41a;
                    transform: translateY(-3px);
                    box-shadow: 0 0 15px rgba(115, 209, 61, 0.6);
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                /* Mobile Responsive Styles */
                @media (max-width: 768px) {
                    .sidebar {
                        position: fixed;
                        top: 0;
                        left: 0;
                        height: 100vh;
                        z-index: 1000;
                        width: ${sidebarOpen ? '280px' : '0'};
                        box-shadow: ${sidebarOpen ? '2px 0 10px rgba(0, 0, 0, 0.3)' : 'none'};
                    }

                    .main-content {
                        width: 100%;
                        margin-left: 0;
                    }

                    .main-scroll {
                        padding: 1rem;
                    }

                    .generator-form {
                        padding: 1.5rem;
                        margin-bottom: 1.5rem;
                    }

                    .form-grid {
                        grid-template-columns: 1fr;
                        gap: 1rem;
                    }

                    .form-actions {
                        justify-content: center;
                    }

                    .main-header {
                        padding: 1rem;
                    }

                    .header-content h1 {
                        font-size: 1.2rem;
                    }

                    .header-content p {
                        font-size: 0.8rem;
                    }

                    .console {
                        height: 250px;
                    }

                    .results-section {
                        padding: 1.5rem;
                    }
                }

                @media (max-width: 480px) {
                    .sidebar {
                        width: ${sidebarOpen ? '100vw' : '0'};
                    }

                    .main-scroll {
                        padding: 0.5rem;
                    }

                    .generator-form {
                        padding: 1rem;
                        margin-bottom: 1rem;
                    }

                    .results-section {
                        padding: 1rem;
                    }

                    .main-header {
                        padding: 0.75rem;
                    }

                    .header-content h1 {
                        font-size: 1.1rem;
                    }

                    .console {
                        height: 200px;
                    }

                    .chat-history {
                        padding: 0.75rem;
                    }

                    .sidebar-header {
                        padding: 0.75rem;
                    }
                }

                /* Overlay for mobile */
                .sidebar-overlay {
                    display: ${sidebarOpen && window.innerWidth <= 768 ? 'block' : 'none'};
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    background: rgba(0, 0, 0, 0.5);
                    z-index: 999;
                }
            `}</style>

            <div className="app-container">
                {/* Mobile Overlay */}
                <div
                    className="sidebar-overlay"
                    onClick={() => setSidebarOpen(false)}
                />

                {/* Sidebar */}
                <div className="sidebar">
                    <div className="sidebar-header">
                        <button className="new-chat-btn" onClick={startNewChat}>
                            <Plus size={18} />
                            <span>New Chat</span>
                        </button>
                    </div>

                    <div className="chat-history">
                        <h3>Recent Chats</h3>
                        {isLoadingHistory ? (
                            <div style={{ textAlign: 'center', color: '#777', padding: '2rem 0' }}>
                                <div style={{
                                    width: '24px',
                                    height: '24px',
                                    border: '2px solid #333',
                                    borderTop: '2px solid #00ffe7',
                                    borderRadius: '50%',
                                    margin: '0 auto 0.5rem',
                                    animation: 'spin 1s linear infinite'
                                }}></div>
                                Loading history...
                            </div>
                        ) : chatHistory.length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#777', padding: '2rem 0' }}>
                                <MessageSquare size={48} style={{ opacity: 0.5, margin: '0 auto 0.5rem', display: 'block' }} />
                                <p>No code generation history</p>
                                <p style={{ fontSize: '0.75rem' }}>Start generating code to see your projects here</p>
                            </div>
                        ) : (
                            chatHistory.map((chat) => (
                                <div
                                    key={chat.id}
                                    className={`chat-item ${currentChatId === chat.id ? 'active' : ''}`}
                                    onClick={() => loadChat(chat)}
                                >
                                    {editingId === chat.id ? (
                                        <div>
                                            <input
                                                type="text"
                                                value={editingTitle}
                                                onChange={(e) => setEditingTitle(e.target.value)}
                                                className="edit-input"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') saveEdit();
                                                    if (e.key === 'Escape') cancelEdit();
                                                }}
                                                autoFocus
                                            />
                                            <div className="edit-actions">
                                                <button onClick={saveEdit} className="chat-action-btn">
                                                    <Check size={12} />
                                                </button>
                                                <button onClick={cancelEdit} className="chat-action-btn">
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="chat-content">
                                                <MessageSquare size={16} className="chat-icon" />
                                                <div className="chat-details">
                                                    <div className="chat-title">{chat.title}</div>
                                                    <div className="chat-timestamp">{chat.timestamp}</div>
                                                    <div style={{ fontSize: '0.7rem', color: '#555', marginTop: '0.25rem' }}>
                                                        {chat.language} • {chat.template}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="chat-actions">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        startEditing(chat);
                                                    }}
                                                    className="chat-action-btn"
                                                >
                                                    <Edit3 size={12} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteChat(chat.id);
                                                    }}
                                                    className="chat-action-btn delete"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Main Content */}
                <div className="main-content">
                    <div className="main-header">
                        <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
                            <Menu size={20} />
                        </button>
                        <div className="header-content">
                            <h1>Maker - AI For Everyone</h1>
                            <p>Generate production-ready code with AI assistance</p>
                        </div>
                    </div>

                    <div className="main-scroll">
                        <div className="form-container">
                            <div className="generator-form">
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label className="form-label">Language</label>
                                        <select
                                            name="language"
                                            value={formData.language}
                                            onChange={handleInputChange}
                                            className="form-select"
                                        >
                                            <option value="go">Go</option>
                                            <option value="python">Python</option>
                                            <option value="javascript">JavaScript</option>
                                            <option value="java">Java</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Template</label>
                                        <select
                                            name="template"
                                            value={formData.template}
                                            onChange={handleInputChange}
                                            className="form-select"
                                        >
                                            <option value="go-gin">Go-Gin</option>
                                            <option value="java-spring">Java-Spring</option>
                                            <option value="js-express-api">JS-Express-API</option>
                                            <option value="python-flask">Python-Flask</option>
                                            <option value="python-django">Python-Django</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Base Package</label>
                                        <input
                                            type="text"
                                            name="basePackage"
                                            value={formData.basePackage}
                                            onChange={handleInputChange}
                                            className="form-input"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Workers</label>
                                        <input
                                            type="number"
                                            name="workerCount"
                                            value={formData.workerCount}
                                            onChange={handleInputChange}
                                            className="form-input"
                                            min="1"
                                            max="8"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Model</label>
                                        <select
                                            name="model"
                                            value={formData.model}
                                            onChange={handleInputChange}
                                            className="form-select"
                                        >
                                            <option value="o3-mini">o3-mini</option>
                                            <option value="gpt-4o-mini">GPT-4o Mini</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Project Name</label>
                                        <input
                                            type="text"
                                            name="projectName"
                                            value={formData.projectName}
                                            onChange={handleInputChange}
                                            className="form-input"
                                            placeholder="my-project"
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Prompt</label>
                                    <textarea
                                        name="prompt"
                                        value={formData.prompt}
                                        onChange={handleInputChange}
                                        className="form-textarea"
                                        placeholder="Describe the code you want to generate..."
                                    />
                                </div>

                                <div className="form-actions">
                                    <button
                                        onClick={startGeneration}
                                        disabled={isGenerating}
                                        className="generate-btn"
                                    >
                                        {isGenerating ? 'Generating...' : 'Generate Code'}
                                    </button>
                                </div>
                            </div>

                            {showResults && (
                                <div className="results-section">
                                    <h2 className="results-title">Generation Progress</h2>
                                    <div ref={consoleRef} className="console"></div>

                                    {downloadUrl && (
                                        <div className="download-section">
                                            <a href={downloadUrl} className="download-btn">
                                                Download Project
                                            </a>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AICodeGenerator;
