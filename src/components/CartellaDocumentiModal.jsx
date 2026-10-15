import React, { useState, useMemo, useRef } from 'react';
import { 
  X, 
  Folder, 
  FolderOpen, 
  FileText, 
  Search, 
  Upload, 
  Download, 
  Printer, 
  Eye, 
  Trash2, 
  RefreshCw, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Paperclip, 
  ShieldCheck, 
  FileCheck, 
  Euro, 
  Calendar, 
  Car, 
  Filter, 
  Sparkles,
  ArrowLeft,
  ChevronRight,
  HardDrive
} from 'lucide-react';
import { openDocument, downloadDocument } from '../utils/documentViewer';
import { processScannedDocumentFile } from '../utils/storage';
import { upsertSingleCarToSupabase } from '../utils/supabase';

export default function CartellaDocumentiModal({ 
  isOpen, 
  onClose, 
  cars = [], 
  onUpdateCars, 
  currentUser 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all'); // 'all', 'libretto', 'assicurazione', 'bollo', 'with_docs', 'missing_docs'
  const [activeCarId, setActiveCarId] = useState(null); // When viewing a single car folder
  const [uploadNotice, setUploadNotice] = useState(null); // { type: 'success' | 'info' | 'error', message: string }
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Hidden file inputs for category upload
  const fileInputRef = useRef({});

  if (!isOpen) return null;

  // Active Car if inside a specific folder
  const activeCar = useMemo(() => {
    if (!activeCarId) return null;
    return cars.find(c => c.id === activeCarId) || null;
  }, [cars, activeCarId]);

  // Document counts across all cars
  const stats = useMemo(() => {
    let totalDocs = 0;
    let librettiCount = 0;
    let assicurazioniCount = 0;
    let bolliCount = 0;
    let carsWithDocs = 0;

    cars.forEach(car => {
      const docs = Array.isArray(car.documents) ? car.documents : [];
      if (docs.length > 0) carsWithDocs++;
      totalDocs += docs.length;
      docs.forEach(d => {
        if (d.category === 'libretto') librettiCount++;
        else if (d.category === 'assicurazione') assicurazioniCount++;
        else if (d.category === 'bollo') bolliCount++;
      });
    });

    return { totalDocs, librettiCount, assicurazioniCount, bolliCount, carsWithDocs };
  }, [cars]);

  // Filter cars based on search and selected filter
  const filteredCars = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return cars.filter(car => {
      const brand = (car.brand || '').toLowerCase();
      const model = (car.model || '').toLowerCase();
      const targa = (car.targa || car.immatricolazione || '').toLowerCase();
      const carName = `${brand} ${model} ${targa}`;
      const docs = Array.isArray(car.documents) ? car.documents : [];

      // Check text search
      const matchesSearch = !q || carName.includes(q) || docs.some(d => 
        (d.title || '').toLowerCase().includes(q) || (d.fileName || '').toLowerCase().includes(q)
      );
      if (!matchesSearch) return false;

      // Check category filter
      if (selectedCategoryFilter === 'with_docs') return docs.length > 0;
      if (selectedCategoryFilter === 'missing_docs') return docs.length === 0;
      if (selectedCategoryFilter === 'libretto') return docs.some(d => d.category === 'libretto');
      if (selectedCategoryFilter === 'assicurazione') return docs.some(d => d.category === 'assicurazione');
      if (selectedCategoryFilter === 'bollo') return docs.some(d => d.category === 'bollo');

      return true;
    });
  }, [cars, searchQuery, selectedCategoryFilter]);

  // Show temporary notice
  const triggerNotice = (message, type = 'success') => {
    setUploadNotice({ message, type });
    setTimeout(() => setUploadNotice(null), 5500);
  };

  // Upload or Replace document for a target car
  const handleUploadOrReplace = async (car, category, event) => {
    const file = event.target.files?.[0];
    if (!file || !car) return;

    setIsProcessing(true);
    try {
      const carInfo = {
        brand: car.brand,
        model: car.model,
        targa: car.targa,
        immatricolazione: car.immatricolazione
      };

      // Process scan (downscale camera photos to clean A4, format car-specific filename)
      const newDoc = await processScannedDocumentFile(file, carInfo, category);
      if (!newDoc) {
        triggerNotice('Errore durante la lettura del file.', 'error');
        return;
      }

      // Check if previous document exists in this category
      const currentDocs = Array.isArray(car.documents) ? car.documents : [];
      let wasReplaced = false;
      let filtered = currentDocs;

      if (category !== 'altro') {
        const prevDoc = currentDocs.find(d => d.category === category);
        if (prevDoc) {
          wasReplaced = true;
          // AUTOMATICALLY REMOVE the previous version as requested!
          filtered = currentDocs.filter(d => d.category !== category);
        }
      }

      const updatedCar = {
        ...car,
        documents: [newDoc, ...filtered]
      };

      // 1. Update State & Local DB
      const updatedCars = cars.map(c => c.id === car.id ? updatedCar : c);
      onUpdateCars(updatedCars);

      // 2. Immediately Sync to Supabase Cloud
      upsertSingleCarToSupabase(updatedCar);

      if (wasReplaced) {
        triggerNotice(
          `Documento precedente sostituito automaticamente con la nuova scansione per ${car.brand} ${car.model}!`,
          'info'
        );
      } else {
        triggerNotice(
          `Scansione salvata correttamente per ${car.brand} ${car.model}!`,
          'success'
        );
      }
    } catch (err) {
      console.error('Error uploading document:', err);
      triggerNotice(`Errore: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
      event.target.value = '';
    }
  };

  // Delete a document from a car
  const handleDeleteDocument = (car, docId) => {
    if (!window.confirm('Sei sicuro di voler eliminare definitivamente questo documento scansionato?')) {
      return;
    }

    const updatedCar = {
      ...car,
      documents: (car.documents || []).filter(d => d.id !== docId)
    };

    const updatedCars = cars.map(c => c.id === car.id ? updatedCar : c);
    onUpdateCars(updatedCars);
    upsertSingleCarToSupabase(updatedCar);
    triggerNotice('Documento eliminato con successo.', 'info');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-6xl h-[92vh] max-h-[880px] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 rounded-2xl shadow-lg shadow-amber-500/20">
              <FolderOpen className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-heading font-extrabold text-slate-100 tracking-tight">
                  Cartella & Archivio Documenti Vetture
                </h2>
                <span className="px-2.5 py-0.5 text-[10px] font-extrabold bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20">
                  {stats.totalDocs} File Salvati
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Dossier digitali: Libretti, Assicurazioni, Bolli e Allegati con salvataggio sicuro e sostituzione automatica
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-all"
            title="Chiudi Archivio"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Global Alert / Notice Banner */}
        {uploadNotice && (
          <div className={`px-4 py-2.5 flex items-center justify-between text-xs font-bold border-b transition-all shrink-0 animate-fade-in ${
            uploadNotice.type === 'error'
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
              : uploadNotice.type === 'info'
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
          }`}>
            <div className="flex items-center space-x-2">
              {uploadNotice.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              ) : uploadNotice.type === 'info' ? (
                <RefreshCw className="w-4 h-4 text-cyan-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <span>{uploadNotice.message}</span>
            </div>
            <button 
              onClick={() => setUploadNotice(null)}
              className="text-slate-400 hover:text-white text-xs px-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Breadcrumb & Navigation Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-slate-950/60 border-b border-slate-800/80 shrink-0">
          <div className="flex items-center space-x-2 text-xs">
            <button
              onClick={() => setActiveCarId(null)}
              className={`flex items-center space-x-1.5 font-bold transition-colors ${
                !activeCarId ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Folder className="w-4 h-4" />
              <span>Tutte le Vetture ({cars.length})</span>
            </button>

            {activeCar && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                <span className="font-extrabold text-amber-400 flex items-center space-x-1.5">
                  <Car className="w-3.5 h-3.5 text-amber-400" />
                  <span>{activeCar.brand} {activeCar.model}</span>
                  {(activeCar.targa || activeCar.immatricolazione) && (
                    <span className="px-1.5 py-0.5 text-[10px] bg-slate-800 text-slate-300 rounded border border-slate-700">
                      {activeCar.targa || activeCar.immatricolazione}
                    </span>
                  )}
                </span>
              </>
            )}
          </div>

          {/* Quick Stats Chips */}
          <div className="flex items-center space-x-2 text-[11px] overflow-x-auto pb-1 sm:pb-0">
            <span className="px-2.5 py-1 bg-slate-900 rounded-lg border border-slate-800 text-slate-300 font-medium whitespace-nowrap">
              📁 {stats.carsWithDocs} su {cars.length} vetture con documenti
            </span>
            <span className="px-2.5 py-1 bg-amber-500/10 text-amber-300 rounded-lg border border-amber-500/20 font-bold whitespace-nowrap">
              📄 {stats.librettiCount} Libretti
            </span>
            <span className="px-2.5 py-1 bg-blue-500/10 text-blue-300 rounded-lg border border-blue-500/20 font-bold whitespace-nowrap">
              🛡️ {stats.assicurazioniCount} Polizze
            </span>
            <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-300 rounded-lg border border-emerald-500/20 font-bold whitespace-nowrap">
              💶 {stats.bolliCount} Bolli
            </span>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {/* VIEW 1: SINGLE CAR FOLDER VIEW */}
          {activeCar ? (
            <div className="space-y-6">
              
              {/* Back Button & Car Summary Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-950 rounded-2xl border border-slate-800 gap-4">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setActiveCarId(null)}
                    className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-700/80 transition-all flex items-center space-x-1.5 text-xs font-bold"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Torna all'indice</span>
                  </button>

                  <div>
                    <h3 className="text-base sm:text-lg font-extrabold text-slate-100 flex items-center space-x-2">
                      <span>{activeCar.brand} {activeCar.model}</span>
                      {(activeCar.targa || activeCar.immatricolazione) && (
                        <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-300 font-mono font-bold rounded-lg border border-amber-500/30">
                          {activeCar.targa || activeCar.immatricolazione}
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400">
                      N. Telaio: <span className="font-mono text-slate-300">{activeCar.chassis || 'N/D'}</span> • Documenti presenti: <span className="text-amber-400 font-bold">{activeCar.documents?.length || 0}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-[11px] text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
                    💡 <strong className="text-slate-200">Regola:</strong> se aggiorni un documento, la versione precedente viene eliminata in automatico.
                  </span>
                </div>
              </div>

              {/* Quick Upload Action Buttons for Active Car */}
              <div className="bg-slate-900/70 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center">
                    <Upload className="w-4 h-4 mr-2" />
                    <span>Carica o Sostituisci Documenti Scansionati (PDF o Foto Scanner)</span>
                  </h4>
                  {isProcessing && (
                    <span className="text-xs text-cyan-400 font-bold flex items-center space-x-1 animate-pulse">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Ottimizzazione e salvataggio in corso...</span>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Upload Libretto */}
                  <label className="flex flex-col items-center justify-center p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 rounded-xl cursor-pointer transition-all group text-center">
                    <FileCheck className="w-5 h-5 text-amber-400 mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-slate-200">Libretto Circolazione</span>
                    <span className="text-[10px] text-slate-400">
                      {activeCar.documents?.some(d => d.category === 'libretto') ? '🔄 Clicca per Sostituire' : '+ Carica Scansione'}
                    </span>
                    <input 
                      type="file" 
                      accept=".pdf,image/*" 
                      onChange={(e) => handleUploadOrReplace(activeCar, 'libretto', e)} 
                      className="hidden" 
                      disabled={isProcessing}
                    />
                  </label>

                  {/* Upload Assicurazione */}
                  <label className="flex flex-col items-center justify-center p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 rounded-xl cursor-pointer transition-all group text-center">
                    <ShieldCheck className="w-5 h-5 text-blue-400 mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-slate-200">Polizza Assicurativa</span>
                    <span className="text-[10px] text-slate-400">
                      {activeCar.documents?.some(d => d.category === 'assicurazione') ? '🔄 Clicca per Sostituire' : '+ Carica Scansione'}
                    </span>
                    <input 
                      type="file" 
                      accept=".pdf,image/*" 
                      onChange={(e) => handleUploadOrReplace(activeCar, 'assicurazione', e)} 
                      className="hidden" 
                      disabled={isProcessing}
                    />
                  </label>

                  {/* Upload Bollo */}
                  <label className="flex flex-col items-center justify-center p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 rounded-xl cursor-pointer transition-all group text-center">
                    <Euro className="w-5 h-5 text-emerald-400 mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-slate-200">Ricevuta Bollo</span>
                    <span className="text-[10px] text-slate-400">
                      {activeCar.documents?.some(d => d.category === 'bollo') ? '🔄 Clicca per Sostituire' : '+ Carica Scansione'}
                    </span>
                    <input 
                      type="file" 
                      accept=".pdf,image/*" 
                      onChange={(e) => handleUploadOrReplace(activeCar, 'bollo', e)} 
                      className="hidden" 
                      disabled={isProcessing}
                    />
                  </label>

                  {/* Upload Altro */}
                  <label className="flex flex-col items-center justify-center p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 rounded-xl cursor-pointer transition-all group text-center">
                    <Plus className="w-5 h-5 text-purple-400 mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-slate-200">Altro Documento</span>
                    <span className="text-[10px] text-slate-400">Revisione / Tagliando / Altro</span>
                    <input 
                      type="file" 
                      accept=".pdf,image/*" 
                      onChange={(e) => handleUploadOrReplace(activeCar, 'altro', e)} 
                      className="hidden" 
                      disabled={isProcessing}
                    />
                  </label>
                </div>
              </div>

              {/* Documents List for this Car */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Documenti Archiviati nella Cartella ({activeCar.documents?.length || 0})
                  </h4>
                </div>

                {(!activeCar.documents || activeCar.documents.length === 0) ? (
                  <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-dashed border-slate-800 space-y-2">
                    <Paperclip className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-sm font-bold text-slate-400">Nessun documento scansionato per questa vettura.</p>
                    <p className="text-xs text-slate-500">
                      Usa i pulsanti sopra per caricare la scansione del Libretto, dell'Assicurazione o del Bollo.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {activeCar.documents.map((doc) => (
                      <div 
                        key={doc.id}
                        className="p-4 bg-slate-950 rounded-2xl border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-3 group"
                      >
                        <div className="flex items-start space-x-3.5">
                          <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                            doc.category === 'libretto' 
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25' 
                              : doc.category === 'assicurazione'
                              ? 'bg-blue-500/15 text-blue-400 border border-blue-500/25'
                              : doc.category === 'bollo'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                              : 'bg-purple-500/15 text-purple-400 border border-purple-500/25'
                          }`}>
                            <Paperclip className="w-5 h-5" />
                          </div>

                          <div className="overflow-hidden flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-full ${
                                doc.category === 'libretto' 
                                  ? 'bg-amber-500/20 text-amber-300' 
                                  : doc.category === 'assicurazione'
                                  ? 'bg-blue-500/20 text-blue-300'
                                  : doc.category === 'bollo'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-slate-800 text-slate-300'
                              }`}>
                                {doc.category || 'Allegato'}
                              </span>
                              {doc.fileSizeKb && (
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {doc.fileSizeKb} KB
                                </span>
                              )}
                            </div>

                            <p className="text-sm font-bold text-slate-100 truncate mt-1">
                              {doc.title}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate font-mono">
                              {doc.fileName}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              📅 Caricato il {doc.uploadedAt || 'N/D'}
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center space-x-2 pt-2 border-t border-slate-800/80">
                          <button
                            type="button"
                            onClick={() => openDocument(doc)}
                            className="flex-1 py-1.5 px-2 bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1"
                            title="Apri e Visualizza Scansione"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Visualizza</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => downloadDocument(doc)}
                            className="flex-1 py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1 border border-slate-800"
                            title="Scarica File con Nome Vettura"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Scarica</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openDocument(doc, true)}
                            className="py-1.5 px-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center border border-slate-800"
                            title="Stampa Immediata"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Sostituisci / Aggiorna Button */}
                          <label className="py-1.5 px-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center border border-cyan-500/20 cursor-pointer" title="Sostituisci con una nuova scansione (cancella automaticamente questa)">
                            <RefreshCw className="w-3.5 h-3.5" />
                            <input 
                              type="file" 
                              accept=".pdf,image/*" 
                              onChange={(e) => handleUploadOrReplace(activeCar, doc.category, e)} 
                              className="hidden" 
                            />
                          </label>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteDocument(activeCar, doc.id)}
                            className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-xl text-xs transition-all border border-rose-500/20"
                            title="Elimina Definitivamente"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          ) : (
            /* VIEW 2: ALL CARS FOLDERS INDEX */
            <div className="space-y-4">
              
              {/* Search & Filter Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cerca cartella vettura per Marca, Modello, Targa o nome file..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <button
                    onClick={() => setSelectedCategoryFilter('all')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      selectedCategoryFilter === 'all'
                        ? 'bg-amber-500 text-slate-950 shadow'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    Tutte ({cars.length})
                  </button>

                  <button
                    onClick={() => setSelectedCategoryFilter('with_docs')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      selectedCategoryFilter === 'with_docs'
                        ? 'bg-amber-500 text-slate-950 shadow'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    Con Documenti ({stats.carsWithDocs})
                  </button>

                  <button
                    onClick={() => setSelectedCategoryFilter('libretto')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      selectedCategoryFilter === 'libretto'
                        ? 'bg-amber-500 text-slate-950 shadow'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    Libretti ({stats.librettiCount})
                  </button>

                  <button
                    onClick={() => setSelectedCategoryFilter('assicurazione')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      selectedCategoryFilter === 'assicurazione'
                        ? 'bg-amber-500 text-slate-950 shadow'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    Polizze ({stats.assicurazioniCount})
                  </button>
                </div>
              </div>

              {/* Folders Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredCars.map((car) => {
                  const docs = Array.isArray(car.documents) ? car.documents : [];
                  const hasLibretto = docs.some(d => d.category === 'libretto');
                  const hasAssicurazione = docs.some(d => d.category === 'assicurazione');
                  const hasBollo = docs.some(d => d.category === 'bollo');
                  const targa = car.targa || car.immatricolazione || '';

                  return (
                    <div
                      key={car.id}
                      onClick={() => setActiveCarId(car.id)}
                      className="p-4 bg-slate-950/90 rounded-2xl border border-slate-800 hover:border-amber-500/50 hover:bg-slate-950 transition-all cursor-pointer group flex flex-col justify-between space-y-3.5 shadow-md"
                    >
                      {/* Folder Title Header */}
                      <div className="flex items-start justify-between space-x-3">
                        <div className="flex items-center space-x-3 overflow-hidden">
                          <div className={`p-3 rounded-2xl shrink-0 transition-transform group-hover:scale-105 ${
                            docs.length > 0
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                              : 'bg-slate-900 text-slate-600 border border-slate-800'
                          }`}>
                            <Folder className="w-5 h-5" />
                          </div>

                          <div className="truncate">
                            <h4 className="text-sm font-extrabold text-slate-100 group-hover:text-amber-400 transition-colors truncate">
                              {car.brand} {car.model}
                            </h4>
                            <div className="flex items-center space-x-2 mt-0.5">
                              {targa && (
                                <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-800 text-slate-300 rounded border border-slate-700">
                                  {targa}
                                </span>
                              )}
                              <span className="text-[11px] text-slate-400">
                                {docs.length} file archiviati
                              </span>
                            </div>
                          </div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 group-hover:translate-x-1 transition-all shrink-0 mt-1" />
                      </div>

                      {/* Document Status Indicators */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                        <div className="flex items-center space-x-1.5">
                          <span className={`px-2 py-0.5 rounded-md font-bold flex items-center space-x-1 ${
                            hasLibretto 
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' 
                              : 'bg-slate-900 text-slate-600 border border-slate-800'
                          }`}>
                            <span>Libretto</span>
                            {hasLibretto && <span>✓</span>}
                          </span>

                          <span className={`px-2 py-0.5 rounded-md font-bold flex items-center space-x-1 ${
                            hasAssicurazione 
                              ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30' 
                              : 'bg-slate-900 text-slate-600 border border-slate-800'
                          }`}>
                            <span>Polizza</span>
                            {hasAssicurazione && <span>✓</span>}
                          </span>

                          <span className={`px-2 py-0.5 rounded-md font-bold flex items-center space-x-1 ${
                            hasBollo 
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' 
                              : 'bg-slate-900 text-slate-600 border border-slate-800'
                          }`}>
                            <span>Bollo</span>
                            {hasBollo && <span>✓</span>}
                          </span>
                        </div>

                        <span className="text-[11px] font-bold text-amber-400 group-hover:underline">
                          Apri ➔
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredCars.length === 0 && (
                <div className="p-12 text-center bg-slate-950/40 rounded-3xl border border-dashed border-slate-800 space-y-3">
                  <Folder className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-sm font-bold text-slate-300">Nessuna cartella trovata con i filtri correnti.</p>
                  <p className="text-xs text-slate-500">Prova a modificare i termini di ricerca o a selezionare "Tutte".</p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2 shrink-0">
          <div className="flex items-center space-x-2">
            <HardDrive className="w-4 h-4 text-amber-400" />
            <span>
              Archivio Digitale Protetto: salvataggio istantaneo su Cloud Supabase e memoria locale IndexedDB.
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition-all"
          >
            Chiudi Archivio
          </button>
        </div>

      </div>
    </div>
  );
}
