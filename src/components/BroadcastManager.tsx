import React, { useState } from 'react';
import { BroadcastCampaign, TelegramBot } from '../types';
import {
  Send,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  Flame,
  Radio,
  FileText
} from 'lucide-react';

interface BroadcastManagerProps {
  bot: TelegramBot;
  broadcasts: BroadcastCampaign[];
  onSendBroadcast: (campaign: BroadcastCampaign) => void;
}

export const BroadcastManager: React.FC<BroadcastManagerProps> = ({
  bot,
  broadcasts,
  onSendBroadcast,
}) => {
  const [title, setTitle] = useState('');
  const [messageText, setMessageText] = useState('');
  const [buttonText, setButtonText] = useState('');
  const [buttonUrl, setButtonUrl] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  const botCampaigns = broadcasts.filter((b) => b.botId === bot.id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !messageText.trim()) return;

    setIsSending(true);

    setTimeout(() => {
      const newCampaign: BroadcastCampaign = {
        id: `bc-${Date.now()}`,
        botId: bot.id,
        title,
        messageText,
        buttonText: buttonText.trim() ? buttonText : undefined,
        buttonUrl: buttonUrl.trim() ? buttonUrl : undefined,
        sentCount: bot.subscribersCount,
        deliveredPercent: 99.4,
        status: 'sent',
        sentAt: new Date().toISOString(),
      };

      onSendBroadcast(newCampaign);
      setIsSending(false);
      setSendSuccess(true);
      setTitle('');
      setMessageText('');
      setButtonText('');
      setButtonUrl('');

      setTimeout(() => setSendSuccess(false), 4000);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Send className="h-5 w-5 text-cyan-400" />
            <span>Subscriber Broadcast & Marketing Engine</span>
          </h2>
          <p className="text-xs text-slate-400">
            Dispatch mass marketing announcements, discount vouchers, and direct CTA buttons to {bot.subscribersCount.toLocaleString()} bot subscribers
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-300">
          <Users className="h-4 w-4 text-cyan-400" />
          <span>Active Audience: <strong>{bot.subscribersCount.toLocaleString()}</strong></span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Composer Form */}
        <div className="space-y-4 lg:col-span-2">
          <form onSubmit={handleSubmit} className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <FileText className="h-4 w-4 text-cyan-400" />
              <span>Compose Telegram Announcement</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Campaign Internal Title
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Black Friday 40% Off Flash Drop"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Message Content (Markdown Supported)
              </label>
              <textarea
                rows={5}
                required
                placeholder="Write your broadcast copy. Supports bold *text*, italic _text_, and emojis..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {/* Optional Call to Action Button */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Inline Button Text (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 🛍 Claim Voucher Now"
                  value={buttonText}
                  onChange={(e) => setButtonText(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Inline Button Destination URL
                </label>
                <input
                  type="url"
                  placeholder="https://t.me/KeyVaultSales_bot?start=blackfriday"
                  value={buttonUrl}
                  onChange={(e) => setButtonUrl(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-800 pt-4">
              <div className="text-xs text-slate-400">
                Rate limit: ~30 msg/sec automatic pacing to comply with Telegram API
              </div>

              <button
                type="submit"
                disabled={isSending}
                className="flex items-center gap-2 rounded-lg bg-cyan-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-cyan-500 shadow-md shadow-cyan-600/20 active:scale-95 disabled:opacity-50"
              >
                {isSending ? (
                  <>
                    <Radio className="h-4 w-4 animate-spin" />
                    <span>Broadcasting to Queue...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Send Broadcast Now</span>
                  </>
                )}
              </button>
            </div>

            {sendSuccess && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-xs text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  Broadcast queued and successfully sent to {bot.subscribersCount.toLocaleString()} subscribers!
                </span>
              </div>
            )}
          </form>

          {/* Past Broadcast Campaigns */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">Broadcast History & Reach</h3>

            <div className="space-y-3">
              {botCampaigns.length === 0 ? (
                <p className="text-xs text-slate-500">No campaigns launched yet for this bot.</p>
              ) : (
                botCampaigns.map((camp) => (
                  <div
                    key={camp.id}
                    className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-200">{camp.title}</div>
                      <div className="text-slate-400 text-[11px] line-clamp-1 mt-0.5">
                        {camp.messageText}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        Dispatched {new Date(camp.sentAt).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <div className="font-bold text-slate-200">
                          {camp.sentCount.toLocaleString()} users
                        </div>
                        <div className="text-[10px] text-emerald-400">
                          {camp.deliveredPercent}% delivered
                        </div>
                      </div>
                      <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                        Completed
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Live Telegram Preview */}
        <div className="lg:col-span-1 space-y-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Telegram Chat Mobile Preview
            </h3>

            <div className="rounded-2xl border border-slate-800 bg-[#0e1621] p-3 text-xs shadow-inner">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800/60">
                <div className="h-6 w-6 rounded-full bg-cyan-600 flex items-center justify-center text-[10px] font-bold text-white">
                  {bot.name.substring(0, 1)}
                </div>
                <div>
                  <div className="text-[11px] font-bold text-white">{bot.name}</div>
                  <div className="text-[9px] text-slate-500">Channel Broadcast</div>
                </div>
              </div>

              {/* Message Bubble */}
              <div className="rounded-xl bg-[#182533] p-3 text-slate-200 border border-slate-700/50 space-y-2">
                <p className="whitespace-pre-line text-[11px] leading-relaxed">
                  {messageText.trim()
                    ? messageText
                    : 'Your broadcast message preview will appear here in real-time...'}
                </p>
                <div className="text-right text-[9px] text-slate-500">12:00 PM</div>
              </div>

              {/* Button Preview */}
              {buttonText.trim() && (
                <div className="mt-2">
                  <div className="rounded-xl bg-[#2b5278] py-2 text-center text-xs font-semibold text-white shadow">
                    {buttonText}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
