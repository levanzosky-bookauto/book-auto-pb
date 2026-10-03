import React, { useRef, useState } from 'react';
import { X, Download, Upload, FileSpreadsheet, Check, Database, UploadCloud, Loader2 } from 'lucide-react';
import { syncCarsToSupabase } from '../utils/supabase';

export default function BackupModal({ 
  cars, 
  onClose, 
  onImportData, 
  onResetData 
}) {
  const fileInputRef = useRef(null);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [cloudSynced, setCloudSynced] = useState(false);

  // Sync current local cars dataset straight to Supabase Cloud
  const handleSyncCloud = async () => {
    setIsSyncingCloud(true);
    setCloudSynced(false);
    try {
      const success = await syncCarsToSupabase(cars);
      if (success) {
        setCloudSynced(true);
        setTimeout(() => setCloudSynced(false), 5000);
        alert(`✅ Sincronizzate con successo ${cars.length} vetture e foto sul Cloud! Ora il sito online ha tutte le tue modifiche locali.`);
      } else {
        alert('⚠️ Impossibile sincronizzare sul Cloud. Verifica la connessione internet.');
      }
    } catch (e) {
      alert('Errore durante la sincronizzazione Cloud: ' + e.message);
    } finally {
      setIsSyncingCloud(false);
    }
  };

  // Export JSON backup
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cars, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `book_auto_pb_backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ["ID", "Page", "Brand", "Model", "Immatricolazione", "Chassis VIN", "Cilindrata", "Horsepower", "Esemplari", "Notes"];
    const rows = cars.map(c => [
      `"${c.id}"`,
      `"${c.page}"`,
      `"${c.brand.replace(/"/g, '""')}"`,
      `"${c.model.replace(/"/g, '""')}"`,
      `"${(c.immatricolazione || '').replace(/"/g, '""')}"`,
      `"${(c.chassis || '').replace(/"/g, '""')}"`,
      `"${(c.cilindrata || '').replace(/"/g, '""')}"`,
      `"${(c.horsepower || '').replace(/"/g, '""')}"`,
      `"${(c.esemplari || '').replace(/"/g, '""')}"`,
      `"${(c.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `book_auto_pb_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Import JSON file
  const handleFileChange = (e) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (Array.isArray(parsed)) {
            onImportData(parsed);
            alert(`Ripristinate con successo ${parsed.length} vetture!`);
            onClose();
          } else {
            alert('Il file di backup selezionato non è valido.');
          }
        } catch (err) {
          alert('Errore nella lettura del file JSON: ' + err.message);
        }
      };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div 
        className="glass-panel w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-white/10 my-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Database className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold font-heading text-white">
              Gestione Dati & Backup
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-400 rounded-xl border border-slate-700 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          
          <p className="text-xs text-slate-300">
            Esporta ed importa l'intero database delle vetture per salvare le modifiche o trasferirle tra dispositivi.
          </p>

          <div className="space-y-3 pt-2">
            
            {/* Sync Cloud Online Button */}
            <button
              onClick={handleSyncCloud}
              disabled={isSyncingCloud}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold rounded-2xl transition-all shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-slate-950/30 text-slate-950 rounded-xl border border-slate-950/20">
                  {isSyncingCloud ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : cloudSynced ? (
                    <Check className="w-5 h-5 text-emerald-950" />
                  ) : (
                    <UploadCloud className="w-5 h-5" />
                  )}
                </div>
                <div className="text-left">
                  <p className="text-sm font-extrabold text-slate-950">
                    {isSyncingCloud ? 'Invio Modifiche in Corso...' : cloudSynced ? 'Sito Online Sincronizzato!' : 'Pubblica & Sincronizza Modifiche Locali Online'}
                  </p>
                  <p className="text-xs text-slate-900/80 font-semibold">
                    Invia tutte le foto, vetture e modifiche di questo computer al Cloud per il sito online
                  </p>
                </div>
              </div>
            </button>

            {/* Export JSON */}
            <button
              onClick={handleExportJSON}
              className="w-full flex items-center justify-between p-4 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/50 rounded-2xl transition-all group"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20 group-hover:scale-110 transition-transform">
                  <Download className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-white">Esporta Backup Completo (JSON)</p>
                  <p className="text-xs text-slate-400">Scarica tutte le vetture, foto e modifiche in un unico file</p>
                </div>
              </div>
            </button>

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              className="w-full flex items-center justify-between p-4 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 hover:border-blue-500/50 rounded-2xl transition-all group"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20 group-hover:scale-110 transition-transform">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-white">Esporta Foglio di Calcolo (CSV)</p>
                  <p className="text-xs text-slate-400">Compatibile con Excel, Apple Numbers e Google Sheets</p>
                </div>
              </div>
            </button>

            {/* Import JSON */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-between p-4 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/50 rounded-2xl transition-all group"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 group-hover:scale-110 transition-transform">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-white">Importa File Backup JSON</p>
                  <p className="text-xs text-slate-400">Carica un file di backup salvato in precedenza</p>
                </div>
              </div>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />



          </div>

        </div>

      </div>
    </div>
  );
}
