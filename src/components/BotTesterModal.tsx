import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Bot,
  User,
  Sparkles,
  ShoppingBag,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { TelegramBot } from '../types';
import { api } from '../api';

interface BotTesterModalProps {
  isOpen: boolean;
  onClose: () => void;
  bot: TelegramBot | null;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  keyboard?: Array<Array<{ text: string; callback_data?: string; url?: string }>>;
  timestamp: string;
}

export const BotTesterModal: React.FC<BotTesterModalProps> = ({ isOpen, onClose, bot }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && bot) {
      // Start with /start simulation
      handleSendMessage('/start');
    } else {
      setMessages([]);
    }
  }, [isOpen, bot?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen || !bot) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend !== undefined ? textToSend : inputText.trim();
    if (!text && !textToSend) return;

    if (!textToSend) setInputText('');

    // Add user message
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await api.simulateBot(bot.id, {
        text,
        customer_name: 'Alex Rivera'
      });

      if (res.result) {
        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: res.result.responseText || '🤖 No message returned.',
          keyboard: res.result.keyboard,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, botMsg]);
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'bot',
          text: `⚠️ Error: ${err.message || 'Bot server failed to reply'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleButtonClick = async (btn: { text: string; callback_data?: string; url?: string }) => {
    if (btn.url) {
      window.open(btn.url, '_blank');
      return;
    }

    if (!btn.callback_data) return;

    // Display button action in chat
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: `[Selected: ${btn.text}]`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await api.simulateBot(bot.id, {
        callback_data: btn.callback_data,
        customer_name: 'Alex Rivera'
      });

      if (res.result) {
        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: res.result.responseText || 'Done.',
          keyboard: res.result.keyboard,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, botMsg]);
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'bot',
          text: `⚠️ Error: ${err.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const resetChat = () => {
    setMessages([]);
    handleSendMessage('/start');
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl w-full max-w-xl h-[85vh] max-h-[750px] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Telegram Header */}
        <div className="px-4 py-3 bg-[#1e293b] border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h3 className="text-sm font-bold text-white">{bot.first_name}</h3>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-400 font-semibold">BOT</span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">@{bot.username} • Live Tester</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={resetChat}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Restart Conversation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Telegram Chat Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0b0f19] bg-opacity-95">
          <div className="text-center my-2">
            <span className="text-[11px] font-medium px-3 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700/60">
              Interactive Telegram Client Simulator
            </span>
          </div>

          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-3.5 text-xs shadow-md ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-sm'
                    : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-sm'
                }`}
              >
                <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
                <div
                  className={`text-[10px] mt-1.5 text-right ${
                    msg.sender === 'user' ? 'text-cyan-200' : 'text-slate-500'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>

              {/* Inline Keyboards */}
              {msg.keyboard && msg.keyboard.length > 0 && (
                <div className="w-full max-w-[85%] mt-2 space-y-1.5">
                  {msg.keyboard.map((row, rIdx) => (
                    <div key={rIdx} className="grid grid-flow-col gap-1.5 auto-cols-fr">
                      {row.map((btn, cIdx) => (
                        <button
                          key={cIdx}
                          onClick={() => handleButtonClick(btn)}
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 text-xs font-semibold text-cyan-300 text-center transition-all shadow-sm flex items-center justify-center space-x-1"
                        >
                          <span>{btn.text}</span>
                          {btn.url && <ExternalLink className="w-2.5 h-2.5 opacity-60" />}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center space-x-2 text-slate-500 text-xs italic">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce"></div>
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce delay-100"></div>
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce delay-200"></div>
              <span>Bot is typing...</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Chat Input Bar */}
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-3 bg-[#1e293b] border-t border-slate-700 flex items-center space-x-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Type a command or message (e.g. /start, /products, /balance)..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || loading}
            className="p-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
