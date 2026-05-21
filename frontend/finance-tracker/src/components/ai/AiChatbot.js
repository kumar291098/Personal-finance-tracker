import React, { useRef, useState, useEffect } from 'react';
import { aiService } from '../../services/aiService';
import './AiChatbot.css';

/* ─── Icons ─── */
const IconDollar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

const IconX = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconChat = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const IconSend = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

/* ─── Helpers ─── */
const createId = () =>
  typeof window !== 'undefined' && window.crypto?.randomUUID
    ? window.crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

const WELCOME = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Hi there — I can help you understand your spending patterns, budgets, and recent transactions. What would you like to explore?',
};

const CHIPS = ['Budget status', 'Recent transactions', 'Where am I overspending?'];

/* ─── Component ─── */
const AiChatbot = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [chipsVisible, setChipsVisible] = useState(true);
  const inputRef = useRef(null);
  const bottomRef = useRef(null);

  /* scroll to bottom on new messages */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const toggleOpen = () => {
    setOpen(prev => {
      if (!prev) setTimeout(() => inputRef.current?.focus(), 80);
      return !prev;
    });
  };

  const sendMessage = async (text) => {
    const trimmed = (text ?? input).trim();
    if (!trimmed || loading) return;

    setChipsVisible(false);
    setMessages(prev => [...prev, { id: createId(), role: 'user', content: trimmed }]);
    setInput('');
    setLoading(true);

    try {
      const response = await aiService.sendMessage(trimmed, messages);
      setMessages(prev => [
        ...prev,
        {
          id: createId(),
          role: 'assistant',
          content: response.reply || 'I could not prepare a response.',
        },
      ]);
    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          id: createId(),
          role: 'assistant',
          content: error.message || 'Assistant is unavailable right now.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    sendMessage();
  };

  return (
    <div className="cb-root">
      {/* ── Panel ── */}
      {open && (
        <div className="cb-panel" role="dialog" aria-label="Finance assistant">
          {/* Header */}
          <div className="cb-header">
            <div className="cb-header-left">
              <div className="cb-avatar">
                <IconDollar />
              </div>
              <div>
                <p className="cb-title">Finance Assistant</p>
                <p className="cb-subtitle">budgets · savings · trends</p>
              </div>
            </div>
            <button
              className="cb-close"
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
            >
              <IconX size={14} />
            </button>
          </div>

          {/* Messages */}
          <div className="cb-messages">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={msg.role === 'user' ? 'cb-msg-user' : 'cb-msg-assistant'}
              >
                {msg.content}
              </div>
            ))}

            {loading && (
              <div className="cb-loading">
                <div className="cb-dots">
                  <span className="cb-dot" />
                  <span className="cb-dot" />
                  <span className="cb-dot" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick-reply chips */}
          {chipsVisible && (
            <div className="cb-suggestions">
              {CHIPS.map(chip => (
                <button
                  key={chip}
                  className="cb-chip"
                  onClick={() => sendMessage(chip)}
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Input form */}
          <form className="cb-form" onSubmit={onSubmit}>
            <input
              ref={inputRef}
              className="cb-input"
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about your finances…"
              disabled={loading}
              aria-label="Message input"
            />
            <button
              className="cb-send"
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send message"
            >
              <IconSend />
            </button>
          </form>
        </div>
      )}

      {/* ── Toggle button ── */}
      <button
        className="cb-toggle"
        onClick={toggleOpen}
        aria-label={open ? 'Close finance assistant' : 'Open finance assistant'}
      >
        {open ? <IconX size={22} /> : <IconChat />}
      </button>
    </div>
  );
};

export default AiChatbot;