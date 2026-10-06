import React, { useRef } from 'react';
import { X, Download, Upload, FileSpreadsheet, Database } from 'lucide-react';
import { getUsers, saveUsers, getBackgroundImages, saveBackgroundImages } from '../utils/auth';
import { getCustomBrandLogos } from '../utils/brandLogos';

export default function BackupModal({ 
  cars, 
  onClose, 
  onImportData, 
  onResetData 
}) {
  const fileInputRef = useRef(null);

  // Export JSON backup (Full site payload: cars, users, backgrounds, custom logos)
  const handleExportJSON = () => {
    try {
      const backupPayload = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        cars: cars,
        users: getUsers(),
        backgrounds: getBackgroundImages(),
        customLogos: getCustomBrandLogos()
      };
      const jsonStr = JSON.stringify(backupPayload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `book_auto_pb_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting JSON:', err);
      alert('Errore durante l\'esportazione del backup JSON: ' + err.message);
    }
  };

  // Export CSV (Excel compatible with UTF-8 BOM & Semicolon separator)
  const handleExportCSV = () => {
    try {
      const headers = ["ID", "Page", "Brand", "Model", "Immatricolazione", "Chassis VIN", "Cilindrata", "Horsepower", "Esemplari", "Notes", "Ubicazione"];
      const rows = cars.map(c => [
        `"${c.id}"`,
        `"${c.page || 0}"`,
        `"${(c.brand || '').replace(/"/g, '""')}"`,
        `"${(c.model || '').replace(/"/g, '""')}"`,
        `"${(c.immatricolazione || '').replace(/"/g, '""')}"`,
        `"${(c.chassis || '').replace(/"/g, '""')}"`,
        `"${(c.cilindrata || '').replace(/"/g, '""')}"`,
        `"${(c.horsepower || '').replace(/"/g, '""')}"`,
        `"${(c.esemplari || '').replace(/"/g, '""')}"`,
        `"${(c.notes || '').replace(/"/g, '""')}"`,
        `"${(c.location || '').replace(/"/g, '""')}"`
      ]);

      const csvString = "\uFEFF" + [headers.join(";"), ...rows.map(e => e.join(";"))].join("\n");
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `book_auto_pb_export_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting CSV:', err);
      alert('Errore durante l\'esportazione CSV: ' + err.message);
    }
  };

  // Import JSON file (handles both full backup objects and legacy raw car arrays)
  const handleFileChange = (e) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (Array.isArray(parsed)) {
            onImportData(parsed);
            alert(`✅ Ripristinate con successo ${parsed.length} vetture dal file di backup!`);
            onClose();
          } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.cars)) {
            onImportData(parsed.cars);
            if (Array.isArray(parsed.users) && parsed.users.length > 0) {
              saveUsers(parsed.users);
            }
            if (Array.isArray(parsed.backgrounds) && parsed.backgrounds.length > 0) {
              saveBackgroundImages(parsed.backgrounds);
            }
            if (parsed.customLogos && typeof parsed.customLogos === 'object') {
              localStorage.setItem('book_auto_pb_custom_brand_logos_v1', JSON.stringify(parsed.customLogos));
            }
            alert(`✅ Ripristino completo eseguito con successo! (${parsed.cars.length} vetture, utenti ed impostazioni ripristinati)`);
            onClose();
            window.location.reload();
          } else {
            alert('⚠️ Il file di backup selezionato non è valido.');
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
        className="glass-panel w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-white/10 my-auto flex flex-col max-h-[90vh]"
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
            Esporta ed importa l'intero database delle vetture per salvare le modifiche sul computer o trasferirle tra dispositivi.
          </p>

          <div className="space-y-3 pt-2">

            {/* Export JSON */}
            <button
              onClick={handleExportJSON}
              className="w-full flex items-center justify-between p-4 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/50 rounded-2xl transition-all group cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20 group-hover:scale-110 transition-transform">
                  <Download className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-white">Esporta Backup Completo (JSON)</p>
                  <p className="text-xs text-slate-400">Scarica tutte le vetture, foto, utenti e impostazioni in un unico file</p>
                </div>
              </div>
            </button>

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              className="w-full flex items-center justify-between p-4 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 hover:border-blue-500/50 rounded-2xl transition-all group cursor-pointer"
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
              className="w-full flex items-center justify-between p-4 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/50 rounded-2xl transition-all group cursor-pointer"
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
