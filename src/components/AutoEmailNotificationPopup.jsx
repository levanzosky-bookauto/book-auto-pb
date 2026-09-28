import React, { useState } from 'react';
import { Mail, Send, X, CheckCircle2, Copy, AlertTriangle, Sparkles, ShieldCheck } from 'lucide-react';
import { sendTestEmailMailto, copyEmailReportToClipboard, getAdminEmail, sendBackgroundEmailJS } from '../utils/emailAlerts';

export default function AutoEmailNotificationPopup({ 
  alerts = [], 
  onClose,
  onOpenAdminModal 
}) {
  const [copiedMsg, setCopiedMsg] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [isSending, setIsSending] = useState(false);
  const adminEmail = getAdminEmail();

  const handleSendEmail = async () => {
    setIsSending(true);
    setStatusMsg('Invio email in corso...');

    const res = await sendBackgroundEmailJS(adminEmail);
    setIsSending(false);

    if (res && res.success) {
      setStatusMsg(`🟢 Email inviata con successo in sottofondo a "${adminEmail}"! Senza aprire l'App Mail.`);
    } else {
      setStatusMsg(`⚠️ ${res?.reason || 'EmailJS non configurato'}. Apertura App Mail di sistema in corso...`);
      sendTestEmailMailto(adminEmail);
    }
    setTimeout(() => setStatusMsg(''), 8000);
  };

  const handleCopyText = () => {
    const ok = copyEmailReportToClipboard(adminEmail);
    if (ok) {
      setCopiedMsg('Report scadenze copiato negli appunti! Incollalo su Gmail/Libero.');
      setTimeout(() => setCopiedMsg(''), 4000);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[90] max-w-md w-full p-1 animate-slide-up">
      <div className="bg-slate-900/95 backdrop-blur-xl border-2 border-amber-500/80 text-slate-100 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
        
        {/* Top Glow bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-amber-400 to-amber-500" />

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-400 rounded-xl transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title */}
        <div className="flex items-center space-x-3 mb-3">
          <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/40 animate-pulse">
            <Mail className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base flex items-center space-x-1.5">
              <span>Avviso Automatico Scadenze!</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Scadenza imminente rilevata per la tua flotta
            </p>
          </div>
        </div>

        {/* Alert details */}
        <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 text-xs space-y-1.5 mb-4">
          <div className="flex items-center justify-between text-slate-300">
            <span>Destinatario Email:</span>
            <strong className="text-amber-400 font-mono text-[11px]">{adminEmail || 'non configurata'}</strong>
          </div>

          <div className="flex items-center justify-between text-slate-300">
            <span>Avvisi Scadenza Attivi:</span>
            <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-full font-bold text-[11px]">
              {alerts.length} scadenze
            </span>
          </div>

          {alerts.length > 0 && (
            <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
              Prima scadenza: <strong className="text-slate-200">{alerts[0].carBrand} {alerts[0].carModel}</strong> ({alerts[0].title} - {alerts[0].dateValue})
            </p>
          )}
        </div>

        {statusMsg && (
          <div className="mb-3 p-2 bg-slate-800 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-semibold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {copiedMsg && (
          <div className="mb-3 p-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-semibold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{copiedMsg}</span>
          </div>
        )}

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleSendEmail}
            disabled={isSending}
            className="py-2.5 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold rounded-xl flex items-center justify-center space-x-1.5 text-xs shadow-lg transition-all active:scale-95 disabled:opacity-50"
          >
            <Send className={`w-3.5 h-3.5 ${isSending ? 'animate-spin' : ''}`} />
            <span>{isSending ? 'Invio...' : '✉️ Invia Email'}</span>
          </button>

          <button
            onClick={handleCopyText}
            className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl flex items-center justify-center space-x-1.5 text-xs border border-slate-700 transition-all active:scale-95"
          >
            <Copy className="w-3.5 h-3.5 text-amber-400" />
            <span>📋 Copia Report</span>
          </button>
        </div>

        <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
          <span>Modifica email o invio automatico background:</span>
          <button
            onClick={() => { onClose(); onOpenAdminModal(); }}
            className="text-amber-400 hover:underline font-bold"
          >
            Pannello Admin →
          </button>
        </div>

      </div>
    </div>
  );
}
