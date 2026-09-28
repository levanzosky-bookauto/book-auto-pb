import React, { useState, useEffect } from 'react';
import { 
  X, 
  Shield, 
  Upload, 
  Plus, 
  Save, 
  Check, 
  Search, 
  RotateCcw,
  Crop,
  Image as ImageIcon,
  Edit3,
  Trash2
} from 'lucide-react';
import { 
  DEFAULT_BRAND_LOGOS, 
  getCustomBrandLogos, 
  saveCustomBrandLogo, 
  resetCustomBrandLogo, 
  getLogoForBrand,
  renameCustomBrand,
  deleteCustomBrand
} from '../utils/brandLogos';
import ImageCropperModal from './ImageCropperModal';

export default function BrandLogosModal({ 
  onClose, 
  existingBrands = [],
  onLogosUpdated,
  onSelectBrand
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [customLogos, setCustomLogos] = useState({});
  const [savedFeedback, setSavedFeedback] = useState({}); // { [brandKey]: true }
  const [cropperTarget, setCropperTarget] = useState(null); // { brandName, imageSrc }

  // Rename brand state
  const [editingBrand, setEditingBrand] = useState(null);
  const [editingNameValue, setEditingNameValue] = useState('');

  // New Brand Form State
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandLogo, setNewBrandLogo] = useState('');

  // Local editing inputs state per brand
  const [brandInputs, setBrandInputs] = useState({});

  useEffect(() => {
    setCustomLogos(getCustomBrandLogos());
  }, []);

  // Combine default brands, car dataset brands, and any custom added brands
  const allBrands = React.useMemo(() => {
    const set = new Set([
      ...Object.keys(DEFAULT_BRAND_LOGOS).map(b => b.toUpperCase()),
      ...existingBrands.map(b => b.toUpperCase()),
      ...Object.keys(customLogos).map(b => b.toUpperCase())
    ]);
    return Array.from(set).sort();
  }, [existingBrands, customLogos]);

  const filteredBrands = allBrands.filter(b => 
    b.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const handleBrandInputChange = (brand, value) => {
    setBrandInputs(prev => ({ ...prev, [brand]: value }));
  };

  // Upload logo file from computer for an existing brand row
  const handleBrandFileUpload = (brand, e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const logoData = uploadEvent.target.result;
        setBrandInputs(prev => ({ ...prev, [brand]: logoData }));
        // Save immediately
        saveCustomBrandLogo(brand, logoData);
        setCustomLogos(getCustomBrandLogos());
        triggerFeedback(brand);
        if (onLogosUpdated) onLogosUpdated();
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload logo file from computer for new brand
  const handleNewBrandFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setNewBrandLogo(uploadEvent.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveBrandLogo = (brand) => {
    const logoUrl = brandInputs[brand] || getLogoForBrand(brand);
    if (logoUrl) {
      saveCustomBrandLogo(brand, logoUrl);
      setCustomLogos(getCustomBrandLogos());
      triggerFeedback(brand);
      if (onLogosUpdated) onLogosUpdated();
    }
  };

  const handleResetBrandLogo = (brand) => {
    resetCustomBrandLogo(brand);
    setCustomLogos(getCustomBrandLogos());
    setBrandInputs(prev => ({ ...prev, [brand]: '' }));
    triggerFeedback(brand);
    if (onLogosUpdated) onLogosUpdated();
  };

  const handleAddNewBrand = (e) => {
    e.preventDefault();
    if (!newBrandName.trim()) {
      alert('Inserisci il nome del marchio');
      return;
    }
    if (!newBrandLogo.trim()) {
      alert('Inserisci o carica l\'immagine del logo per il nuovo marchio');
      return;
    }

    saveCustomBrandLogo(newBrandName.trim(), newBrandLogo.trim());
    setCustomLogos(getCustomBrandLogos());
    triggerFeedback(newBrandName.trim().toUpperCase());
    
    setNewBrandName('');
    setNewBrandLogo('');
    if (onLogosUpdated) onLogosUpdated();
  };

  const handleStartRenameBrand = (brandName) => {
    setEditingBrand(brandName);
    setEditingNameValue(brandName);
  };

  const handleSaveRenameBrand = (oldBrandName) => {
    const cleanNewName = editingNameValue.trim();
    if (!cleanNewName || cleanNewName.toLowerCase() === oldBrandName.toLowerCase()) {
      setEditingBrand(null);
      return;
    }

    renameCustomBrand(oldBrandName, cleanNewName);
    setEditingBrand(null);
    setCustomLogos(getCustomBrandLogos());
    triggerFeedback(cleanNewName.toUpperCase());
    if (onLogosUpdated) onLogosUpdated();
  };

  const handleDeleteBrandItem = (brandName) => {
    if (window.confirm(`Sei sicuro di voler eliminare la marca "${brandName}"?`)) {
      deleteCustomBrand(brandName);
      setCustomLogos(getCustomBrandLogos());
      if (onLogosUpdated) onLogosUpdated();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div 
        className="glass-panel w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl border border-white/10 my-auto flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/80 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-heading text-white">
                Gestione Marchi Vetture & Loghi
              </h2>
              <p className="text-xs text-slate-400">
                Aggiungi nuovi marchi, rinomina, elimina o carica la foto del logo per qualsiasi auto.
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

        {/* Modal Body Container */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1">
          
          {/* Section 1: Add New Brand & Logo Form */}
          <form onSubmit={handleAddNewBrand} className="bg-slate-900/90 p-5 rounded-2xl border border-amber-500/30 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Aggiungi Nuovo Marchio e Foto Logo</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome Nuovo Marchio (es. Maserati, Pagani...)
                </label>
                <input
                  type="text"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  placeholder="Nome Marchio..."
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Foto Logo (Da File o URL)
                </label>
                <div className="flex space-x-2">
                  <label className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl cursor-pointer text-xs font-semibold transition-all truncate">
                    <Upload className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">{newBrandLogo ? 'Foto Caricata!' : 'Carica File Logo...'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleNewBrandFileUpload}
                      className="hidden"
                    />
                  </label>

                  <input
                    type="text"
                    value={newBrandLogo}
                    onChange={(e) => setNewBrandLogo(e.target.value)}
                    placeholder="URL Logo..."
                    className="w-1/2 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100"
                  />
                </div>
              </div>
            </div>

            {/* Live New Logo Preview */}
            {newBrandLogo && (
              <div className="flex items-center space-x-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <div className="w-12 h-12 rounded-lg bg-white p-1 flex items-center justify-center shrink-0 border border-white/20">
                  <img src={newBrandLogo} alt="Anteprima" className="w-full h-full object-contain" />
                </div>
                <span className="text-xs font-bold text-emerald-400">
                  Foto Logo Pronta per essere Salvata per {newBrandName || 'Nuovo Marchio'}
                </span>
              </div>
            )}

            <button
              type="submit"
              className="w-full flex items-center justify-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Salva Nuovo Marchio nel Database</span>
            </button>
          </form>

          {/* Section 2: Search & List of All Existing Brands */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-sm font-bold text-slate-200">
                Elenco Marchi Registrati ({allBrands.length})
              </h3>

              <div className="relative max-w-xs flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cerca marchio..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100"
                />
              </div>
            </div>

            {/* Brands List Table / Grid */}
            <div className="space-y-3">
              {filteredBrands.map((brandName) => {
                const currentLogo = brandInputs[brandName] || getLogoForBrand(brandName);
                const isCustom = Boolean(customLogos[brandName.toLowerCase()]);
                const isSaved = Boolean(savedFeedback[brandName]);
                const isEditing = editingBrand === brandName;

                return (
                  <div 
                    key={brandName}
                    className="bg-slate-900/70 p-3.5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 hover:border-slate-700 transition-all"
                  >
                    
                    {/* Left: Brand Name & Thumbnail */}
                    <div className="flex items-center space-x-3.5 w-full sm:w-auto shrink-0">
                      <div className="w-14 h-14 rounded-xl bg-white p-1.5 flex items-center justify-center border border-white/20 shrink-0 shadow-sm">
                        {currentLogo ? (
                          <img src={currentLogo} alt={brandName} className="w-full h-full object-contain" />
                        ) : (
                          <Shield className="w-6 h-6 text-slate-400" />
                        )}
                      </div>

                      <div>
                        {isEditing ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={editingNameValue}
                              onChange={(e) => setEditingNameValue(e.target.value)}
                              className="px-2.5 py-1 bg-slate-950 border border-amber-500 rounded-lg text-xs text-white font-bold"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveRenameBrand(brandName)}
                              className="p-1.5 bg-emerald-500 text-slate-950 rounded-lg text-xs font-bold"
                              title="Salva Nuovo Nome Marca"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingBrand(null)}
                              className="p-1.5 bg-slate-800 text-slate-400 rounded-lg text-xs"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-sm text-white font-heading tracking-wide">
                              {brandName}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleStartRenameBrand(brandName)}
                              className="p-1 text-slate-400 hover:text-amber-400 transition-colors"
                              title="Rinomina Marchio"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            {isCustom && (
                              <span className="text-[10px] font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
                                Personalizzato
                              </span>
                            )}
                          </div>
                        )}
                        <p className="text-[11px] text-slate-400">
                          {currentLogo ? 'Logo configurato' : 'Nessun logo predefinito'}
                        </p>
                      </div>
                    </div>

                    {/* Right: Upload File, Select, Edit Input & Save/Delete Actions */}
                    <div className="flex items-center space-x-2 w-full sm:w-auto justify-end flex-wrap gap-y-2">
                      
                      {/* Optional Select Button if opened from Form */}
                      {onSelectBrand && (
                        <button
                          type="button"
                          onClick={() => { onSelectBrand(brandName); onClose(); }}
                          className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold transition-all"
                          title="Seleziona questa marca nella scheda auto"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Seleziona</span>
                        </button>
                      )}

                      {/* Upload File Button */}
                      <label className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl cursor-pointer text-xs font-semibold transition-all">
                        <Upload className="w-3.5 h-3.5 text-amber-400" />
                        <span>Foto Logo...</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleBrandFileUpload(brandName, e)}
                          className="hidden"
                        />
                      </label>

                      {/* URL input */}
                      <input
                        type="text"
                        value={brandInputs[brandName] !== undefined ? brandInputs[brandName] : (customLogos[brandName.toLowerCase()] || '')}
                        onChange={(e) => handleBrandInputChange(brandName, e.target.value)}
                        placeholder="URL logo..."
                        className="w-32 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100"
                      />

                      {/* Crop Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (currentLogo) {
                            setCropperTarget({ brandName, imageSrc: currentLogo });
                          }
                        }}
                        disabled={!currentLogo}
                        className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 rounded-xl border border-slate-700 text-xs font-semibold transition-all"
                        title="Ritaglia Logo (1:1)"
                      >
                        <Crop className="w-3.5 h-3.5 text-amber-400" />
                      </button>

                      {/* Save Button */}
                      <button
                        onClick={() => handleSaveBrandLogo(brandName)}
                        className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                          isSaved
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {isSaved ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Ok!</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5" />
                            <span>Salva</span>
                          </>
                        )}
                      </button>

                      {/* Delete / Reset Button */}
                      <button
                        onClick={() => handleDeleteBrandItem(brandName)}
                        className="p-1.5 bg-slate-800 hover:bg-rose-500 hover:text-white text-rose-400 rounded-xl border border-slate-700 text-xs transition-all"
                        title="Elimina Marchio dal Database"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                    </div>

                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 bg-slate-900/80 border-t border-white/10 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all"
          >
            Chiudi Gestione Loghi
          </button>
        </div>

      </div>

      {/* Interactive Image Cropper Modal */}
      {cropperTarget && (
        <ImageCropperModal
          imageSrc={cropperTarget.imageSrc}
          aspectRatio={1}
          title={`Ritaglia & Modifica Logo - ${cropperTarget.brandName}`}
          onCropSave={(croppedUrl) => {
            saveCustomBrandLogo(cropperTarget.brandName, croppedUrl);
            setBrandInputs(prev => ({ ...prev, [cropperTarget.brandName]: croppedUrl }));
            setCustomLogos(getCustomBrandLogos());
            if (onLogosUpdated) onLogosUpdated();
          }}
          onClose={() => setCropperTarget(null)}
        />
      )}

    </div>
  );
}
