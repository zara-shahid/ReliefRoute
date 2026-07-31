import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { Bot, Send, User, Sparkles, MessageSquare, HelpCircle } from 'lucide-react';

interface DispatchChatProps {
  chatHistory: ChatMessage[];
  onSendMessage: (question: string) => void;
  isSending: boolean;
}

const SAMPLE_QUESTIONS = [
  'Why was Vehicle 1 routed to Sector 4 Clinic first?',
  'What is the total remaining cargo capacity across the fleet?',
  'How much faster is the OR solver compared to nearest-neighbor?',
  'Why did Site 5 receive mobile power generators?',
];

export const DispatchChat: React.FC<DispatchChatProps> = ({
  chatHistory,
  onSendMessage,
  isSending,
}) => {
  const [inputText, setInputText] = useState<string>('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleQuickQuestion = (q: string) => {
    if (isSending) return;
    onSendMessage(q);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col h-[580px]">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Dispatch Officer AI Assistant</h3>
            <p className="text-xs text-slate-400">Ask questions regarding routing solver decisions & driver constraints</p>
          </div>
        </div>
        <span className="px-2 py-0.5 text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full">
          Gemini 3.6
        </span>
      </div>

      {/* Suggested Questions Pills */}
      <div className="py-2.5 border-b border-slate-800/80 shrink-0">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center space-x-1">
          <HelpCircle className="w-3 h-3 text-purple-400" />
          <span>Quick Dispatch Inquiries</span>
        </span>
        <div className="flex flex-wrap gap-1.5">
          {SAMPLE_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleQuickQuestion(q)}
              disabled={isSending}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors text-left truncate max-w-[220px] cursor-pointer disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Scroll Window */}
      <div className="flex-1 overflow-y-auto py-3 space-y-3 scrollbar-thin scrollbar-thumb-slate-800 pr-1">
        {chatHistory.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <MessageSquare className="w-8 h-8 text-slate-700 mb-2" />
            <p className="text-xs font-semibold text-slate-400">No dispatch conversation yet</p>
            <p className="text-[11px] text-slate-600 mt-1 max-w-xs">
              Type a question or click one of the suggested prompts above to ask why the solver prioritized certain sites or vehicles.
            </p>
          </div>
        ) : (
          chatHistory.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex items-start space-x-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`p-3 rounded-2xl max-w-[82%] text-xs leading-relaxed ${
                    isUser
                      ? 'bg-rose-600 text-white rounded-tr-none shadow-md'
                      : 'bg-slate-950 text-slate-200 border border-slate-800 rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  <span className="text-[9px] opacity-60 mt-1 block text-right">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-lg bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-300 shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Box Form */}
      <form onSubmit={handleSubmit} className="pt-2 border-t border-slate-800 shrink-0 flex items-center space-x-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask Dispatch Officer (e.g. 'Why was Site 1 given top priority?')..."
          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isSending}
          className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-md shadow-purple-900/30 transition-all cursor-pointer disabled:opacity-50 flex items-center space-x-1"
        >
          <Send className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Ask</span>
        </button>
      </form>

    </div>
  );
};
