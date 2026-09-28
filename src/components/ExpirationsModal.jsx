import React, { useState } from 'react';
import { 
  X, 
  Bell, 
  AlertTriangle, 
  Calendar, 
  Wrench, 
  ShieldCheck, 
  Clock, 
  Edit3, 
  CheckCircle2, 
  Filter,
  Car
} from 'lucide-react';
import { getLogoForBrand } from '../utils/brandLogos';

import { sendTestEmailMailto, getAdminEmail } from '../utils/emailAlerts';
import { Send } from 'lucide-react';

export default function ExpirationsModal({ 
  alerts = [], 
  onClose, 
  onEditCar 
}) {
  const [filterLevel, setFilterLevel] = useState('all'); // 'all' | 'expired_urgent' | '1month' | '2months'
  const [testSentMsg, setTestSentMsg] = useState('');

  const expiredCount = alerts.filter(a => a.alertLevel === 'expired').length;
  const urgentCount = alerts.filter(a => a.alertLevel === 'urgent').length;
  const monthCount = alerts.filter(a => a.alertLevel === 'warning').length;
  const infoCount = alerts.filter(a => a.alertLevel === 'info').length;

  const filteredAlerts = alerts.filter(alert => {
    if (filterLevel === 'expired_urgent') {
      return alert.alertLevel === 'expired' || alert.alertLevel === 'urgent';
    }
    if (filterLevel === '1month') {
      return alert.alertLevel === 'warning';
    }
    if (filterLevel === '2months') {
      return alert.alertLevel === 'info';
    }
    return true;
  });

  const getIconForType = (typeKey) => {
    switch (typeKey) {
      case 'scadenzaBollo':
        return <Calendar className="w-4 h-4 text-amber-400" />;
      case 'scadenzaAssicurazione':
        return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
      case 'scadenzaRevisione':
        return <Clock className="w-4 h-4 text-cyan-400" />;
      case 'prossimoTagliandoData':
        return <Wrench className="w-4 h-4 text-amber-400" />;
      default:
        return <Calendar className="w-4 h-4 text-amber-400" />;
    }
  };

  const getBadgeStyle = (alertLevel) => {
    switch (alertLevel) {
      case 'expired':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse';
      case 'urgent':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'warning':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
      case 'info':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fade-in">
      
      {/* Modal Shell */}
      <div 
        className="glass-panel w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl border border-white/10 my-auto flex flex-col max-h-[90vh] bg-slate-900/95 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/90 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="relative p-2.5 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20">
              <Bell className="w-5 h-5 text-amber-400" />
              {alerts.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white font-extrabold text-[10px] rounded-full flex items-center justify-center border-2 border-slate-900">
                  {alerts.length}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold font-heading text-white flex items-center space-x-2">
                <span>Scadenze & Notifiche Vetture</span>
              </h2>
              <p className="text-xs text-slate-400">
                Avvisi automatici a 2 mesi, 1 mese e 1 settimana prima della scadenza
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-400 rounded-xl border border-slate-700 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Summary Counts Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-6 py-3 bg-slate-950/70 border-b border-white/5 text-xs font-semibold shrink-0">
          <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
            <span className="text-rose-400">Scaduti:</span>
            <span className="font-extrabold text-rose-300 text-sm">{expiredCount}</span>
          </div>
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
            <span className="text-amber-400">1 Settimana:</span>
            <span className="font-extrabold text-amber-300 text-sm">{urgentCount}</span>
          </div>
          <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-between">
            <span className="text-orange-400">1 Mese:</span>
            <span className="font-extrabold text-orange-300 text-sm">{monthCount}</span>
          </div>
          <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-between">
            <span className="text-sky-400">2 Mesi:</span>
            <span className="font-extrabold text-sky-300 text-sm">{infoCount}</span>
          </div>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/60 px-6 py-2 gap-2 text-xs font-semibold overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setFilterLevel('all')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              filterLevel === 'all'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            Tutte ({alerts.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterLevel('expired_urgent')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              filterLevel === 'expired_urgent'
                ? 'bg-rose-500 text-white font-bold shadow-md'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            Scadute / 1 Settimana ({expiredCount + urgentCount})
          </button>

          <button
            type="button"
            onClick={() => setFilterLevel('1month')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              filterLevel === '1month'
                ? 'bg-orange-500 text-slate-950 font-bold shadow-md'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            1 Mese ({monthCount})
          </button>

          <button
            type="button"
            onClick={() => setFilterLevel('2months')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              filterLevel === '2months'
                ? 'bg-sky-500 text-slate-950 font-bold shadow-md'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            2 Mesi ({infoCount})
          </button>
        </div>

        {/* Modal List Body */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-3 flex-1">
          {filteredAlerts.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto opacity-80" />
              <p className="text-base font-bold text-slate-200">
                Nessuna scadenza in questa categoria!
              </p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {alerts.length === 0
                  ? "Tutte le vetture hanno le scadenze in regola o non hanno ancora date inserite."
                  : "Cambia il filtro in alto per visualizzare le altre scadenze della flotta."}
              </p>
            </div>
          ) : (
            filteredAlerts.map(alert => {
              const carLogo = alert.carLogo || getLogoForBrand(alert.carBrand);

              return (
                <div 
                  key={alert.id}
                  className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg group"
                >
                  
                  {/* Left: Car Thumbnail & Brand/Model info */}
                  <div className="flex items-center space-x-4">
                    
                    {/* Car Image Preview */}
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shrink-0 relative">
                      {alert.carImage ? (
                        <img src={alert.carImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Car className="w-6 h-6 text-slate-600" />
                        </div>
                      )}
                      {carLogo && (
                        <div className="absolute bottom-0.5 right-0.5 w-5 h-5 rounded-md bg-white p-0.5 shadow">
                          <img src={carLogo} alt="" className="w-full h-full object-contain" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-100 text-sm">
                          {alert.carBrand} {alert.carModel}
                        </span>
                        {alert.carTarga && (
                          <span className="px-1.5 py-0.5 bg-slate-950 border border-slate-800 text-[10px] font-mono font-bold text-slate-300 rounded-md">
                            {alert.carTarga}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 text-xs text-slate-300">
                        <div className="flex items-center space-x-1.5 p-1 px-2 bg-slate-950 rounded-lg border border-slate-800">
                          {getIconForType(alert.typeKey)}
                          <span className="font-semibold text-slate-200">{alert.typeLabel}</span>
                        </div>
                        <span className="text-slate-400">Data: <strong className="text-slate-200">{alert.dateStr}</strong></span>
                      </div>
                    </div>

                  </div>

                  {/* Right: Badge Status & Action Edit Button */}
                  <div className="flex items-center space-x-3 shrink-0 self-end sm:self-center">
                    
                    <span className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${getBadgeStyle(alert.alertLevel)}`}>
                      {alert.badgeLabel}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onEditCar(alert.rawCar);
                      }}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-all active:scale-95"
                      title="Apri scheda per aggiornare o estendere la data di scadenza"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Aggiorna</span>
                    </button>

                  </div>

                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer Note & Test Email Action */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0">
          <span className="text-slate-400 text-center sm:text-left">
            I dati delle scadenze si aggiornano automaticamente quando modifichi ogni vettura.
          </span>

          <button
            type="button"
            onClick={() => {
              const success = sendTestEmailMailto();
              if (success) {
                setTestSentMsg('Email di prova in preparazione nel client email!');
                setTimeout(() => setTestSentMsg(''), 4000);
              }
            }}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl flex items-center space-x-2 transition-all shadow-md shrink-0 active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            <span>✉️ Invia Test Report Email Ora</span>
          </button>
        </div>

      </div>
    </div>
  );
}
