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
  Car,
  Send,
  Save,
  Search,
  ChevronDown,
  ChevronUp,
  Check,
  RotateCcw,
  Plus
} from 'lucide-react';
import { getLogoForBrand, isValidBrandLogo } from '../utils/brandLogos';
import { toInputDateFormat, toDisplayDateFormat } from '../utils/notifications';
import { sendTestEmailMailto } from '../utils/emailAlerts';

export default function ExpirationsModal({ 
  alerts = [], 
  cars = [],
  onClose, 
  onEditCar,
  onUpdateCarExpirations,
  currentUser
}) {
  const [filterLevel, setFilterLevel] = useState('all'); // 'all' | 'expired_urgent' | '1month' | '2months' | 'all_cars'
  const [testSentMsg, setTestSentMsg] = useState('');
  const [successFeedback, setSuccessFeedback] = useState('');

  // Inline single-date editor state
  const [editingAlertId, setEditingAlertId] = useState(null);
  const [inlineDate, setInlineDate] = useState('');

  // Full 4-in-1 editor state per car (accordion in alert row or in all_cars tab)
  const [expandedCarId, setExpandedCarId] = useState(null);
  const [fullCarForm, setFullCarForm] = useState({
    scadenzaBollo: '',
    scadenzaAssicurazione: '',
    scadenzaRevisione: '',
    prossimoTagliandoData: '',
    prossimoTagliandoKm: ''
  });

  // Search in "all_cars" tab
  const [carSearchQuery, setCarSearchQuery] = useState('');

  const expiredCount = alerts.filter(a => a.alertLevel === 'expired').length;
  const urgentCount = alerts.filter(a => a.alertLevel === 'urgent').length;
  const monthCount = alerts.filter(a => a.alertLevel === 'warning').length;
  const infoCount = alerts.filter(a => a.alertLevel === 'info').length;

  const showFeedback = (msg) => {
    setSuccessFeedback(msg);
    setTimeout(() => setSuccessFeedback(''), 4000);
  };

  // Helper to add years/months to an input date (YYYY-MM-DD)
  const shiftDate = (currentVal, monthsToAdd = 0, yearsToAdd = 0) => {
    let base = currentVal ? new Date(currentVal) : new Date();
    if (isNaN(base.getTime())) base = new Date();
    base.setMonth(base.getMonth() + monthsToAdd);
    base.setFullYear(base.getFullYear() + yearsToAdd);
    try {
      return base.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  // Start inline editing of a single alert date
  const handleStartInlineEdit = (alert) => {
    if (editingAlertId === alert.id) {
      setEditingAlertId(null);
      setInlineDate('');
    } else {
      setEditingAlertId(alert.id);
      setInlineDate(toInputDateFormat(alert.dateStr));
    }
  };

  // Save inline single alert date
  const handleSaveInlineEdit = async (alert) => {
    if (!onUpdateCarExpirations) return;
    const formatted = toDisplayDateFormat(inlineDate);
    await onUpdateCarExpirations(alert.carId, {
      [alert.typeKey]: formatted
    });
    setEditingAlertId(null);
    setInlineDate('');
    showFeedback(`✅ ${alert.typeLabel} per ${alert.carBrand} ${alert.carModel} aggiornato al ${formatted || 'Non impostato'}!`);
  };

  // Open / Toggle 4-in-1 Full Expirations editor for a car
  const handleToggleFullCarEditor = (carObj) => {
    if (expandedCarId === carObj.id) {
      setExpandedCarId(null);
    } else {
      setExpandedCarId(carObj.id);
      setFullCarForm({
        scadenzaBollo: toInputDateFormat(carObj.scadenzaBollo),
        scadenzaAssicurazione: toInputDateFormat(carObj.scadenzaAssicurazione),
        scadenzaRevisione: toInputDateFormat(carObj.scadenzaRevisione),
        prossimoTagliandoData: toInputDateFormat(carObj.prossimoTagliandoData),
        prossimoTagliandoKm: carObj.prossimoTagliandoKm || ''
      });
    }
  };

  // Save all 4 expirations for a car
  const handleSaveFullCarExpirations = async (carId, carBrand, carModel) => {
    if (!onUpdateCarExpirations) return;
    await onUpdateCarExpirations(carId, {
      scadenzaBollo: toDisplayDateFormat(fullCarForm.scadenzaBollo),
      scadenzaAssicurazione: toDisplayDateFormat(fullCarForm.scadenzaAssicurazione),
      scadenzaRevisione: toDisplayDateFormat(fullCarForm.scadenzaRevisione),
      prossimoTagliandoData: toDisplayDateFormat(fullCarForm.prossimoTagliandoData),
      prossimoTagliandoKm: fullCarForm.prossimoTagliandoKm.trim()
    });
    setExpandedCarId(null);
    showFeedback(`✅ Tutte le scadenze di ${carBrand} ${carModel} salvate con successo!`);
  };

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

  const filteredCarsForTab = cars.filter(c => {
    if (!carSearchQuery) return true;
    const q = carSearchQuery.toLowerCase();
    return (
      (c.brand && c.brand.toLowerCase().includes(q)) ||
      (c.model && c.model.toLowerCase().includes(q)) ||
      (c.targa && c.targa.toLowerCase().includes(q)) ||
      (c.telaio && c.telaio.toLowerCase().includes(q))
    );
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
        className="glass-panel w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl border border-white/10 my-auto flex flex-col max-h-[92vh] bg-slate-900/95 text-slate-100"
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
                <span>Gestione & Modifica Scadenze Vetture</span>
              </h2>
              <p className="text-xs text-slate-400">
                Modifica e salva istantaneamente Bollo, Assicurazione, Revisione e Tagliando della flotta
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-400 rounded-xl border border-slate-700 transition-all cursor-pointer"
            title="Chiudi pannello scadenze"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Success Feedback Banner */}
        {successFeedback && (
          <div className="px-6 py-2.5 bg-emerald-500/20 border-b border-emerald-500/40 text-emerald-300 flex items-center justify-between text-xs font-bold animate-fade-in shrink-0">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successFeedback}</span>
            </div>
            <button onClick={() => setSuccessFeedback('')} className="text-emerald-400 hover:text-white text-xs">✕</button>
          </div>
        )}

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
        <div className="flex border-b border-slate-800 bg-slate-900/60 px-6 py-2 gap-2 text-xs font-semibold overflow-x-auto shrink-0 items-center">
          <button
            type="button"
            onClick={() => setFilterLevel('all')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              filterLevel === 'all'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            Avvisi Attivi ({alerts.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterLevel('expired_urgent')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              filterLevel === 'expired_urgent'
                ? 'bg-rose-500 text-white font-bold shadow-md'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            Scadute / Imminenti ({expiredCount + urgentCount})
          </button>

          <button
            type="button"
            onClick={() => setFilterLevel('1month')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
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
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              filterLevel === '2months'
                ? 'bg-sky-500 text-slate-950 font-bold shadow-md'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            2 Mesi ({infoCount})
          </button>

          {/* Tab to view and edit ANY vehicle in the entire fleet */}
          <button
            type="button"
            onClick={() => setFilterLevel('all_cars')}
            className={`px-3 py-1.5 rounded-xl transition-all ml-auto flex items-center space-x-1.5 cursor-pointer ${
              filterLevel === 'all_cars'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold shadow-md'
                : 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-900/50'
            }`}
            title="Sfoglia e modifica le scadenze di qualsiasi auto del garage"
          >
            <Car className="w-3.5 h-3.5" />
            <span>Tutte le Vetture Flotta ({cars.length})</span>
          </button>
        </div>

        {/* Modal List Body */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-3.5 flex-1">
          
          {/* TAB 1: ALL FLEET CARS SEARCH & DIRECT EDIT */}
          {filterLevel === 'all_cars' ? (
            <div className="space-y-4">
              {/* Search Bar for Cars */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={carSearchQuery}
                  onChange={(e) => setCarSearchQuery(e.target.value)}
                  placeholder="Cerca vettura per Marca, Modello, Targa, N° Telaio..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-2xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              <div className="space-y-3">
                {filteredCarsForTab.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    Nessuna vettura trovata corrispondente alla ricerca.
                  </div>
                ) : (
                  filteredCarsForTab.map(carItem => {
                    const carLogo = (isValidBrandLogo(carItem.logoImg) ? carItem.logoImg : null) || getLogoForBrand(carItem.brand);
                    const isExpanded = expandedCarId === carItem.id;

                    return (
                      <div 
                        key={carItem.id}
                        className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all shadow-md"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          
                          {/* Left: Thumbnail & Car Info */}
                          <div className="flex items-center space-x-3.5">
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shrink-0 relative">
                              {carItem.mainPhoto || carItem.pageImage || (carItem.images && carItem.images[0]) ? (
                                <img 
                                  src={carItem.mainPhoto || carItem.pageImage || carItem.images[0]} 
                                  alt="" 
                                  className="w-full h-full object-cover" 
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Car className="w-5 h-5 text-slate-600" />
                                </div>
                              )}
                              {carLogo && (
                                <div className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded bg-white p-0.5 shadow">
                                  <img src={carLogo} alt="" className="w-full h-full object-contain" />
                                </div>
                              )}
                            </div>

                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-sm text-white">{carItem.brand} {carItem.model}</span>
                                {carItem.targa && (
                                  <span className="px-1.5 py-0.5 bg-slate-950 border border-slate-800 text-[10px] font-mono font-bold text-amber-300 rounded">
                                    {carItem.targa}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-0.5">
                                <span>Bollo: <strong className="text-slate-200">{carItem.scadenzaBollo || 'Non imp.'}</strong></span>
                                <span>Assic.: <strong className="text-slate-200">{carItem.scadenzaAssicurazione || 'Non imp.'}</strong></span>
                                <span>Rev.: <strong className="text-slate-200">{carItem.scadenzaRevisione || 'Non imp.'}</strong></span>
                                <span>Tagliando: <strong className="text-slate-200">{carItem.prossimoTagliandoData || 'Non imp.'}</strong></span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Expand / Edit Button */}
                          <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => handleToggleFullCarEditor(carItem)}
                              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                                isExpanded
                                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
                              }`}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>{isExpanded ? 'Chiudi Modifica' : 'Modifica Scadenze'}</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
                            </button>
                          </div>

                        </div>

                        {/* Expandable 4-in-1 Editor Panel */}
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-slate-800 animate-fade-in space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                              
                              {/* Bollo */}
                              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2">
                                <label className="flex items-center space-x-1.5 font-bold text-amber-400 uppercase tracking-wider text-[11px]">
                                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Scadenza Bollo</span>
                                </label>
                                <input
                                  type="date"
                                  value={fullCarForm.scadenzaBollo}
                                  onChange={(e) => setFullCarForm({ ...fullCarForm, scadenzaBollo: e.target.value })}
                                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-xs focus:ring-1 focus:ring-amber-500 outline-none"
                                />
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setFullCarForm({ ...fullCarForm, scadenzaBollo: shiftDate(fullCarForm.scadenzaBollo, 0, 1) })}
                                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-amber-300 rounded font-semibold transition-colors"
                                  >
                                    +1 Anno
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setFullCarForm({ ...fullCarForm, scadenzaBollo: '' })}
                                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-400 hover:text-rose-400 rounded transition-colors"
                                  >
                                    Svuota
                                  </button>
                                </div>
                              </div>

                              {/* Assicurazione */}
                              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2">
                                <label className="flex items-center space-x-1.5 font-bold text-emerald-400 uppercase tracking-wider text-[11px]">
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Assicurazione RC</span>
                                </label>
                                <input
                                  type="date"
                                  value={fullCarForm.scadenzaAssicurazione}
                                  onChange={(e) => setFullCarForm({ ...fullCarForm, scadenzaAssicurazione: e.target.value })}
                                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                                />
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setFullCarForm({ ...fullCarForm, scadenzaAssicurazione: shiftDate(fullCarForm.scadenzaAssicurazione, 0, 1) })}
                                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-emerald-300 rounded font-semibold transition-colors"
                                  >
                                    +1 Anno
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setFullCarForm({ ...fullCarForm, scadenzaAssicurazione: shiftDate(fullCarForm.scadenzaAssicurazione, 6, 0) })}
                                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-emerald-300 rounded font-semibold transition-colors"
                                  >
                                    +6 Mesi
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setFullCarForm({ ...fullCarForm, scadenzaAssicurazione: '' })}
                                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-400 hover:text-rose-400 rounded transition-colors"
                                  >
                                    Svuota
                                  </button>
                                </div>
                              </div>

                              {/* Revisione */}
                              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2">
                                <label className="flex items-center space-x-1.5 font-bold text-cyan-400 uppercase tracking-wider text-[11px]">
                                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                                  <span>Revisione Statale</span>
                                </label>
                                <input
                                  type="date"
                                  value={fullCarForm.scadenzaRevisione}
                                  onChange={(e) => setFullCarForm({ ...fullCarForm, scadenzaRevisione: e.target.value })}
                                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-xs focus:ring-1 focus:ring-cyan-500 outline-none"
                                />
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setFullCarForm({ ...fullCarForm, scadenzaRevisione: shiftDate(fullCarForm.scadenzaRevisione, 0, 2) })}
                                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-cyan-300 rounded font-semibold transition-colors"
                                    title="Revisione biennale (+2 anni)"
                                  >
                                    +2 Anni
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setFullCarForm({ ...fullCarForm, scadenzaRevisione: shiftDate(fullCarForm.scadenzaRevisione, 0, 1) })}
                                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-cyan-300 rounded font-semibold transition-colors"
                                  >
                                    +1 Anno
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setFullCarForm({ ...fullCarForm, scadenzaRevisione: '' })}
                                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-400 hover:text-rose-400 rounded transition-colors"
                                  >
                                    Svuota
                                  </button>
                                </div>
                              </div>

                              {/* Tagliando */}
                              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2">
                                <label className="flex items-center space-x-1.5 font-bold text-amber-300 uppercase tracking-wider text-[11px]">
                                  <Wrench className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Prossimo Tagliando</span>
                                </label>
                                <input
                                  type="date"
                                  value={fullCarForm.prossimoTagliandoData}
                                  onChange={(e) => setFullCarForm({ ...fullCarForm, prossimoTagliandoData: e.target.value })}
                                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-xs focus:ring-1 focus:ring-amber-500 outline-none"
                                />
                                <input
                                  type="text"
                                  value={fullCarForm.prossimoTagliandoKm}
                                  onChange={(e) => setFullCarForm({ ...fullCarForm, prossimoTagliandoKm: e.target.value })}
                                  placeholder="Es. 80.000 km"
                                  className="w-full px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-[11px] focus:ring-1 focus:ring-amber-500 outline-none"
                                />
                              </div>

                            </div>

                            {/* Action Save Bar */}
                            <div className="flex items-center justify-end space-x-2 pt-2">
                              <button
                                type="button"
                                onClick={() => setExpandedCarId(null)}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                              >
                                Annulla
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveFullCarExpirations(carItem.id, carItem.brand, carItem.model)}
                                className="flex items-center space-x-1.5 px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer active:scale-95"
                              >
                                <Save className="w-3.5 h-3.5" />
                                <span>Salva Tutte le Scadenze</span>
                              </button>
                            </div>
                          </div>
                        )}

                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            /* TAB 2: ACTIVE ALERTS LIST */
            filteredAlerts.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto opacity-80" />
                <p className="text-base font-bold text-slate-200">
                  Nessuna scadenza in questa categoria!
                </p>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {alerts.length === 0
                    ? "Tutte le vetture hanno le scadenze in regola o puoi aggiungerne di nuove dalla scheda 'Tutte le Vetture Flotta'."
                    : "Cambia il filtro in alto per visualizzare le altre scadenze della flotta."}
                </p>
              </div>
            ) : (
              filteredAlerts.map(alert => {
                const carLogo = (isValidBrandLogo(alert.carLogo) ? alert.carLogo : null) || getLogoForBrand(alert.carBrand);
                const isEditingInline = editingAlertId === alert.id;
                const isCarExpanded = expandedCarId === alert.carId;

                return (
                  <div 
                    key={alert.id}
                    className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl transition-all flex flex-col gap-3 shadow-lg group"
                  >
                    
                    {/* Main Alert Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      
                      {/* Left: Thumbnail & Brand/Model info */}
                      <div className="flex items-center space-x-4">
                        
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

                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                            <div className="flex items-center space-x-1.5 p-1 px-2 bg-slate-950 rounded-lg border border-slate-800">
                              {getIconForType(alert.typeKey)}
                              <span className="font-semibold text-slate-200">{alert.typeLabel}</span>
                            </div>
                            <span className="text-slate-400">
                              Data: <strong className="text-amber-300 font-mono">{alert.dateStr}</strong>
                            </span>
                          </div>
                        </div>

                      </div>

                      {/* Right: Badge Status & Direct Edit Buttons */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-center">
                        
                        <span className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold ${getBadgeStyle(alert.alertLevel)}`}>
                          {alert.badgeLabel}
                        </span>

                        {/* Quick Inline Date Edit Toggle */}
                        <button
                          type="button"
                          onClick={() => handleStartInlineEdit(alert)}
                          className={`flex items-center space-x-1.5 px-2.5 py-1.5 font-bold text-xs rounded-xl border transition-all cursor-pointer ${
                            isEditingInline
                              ? 'bg-amber-500 text-slate-950 border-amber-400'
                              : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
                          }`}
                          title="Modifica direttamente la data di questa scadenza"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{isEditingInline ? 'Annulla' : 'Modifica Data'}</span>
                        </button>

                        {/* Expand All 4 Expirations for this Car */}
                        <button
                          type="button"
                          onClick={() => handleToggleFullCarEditor(alert.rawCar)}
                          className={`flex items-center space-x-1 px-2 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                            isCarExpanded
                              ? 'bg-slate-700 text-white border-slate-600'
                              : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                          }`}
                          title="Visualizza e modifica tutte le 4 scadenze di questa vettura"
                        >
                          <span>Tutte le 4</span>
                          {isCarExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>

                        {/* Full Car Sheet Edit Button */}
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onEditCar(alert.rawCar);
                          }}
                          className="p-1.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition-all cursor-pointer"
                          title="Apri scheda completa veicolo per modificare altri dati (foto, telaio, ecc.)"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                      </div>

                    </div>

                    {/* Inline Single-Date Editor Panel */}
                    {isEditingInline && (
                      <div className="bg-slate-950/90 border border-amber-500/40 rounded-xl p-3.5 animate-fade-in flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1">
                          <span className="text-xs font-bold text-amber-300 whitespace-nowrap flex items-center space-x-1.5">
                            {getIconForType(alert.typeKey)}
                            <span>Nuova Scadenza {alert.typeLabel}:</span>
                          </span>
                          <input
                            type="date"
                            value={inlineDate}
                            onChange={(e) => setInlineDate(e.target.value)}
                            className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500/60"
                          />
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setInlineDate(shiftDate(inlineDate, 0, 1))}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-amber-300 rounded-lg border border-slate-700"
                              title="Proroga di 1 Anno"
                            >
                              +1 Anno
                            </button>
                            <button
                              type="button"
                              onClick={() => setInlineDate(shiftDate(inlineDate, 0, 2))}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-cyan-300 rounded-lg border border-slate-700"
                              title="Proroga di 2 Anni"
                            >
                              +2 Anni
                            </button>
                            <button
                              type="button"
                              onClick={() => setInlineDate(shiftDate(inlineDate, 6, 0))}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-emerald-300 rounded-lg border border-slate-700"
                              title="Proroga di 6 Mesi"
                            >
                              +6 Mesi
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => setEditingAlertId(null)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
                          >
                            Annulla
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveInlineEdit(alert)}
                            className="flex items-center space-x-1.5 px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer active:scale-95"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Salva Scadenza</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Accordion Full 4-in-1 Editor Panel for this car */}
                    {isCarExpanded && (
                      <div className="bg-slate-950/95 border border-slate-800 rounded-xl p-4 animate-fade-in space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                            Tutte le Scadenze di {alert.carBrand} {alert.carModel}
                          </span>
                          <button
                            type="button"
                            onClick={() => setExpandedCarId(null)}
                            className="text-slate-400 hover:text-white text-xs"
                          >
                            ✕ Chiudi
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                          {/* Bollo */}
                          <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                            <span className="font-bold text-amber-400 text-[11px] block">Bollo Auto</span>
                            <input
                              type="date"
                              value={fullCarForm.scadenzaBollo}
                              onChange={(e) => setFullCarForm({ ...fullCarForm, scadenzaBollo: e.target.value })}
                              className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-xs outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setFullCarForm({ ...fullCarForm, scadenzaBollo: shiftDate(fullCarForm.scadenzaBollo, 0, 1) })}
                              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-amber-300 rounded font-semibold"
                            >
                              +1 Anno
                            </button>
                          </div>

                          {/* Assicurazione */}
                          <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                            <span className="font-bold text-emerald-400 text-[11px] block">Assicurazione RC</span>
                            <input
                              type="date"
                              value={fullCarForm.scadenzaAssicurazione}
                              onChange={(e) => setFullCarForm({ ...fullCarForm, scadenzaAssicurazione: e.target.value })}
                              className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-xs outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setFullCarForm({ ...fullCarForm, scadenzaAssicurazione: shiftDate(fullCarForm.scadenzaAssicurazione, 0, 1) })}
                              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-emerald-300 rounded font-semibold"
                            >
                              +1 Anno
                            </button>
                          </div>

                          {/* Revisione */}
                          <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                            <span className="font-bold text-cyan-400 text-[11px] block">Revisione</span>
                            <input
                              type="date"
                              value={fullCarForm.scadenzaRevisione}
                              onChange={(e) => setFullCarForm({ ...fullCarForm, scadenzaRevisione: e.target.value })}
                              className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-xs outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setFullCarForm({ ...fullCarForm, scadenzaRevisione: shiftDate(fullCarForm.scadenzaRevisione, 0, 2) })}
                              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-cyan-300 rounded font-semibold"
                            >
                              +2 Anni
                            </button>
                          </div>

                          {/* Tagliando */}
                          <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                            <span className="font-bold text-amber-300 text-[11px] block">Tagliando</span>
                            <input
                              type="date"
                              value={fullCarForm.prossimoTagliandoData}
                              onChange={(e) => setFullCarForm({ ...fullCarForm, prossimoTagliandoData: e.target.value })}
                              className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-xs outline-none"
                            />
                            <input
                              type="text"
                              value={fullCarForm.prossimoTagliandoKm}
                              onChange={(e) => setFullCarForm({ ...fullCarForm, prossimoTagliandoKm: e.target.value })}
                              placeholder="Es. 80.000 km"
                              className="w-full px-2 py-0.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-[11px] outline-none"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-end space-x-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleSaveFullCarExpirations(alert.carId, alert.carBrand, alert.carModel)}
                            className="flex items-center space-x-1.5 px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer active:scale-95"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Salva Tutte le Scadenze</span>
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                );
              })
            )
          )}
        </div>

        {/* Modal Footer Note & Test Email Action */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0">
          <span className="text-slate-400 text-center sm:text-left">
            💾 Le modifiche alle date di scadenza vengono salvate istantaneamente in cloud e nel dispositivo.
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
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl flex items-center space-x-2 transition-all shadow-md shrink-0 active:scale-95 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>✉️ Invia Test Report Email Ora</span>
          </button>
        </div>

      </div>
    </div>
  );
}
