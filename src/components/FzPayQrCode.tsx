import React from 'react';
import { ShieldCheck, Copy, Check } from 'lucide-react';

interface FzPayQrCodeProps {
  upiUri: string;
  payeeName?: string;
  amount?: number;
  orderId?: string;
  size?: number;
  showDetails?: boolean;
}

export const FzPayQrCode: React.FC<FzPayQrCodeProps> = ({
  upiUri,
  payeeName = 'FZ PAYMENT BANK',
  amount,
  orderId,
  size = 220,
  showDetails = true
}) => {
  const [copied, setCopied] = React.useState(false);

  // Encode with High Error Correction (level H) so the center emblem doesn't affect scannability
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size * 2}x${size * 2}&data=${encodeURIComponent(
    upiUri
  )}&ecc=H&margin=2`;

  const handleCopy = () => {
    navigator.clipboard.writeText(upiUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center select-none">
      {/* Outer Premium Frame */}
      <div className="relative p-3.5 sm:p-4 rounded-3xl bg-gradient-to-b from-[#0f172a] via-[#070b14] to-[#030712] border-2 border-cyan-500/40 shadow-2xl shadow-cyan-500/20 group">
        {/* Subtle Corner Brackets for Fintech Scanner Aesthetic */}
        <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-cyan-400 rounded-tl-lg pointer-events-none" />
        <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-cyan-400 rounded-tr-lg pointer-events-none" />
        <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-cyan-400 rounded-bl-lg pointer-events-none" />
        <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-cyan-400 rounded-br-lg pointer-events-none" />

        {/* White Quiet-Zone Card Holding the Clean QR Code */}
        <div className="relative bg-white p-3 rounded-2xl shadow-inner flex items-center justify-center overflow-hidden">
          <img
            src={qrUrl}
            alt="FZ PAY Dynamic UPI QR"
            width={size}
            height={size}
            className="block rounded-lg"
            loading="eager"
          />

          {/* Central High-Contrast FZ PAY Center Badge */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-11 h-11 rounded-xl bg-[#070b14] border-2 border-cyan-400 shadow-xl flex items-center justify-center p-1.5">
              <img src="/favicon.svg" alt="FZ" className="w-full h-full object-contain" />
            </div>
          </div>
        </div>

        {/* Brand Banner Below QR */}
        <div className="mt-3 flex items-center justify-between text-xs px-1 font-mono">
          <div className="flex items-center space-x-1.5 text-cyan-400 font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="tracking-wider text-[11px]">FZ PAY NPCI UPI</span>
          </div>
          <span className="text-[10px] text-slate-400 font-semibold uppercase">VERIFIED</span>
        </div>
      </div>

      {showDetails && (
        <div className="mt-3 text-center space-y-1 max-w-xs">
          {amount !== undefined && (
            <div className="text-xl font-black font-mono text-cyan-400">
              ₹{amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          )}

          {payeeName && (
            <div className="text-xs text-slate-300 font-semibold truncate">
              Payee: <span className="text-white">{payeeName}</span>
            </div>
          )}

          {orderId && (
            <div className="text-[11px] text-slate-400 font-mono">
              Order ID: <span className="text-slate-200">{orderId}</span>
            </div>
          )}

          <button
            onClick={handleCopy}
            className="mt-2 text-[11px] text-slate-400 hover:text-cyan-400 flex items-center justify-center space-x-1 mx-auto transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied UPI Intent Link' : 'Copy UPI Link'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
