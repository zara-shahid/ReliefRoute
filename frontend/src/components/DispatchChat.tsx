"use client";

import { useState, useRef, useEffect } from 'react';
import { sendDispatchChat } from '@/lib/api';
import { Send, Loader2, Bot, Satellite } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date | null;
}

export default function DispatchChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'ReliefRoute Command AI online. Ask me about active sites, vehicle routes, urgency priorities, or resource allocations.',
      isUser: false,
      timestamp: null
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  };

  useEffect(() => { scrollToBottom(); }, [messages, isLoading]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), text, isUser: true, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await sendDispatchChat(text);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: responseText,
        isUser: false,
        timestamp: new Date()
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        text: 'Unable to reach dispatch system. Check backend connection.',
        isUser: false,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (d: Date | null) => {
    if (!d || !mounted) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', background: 'rgba(13,21,41,0.7)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', border: '1px solid rgba(99,179,237,0.15)', borderRadius: 16, overflow: 'hidden' }}>
      
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(99,179,237,0.1)', background: 'rgba(5,9,23,0.5)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #2563eb, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(6,182,212,0.4)' }}>
            <Satellite size={18} color="white" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#e2eeff' }}>Dispatch AI</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'block', boxShadow: '0 0 6px #10b981' }} />
              <p style={{ margin: 0, fontSize: 10, fontWeight: 500, color: '#10b981' }}>COMMAND ONLINE</p>
            </div>
          </div>
          <div style={{ fontSize: 10, color: '#3d5a7a', fontWeight: 600, textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            AI GROUNDED<br />TO LIVE DATA
          </div>
        </div>
      </div>

      {/* Suggested prompts */}
      {messages.length <= 1 && (
        <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(99,179,237,0.07)', display: 'flex', flexWrap: 'wrap', gap: 6, flexShrink: 0 }}>
          {['Highest urgency site?', 'Route overview?', 'Total fleet distance?'].map(prompt => (
            <button
              key={prompt}
              onClick={() => { setInput(prompt); }}
              style={{ fontSize: 11, padding: '4px 10px', borderRadius: 99, border: '1px solid rgba(99,179,237,0.2)', background: 'rgba(59,130,246,0.08)', color: '#93c5fd', cursor: 'pointer', fontWeight: 500, fontFamily: 'Inter, sans-serif', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.2)'; e.currentTarget.style.borderColor = 'rgba(99,179,237,0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.08)'; e.currentTarget.style.borderColor = 'rgba(99,179,237,0.2)'; }}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div ref={containerRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{ display: 'flex', justifyContent: msg.isUser ? 'flex-end' : 'flex-start' }}>
            {!msg.isUser && (
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #1d4ed8, #0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 8, marginTop: 2 }}>
                <Bot size={14} color="white" />
              </div>
            )}
            <div style={{ maxWidth: '78%' }}>
              <div style={{
                padding: '10px 14px',
                borderRadius: msg.isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                background: msg.isUser
                  ? 'linear-gradient(135deg, #2563eb, #1d4ed8)'
                  : 'rgba(255,255,255,0.05)',
                border: msg.isUser ? 'none' : '1px solid rgba(99,179,237,0.1)',
                fontSize: 13,
                lineHeight: 1.55,
                color: msg.isUser ? '#fff' : '#c8deff',
                boxShadow: msg.isUser ? '0 4px 20px rgba(37,99,235,0.4)' : '0 2px 12px rgba(0,0,0,0.3)'
              }}>
                {msg.text}
              </div>
              <p style={{ margin: '3px 4px 0', fontSize: 10, color: '#2d4a6a', fontWeight: 500 }}>
                {formatTime(msg.timestamp)}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #1d4ed8, #0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Bot size={14} color="white" />
            </div>
            <div style={{ padding: '12px 16px', borderRadius: '14px 14px 14px 4px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,179,237,0.1)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Loader2 size={14} color="#60a5fa" style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 13, color: '#7ca7d8' }}>Analyzing routes...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ padding: '12px', borderTop: '1px solid rgba(99,179,237,0.1)', background: 'rgba(5,9,23,0.4)', flexShrink: 0 }}>
        <form onSubmit={handleSend} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about routes, sites, urgency..."
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(99,179,237,0.15)',
              borderRadius: 12,
              padding: '10px 14px',
              fontSize: 13,
              color: '#e2eeff',
              outline: 'none',
              fontFamily: 'Inter, sans-serif',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(99,179,237,0.5)'}
            onBlur={e => e.target.style.borderColor = 'rgba(99,179,237,0.15)'}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            style={{
              width: 40, height: 40,
              borderRadius: 12,
              background: input.trim() && !isLoading ? 'linear-gradient(135deg, #2563eb, #0891b2)' : 'rgba(255,255,255,0.06)',
              border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: input.trim() && !isLoading ? 'pointer' : 'default',
              transition: 'all 0.2s',
              boxShadow: input.trim() && !isLoading ? '0 4px 16px rgba(37,99,235,0.5)' : 'none',
              flexShrink: 0
            }}
          >
            <Send size={16} color={input.trim() && !isLoading ? 'white' : '#3d5a7a'} />
          </button>
        </form>
      </div>
    </div>
  );
}
