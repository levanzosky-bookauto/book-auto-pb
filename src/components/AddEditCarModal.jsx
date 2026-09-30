import React, { useState, useEffect } from 'react';
import { 
  X, 
  Car, 
  Upload, 
  Plus, 
  Trash2, 
  Save, 
  Image as ImageIcon,
  Check,
  Shield,
  ChevronLeft,
  ChevronRight,
  Star,
  Crop,
  FileText,
  Info,
  Wrench,
  Calendar,
  Euro,
  ShieldCheck,
  FileCheck,
  MapPin,
  Edit3,
  Paperclip,
  Eye,
  Download,
  Printer
} from 'lucide-react';
import { getLogoForBrand, saveCustomBrandLogo, resetCustomBrandLogo } from '../utils/brandLogos';
import { getLocations, addLocation, removeLocation, renameLocation } from '../utils/locations';
import { openDocument, downloadDocument } from '../utils/documentViewer';
import ImageCropperModal from './ImageCropperModal';
import BrandLogosModal from './BrandLogosModal';

export { getLogoForBrand };

// Helper Tooltip Component for Form Fields
const InfoTooltip = ({ text }) => {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-block ml-1.5 z-20">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={(e) => { e.preventDefault(); setShow(!show); }}
        className="text-slate-400 hover:text-amber-400 focus:outline-none transition-colors align-middle cursor-help"
        title={text}
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {show && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 w-60 p-2.5 bg-slate-950 text-slate-200 text-[11px] leading-snug rounded-xl border border-amber-500/40 shadow-2xl backdrop-blur-md z-40 pointer-events-none animate-fade-in font-sans font-normal">
          {text}
        </div>
      )}
    </span>
  );
};

export default function AddEditCarModal({ 
  carToEdit, 
  onClose, 
  onSaveCar, 
  existingBrands 
}) {
  const [activeFormTab, setActiveFormTab] = useState('general'); // 'general' | 'extended'

  const [availableLocations, setAvailableLocations] = useState(() => getLocations());
  const [isManagingLocations, setIsManagingLocations] = useState(false);
  const [isManagingBrands, setIsManagingBrands] = useState(false);
  const [newLocInput, setNewLocInput] = useState('');
  const [editingLocName, setEditingLocName] = useState(null);
  const [editingValue, setEditingValue] = useState('');

  const [formData, setFormData] = useState({
    brand: '',
    customBrand: '',
    model: '',
    location: '',
    customLocation: '',
    immatricolazione: '',
    chassis: '',
    cilindrata: '',
    horsepower: '',
    esemplari: '',
    notes: '',
    images: [],
    customLogoImg: '',
    documents: [],
    
    // Extended Documents, Maintenance & TCO Data
    targa: '',
    tipoMotore: '',
    codiceColore: '',
    pneumatici: '',
    scadenzaRevisione: '',
    scadenzaBollo: '',
    scadenzaAssicurazione: '',
    contattiEmergenza: '',
    ultimoTagliandoData: '',
    ultimoTagliandoKm: '',
    prossimoTagliandoData: '',
    prossimoTagliandoKm: '',
    interventiManutenzione: '',
    pneumaticiStagione: '',
    mediaConsumi: '',
    costoMedioPieno: '',
    costoAnnoAssicurazione: '',
    costoAnnoBollo: '',
    costiManutenzioneAnnua: '',
    noteAnomalie: ''
  });

  const [imageInputUrl, setImageInputUrl] = useState('');
  const [cropperTarget, setCropperTarget] = useState(null); // { index: number | 'logo', imageSrc: string, aspect: number }

  useEffect(() => {
    const currentLocs = getLocations();
    setAvailableLocations(currentLocs);

    if (carToEdit) {
      const locVal = carToEdit.location || '';
      const isKnownLoc = currentLocs.includes(locVal);

      setFormData({
        brand: existingBrands.includes(carToEdit.brand) ? carToEdit.brand : 'Altro',
        customBrand: existingBrands.includes(carToEdit.brand) ? '' : carToEdit.brand,
        model: carToEdit.model || '',
        location: isKnownLoc ? locVal : (locVal ? 'Altro' : ''),
        customLocation: !isKnownLoc ? locVal : '',
        immatricolazione: carToEdit.immatricolazione || '',
        chassis: carToEdit.chassis || '',
        cilindrata: carToEdit.cilindrata || '',
        horsepower: carToEdit.horsepower || '',
        esemplari: carToEdit.esemplari || '',
        notes: carToEdit.notes || '',
        images: carToEdit.images ? [...carToEdit.images] : [],
        customLogoImg: carToEdit.logoImg || '',
        documents: carToEdit.documents ? [...carToEdit.documents] : [],

        // Extended fields
        targa: carToEdit.targa || '',
        tipoMotore: carToEdit.tipoMotore || '',
        codiceColore: carToEdit.codiceColore || '',
        pneumatici: carToEdit.pneumatici || '',
        scadenzaRevisione: carToEdit.scadenzaRevisione || '',
        scadenzaBollo: carToEdit.scadenzaBollo || '',
        scadenzaAssicurazione: carToEdit.scadenzaAssicurazione || '',
        contattiEmergenza: carToEdit.contattiEmergenza || '',
        ultimoTagliandoData: carToEdit.ultimoTagliandoData || '',
        ultimoTagliandoKm: carToEdit.ultimoTagliandoKm || '',
        prossimoTagliandoData: carToEdit.prossimoTagliandoData || '',
        prossimoTagliandoKm: carToEdit.prossimoTagliandoKm || '',
        interventiManutenzione: carToEdit.interventiManutenzione || '',
        pneumaticiStagione: carToEdit.pneumaticiStagione || '',
        mediaConsumi: carToEdit.mediaConsumi || '',
        costoMedioPieno: carToEdit.costoMedioPieno || '',
        costoAnnoAssicurazione: carToEdit.costoAnnoAssicurazione || '',
        costoAnnoBollo: carToEdit.costoAnnoBollo || '',
        costiManutenzioneAnnua: carToEdit.costiManutenzioneAnnua || '',
        noteAnomalie: carToEdit.noteAnomalie || ''
      });
    }
  }, [carToEdit, existingBrands]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle document file upload (PDF or scanned image)
  const handleDocumentFileUpload = (e, targetCategory = 'altro') => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const fileData = uploadEvent.target.result;
      const fileType = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

      let defaultTitle = 'Documento Vettura';
      if (targetCategory === 'libretto') defaultTitle = 'Libretto di Circolazione';
      else if (targetCategory === 'assicurazione') defaultTitle = 'Polizza Assicurativa';
      else if (targetCategory === 'bollo') defaultTitle = 'Ricevuta Bollo Pagato';
      else defaultTitle = file.name.replace(/\.[^/.]+$/, '');

      const newDoc = {
        id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        category: targetCategory,
        title: defaultTitle,
        fileName: file.name,
        fileType: fileType,
        fileData: fileData,
        uploadedAt: new Date().toISOString().slice(0, 10)
      };

      setFormData(prev => ({
        ...prev,
        documents: [...(prev.documents || []), newDoc]
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveDocument = (docId) => {
    if (window.confirm('Sei sicuro di voler eliminare questo documento allegato?')) {
      setFormData(prev => ({
        ...prev,
        documents: (prev.documents || []).filter(d => d.id !== docId)
      }));
    }
  };

  // Handle local logo file upload (converts to base64 DataURL)
  const handleLogoFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setFormData(prev => ({
          ...prev,
          customLogoImg: uploadEvent.target.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle local car photos file upload (converts to base64 DataURL)
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, uploadEvent.target.result]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  // Handle adding image via URL
  const handleAddImageUrl = () => {
    if (imageInputUrl.trim()) {
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, imageInputUrl.trim()]
      }));
      setImageInputUrl('');
    }
  };

  const handleRemoveImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleMoveImage = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= formData.images.length) return;
    const updated = [...formData.images];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setFormData(prev => ({ ...prev, images: updated }));
  };

  const handleMakeCover = (index) => {
    if (index === 0) return;
    const updated = [...formData.images];
    const [moved] = updated.splice(index, 1);
    updated.unshift(moved);
    setFormData(prev => ({ ...prev, images: updated }));
  };

  const selectedBrandName = formData.brand === 'Altro' ? formData.customBrand : formData.brand;
  const activeLogoUrl = formData.customLogoImg.trim() || getLogoForBrand(selectedBrandName) || carToEdit?.logoImg || null;

  const handleSubmit = (e) => {
    e.preventDefault();

    const finalBrand = formData.brand === 'Altro' ? formData.customBrand.trim() : formData.brand;

    if (!finalBrand || !formData.model.trim()) {
      alert('Per favore inserisci sia la Marca che il Modello della vettura.');
      return;
    }

    const assignedLogo = formData.customLogoImg.trim() || getLogoForBrand(finalBrand) || carToEdit?.logoImg || null;

    // Permanently save brand-to-logo mapping into database/localStorage
    if (assignedLogo && finalBrand) {
      saveCustomBrandLogo(finalBrand, assignedLogo);
    }

    const finalLocation = formData.location === 'Altro' ? formData.customLocation.trim() : formData.location.trim();
    if (formData.location === 'Altro' && finalLocation) {
      addLocation(finalLocation);
    }

    const savedCar = {
      id: carToEdit ? carToEdit.id : `car_new_${Date.now()}`,
      page: carToEdit ? carToEdit.page : 0,
      brand: finalBrand,
      model: formData.model.trim(),
      location: finalLocation,
      immatricolazione: formData.immatricolazione.trim(),
      chassis: formData.chassis.trim(),
      cilindrata: formData.cilindrata.trim(),
      horsepower: formData.horsepower.trim(),
      esemplari: formData.esemplari.trim(),
      notes: formData.notes.trim(),
      images: formData.images,
      carPhotos: formData.images,
      logoImg: assignedLogo,
      mainPhoto: formData.images.length > 0 ? formData.images[0] : (carToEdit?.mainPhoto || carToEdit?.pageImage || './images/cars/car_2_page.jpg'),
      pageImage: formData.images.length > 0 ? formData.images[0] : (carToEdit?.pageImage || './images/cars/car_2_page.jpg'),
      isFavorite: carToEdit ? carToEdit.isFavorite : false,

      // Extended Fields (Documenti, Manutenzione, Costi, Viaggi)
      documents: formData.documents || [],
      targa: formData.targa.trim(),
      tipoMotore: formData.tipoMotore.trim(),
      codiceColore: formData.codiceColore.trim(),
      pneumatici: formData.pneumatici.trim(),
      scadenzaRevisione: formData.scadenzaRevisione.trim(),
      scadenzaBollo: formData.scadenzaBollo.trim(),
      scadenzaAssicurazione: formData.scadenzaAssicurazione.trim(),
      contattiEmergenza: formData.contattiEmergenza.trim(),
      ultimoTagliandoData: formData.ultimoTagliandoData.trim(),
      ultimoTagliandoKm: formData.ultimoTagliandoKm.trim(),
      prossimoTagliandoData: formData.prossimoTagliandoData.trim(),
      prossimoTagliandoKm: formData.prossimoTagliandoKm.trim(),
      interventiManutenzione: formData.interventiManutenzione.trim(),
      pneumaticiStagione: formData.pneumaticiStagione.trim(),
      mediaConsumi: formData.mediaConsumi.trim() ? (formData.mediaConsumi.toLowerCase().includes('l') || formData.mediaConsumi.toLowerCase().includes('km') ? formData.mediaConsumi.trim() : `${formData.mediaConsumi.trim()} km/L`) : '',
      costoMedioPieno: formData.costoMedioPieno.trim(),
      costoAnnoAssicurazione: formData.costoAnnoAssicurazione.trim() ? (formData.costoAnnoAssicurazione.includes('€') ? formData.costoAnnoAssicurazione.trim() : `${formData.costoAnnoAssicurazione.trim()} €`) : '',
      costoAnnoBollo: formData.costoAnnoBollo.trim() ? (formData.costoAnnoBollo.includes('€') ? formData.costoAnnoBollo.trim() : `${formData.costoAnnoBollo.trim()} €`) : '',
      costiManutenzioneAnnua: formData.costiManutenzioneAnnua.trim() ? (formData.costiManutenzioneAnnua.includes('€') ? formData.costiManutenzioneAnnua.trim() : `${formData.costiManutenzioneAnnua.trim()} €`) : '',
      noteAnomalie: formData.noteAnomalie.trim()
    };

    onSaveCar(savedCar);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div 
        className="glass-panel w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-white/10 my-auto flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/60 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Car className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold font-heading text-white">
              {carToEdit ? 'Modifica Dati Vettura' : 'Inserimento Nuova Auto'}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-400 rounded-xl border border-slate-700 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2-Tab Form Navigation Bar */}
        <div className="flex border-b border-white/10 bg-slate-900/90 text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => setActiveFormTab('general')}
            className={`flex-1 py-3 px-4 flex items-center justify-center space-x-2 border-b-2 transition-all ${
              activeFormTab === 'general'
                ? 'border-amber-400 text-amber-400 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Car className="w-4 h-4" />
            <span>1. Dati Principali & Foto</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFormTab('extended')}
            className={`flex-1 py-3 px-4 flex items-center justify-center space-x-2 border-b-2 transition-all ${
              activeFormTab === 'extended'
                ? 'border-amber-400 text-amber-400 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>2. Documenti, Manutenzione & Costi</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px]">
              Avanzato
            </span>
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5 flex-1">
          {activeFormTab === 'general' ? (
            <div className="space-y-5 animate-fade-in">
          
          {/* Brand Logo Selection, File Upload & Custom URL Section */}
          <div className="bg-slate-900/90 p-4 rounded-2xl border border-amber-500/30 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  Logo Marchio / Veicolo (Salvato nel Database)
                </span>
              </div>
              {formData.customLogoImg && (
                <button
                  type="button"
                  onClick={() => {
                    resetCustomBrandLogo(selectedBrandName);
                    setFormData(prev => ({ ...prev, customLogoImg: '' }));
                  }}
                  className="text-[11px] font-semibold text-slate-400 hover:text-amber-400 underline"
                >
                  Ripristina Predefinito
                </button>
              )}
            </div>

            <div className="flex items-center space-x-4">
              {/* Preview Box */}
              <div className="w-16 h-16 rounded-2xl bg-white p-2 border border-white/20 flex items-center justify-center shrink-0 shadow-md">
                {activeLogoUrl ? (
                  <img src={activeLogoUrl} alt={selectedBrandName || 'Logo'} className="w-full h-full object-contain" />
                ) : (
                  <Shield className="w-8 h-8 text-slate-400" />
                )}
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <label className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl cursor-pointer text-xs font-semibold transition-all">
                    <Upload className="w-3.5 h-3.5 text-amber-400" />
                    <span>Carica Foto Logo Marchio</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileUpload}
                      className="hidden"
                    />
                  </label>

                  {activeLogoUrl && (
                    <button
                      type="button"
                      onClick={() => setCropperTarget({ index: 'logo', imageSrc: activeLogoUrl, aspect: 1 })}
                      className="flex items-center space-x-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded-xl text-xs font-bold transition-all shrink-0"
                      title="Ritaglia & Modifica Logo (1:1 per 6x6cm)"
                    >
                      <Crop className="w-3.5 h-3.5" />
                      <span>Ritaglia Logo</span>
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  name="customLogoImg"
                  value={formData.customLogoImg}
                  onChange={handleChange}
                  placeholder="Oppure incolla URL foto logo..."
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                />
              </div>
            </div>
          </div>

          {/* Brand & Model Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Brand Select with Popup Manager Button */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-300">
                  Marca Vettura <span className="text-amber-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsManagingBrands(true)}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded-lg border border-amber-500/30 transition-all"
                  title="Modifica, rinomina, aggiungi o cancella marchi vetture"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Modifica Elenco Marchi</span>
                </button>
              </div>

              <div className="flex gap-2">
                <select
                  name="brand"
                  value={formData.brand}
                  onChange={handleChange}
                  className="flex-1 px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  required
                >
                  <option value="">Seleziona Marca...</option>
                  {existingBrands.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                  <option value="Altro">+ Nuova Marca / Altro</option>
                </select>

                <button
                  type="button"
                  onClick={() => setIsManagingBrands(true)}
                  className="p-2.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-amber-400 rounded-xl border border-slate-700 transition-all shrink-0"
                  title="Apri popup gestione marchi"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Custom Brand if Altro */}
            {formData.brand === 'Altro' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome Nuova Marca <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  name="customBrand"
                  value={formData.customBrand}
                  onChange={handleChange}
                  placeholder="Es. Pagani, Bugatti, Koenigsegg..."
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  required
                />
              </div>
            )}

            {/* Model Input */}
            <div className={formData.brand === 'Altro' ? 'sm:col-span-2' : ''}>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Modello / Versione <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                name="model"
                value={formData.model}
                onChange={handleChange}
                placeholder="Es. MC20, Huayra, GT3 RS..."
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                required
              />
            </div>

          </div>

          {/* Technical Specs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Immatricolazione */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Immatricolazione / Anno
              </label>
              <input
                type="text"
                name="immatricolazione"
                value={formData.immatricolazione}
                onChange={handleChange}
                placeholder="Es. 2024 oppure 15/05/1992"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

            {/* N° Telaio */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Numero di Telaio (VIN)
              </label>
              <input
                type="text"
                name="chassis"
                value={formData.chassis}
                onChange={handleChange}
                placeholder="Es.  ZFF812..."
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm font-mono text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

            {/* Cilindrata */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Cilindrata (cc / Motore)
              </label>
              <input
                type="text"
                name="cilindrata"
                value={formData.cilindrata}
                onChange={handleChange}
                placeholder="Es. 3.996"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

            {/* Cavalli */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Potenza (Cavalli CV)
              </label>
              <input
                type="text"
                name="horsepower"
                value={formData.horsepower}
                onChange={handleChange}
                placeholder="Es. 525"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

            {/* Esemplari */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Esemplari Prodotti / Tiratura
              </label>
              <input
                type="text"
                name="esemplari"
                value={formData.esemplari}
                onChange={handleChange}
                placeholder="Es. 500 oppure Serie Limitata"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

          </div>

          {/* Notes Section */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Note Aggiuntive & Condizioni
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              placeholder="Inserisci dettagli su restauro, proprietari precedenti, colore, optional..."
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          {/* Photos Upload Section */}
          <div className="space-y-3 pt-2">
            <label className="block text-xs font-semibold text-slate-300">
              Galleria Foto Vettura
            </label>

            {/* File Upload Box */}
            <div className="flex flex-col sm:flex-row gap-3">
              <label className="flex-1 flex items-center justify-center space-x-2 p-3 bg-slate-900 hover:bg-slate-800 border-2 border-dashed border-slate-700 hover:border-amber-500 rounded-xl cursor-pointer transition-all text-xs text-slate-300 font-semibold">
                <Upload className="w-4 h-4 text-amber-400" />
                <span>Carica Foto da Dispositivo / Fotocamera</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <div className="flex space-x-2">
                <input
                  type="text"
                  value={imageInputUrl}
                  onChange={(e) => setImageInputUrl(e.target.value)}
                  placeholder="Incolla URL Immagine..."
                  className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100"
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded-xl text-xs font-bold"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Uploaded Images Preview Thumbnails with Reordering */}
            {formData.images.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-[11px] text-slate-400 font-medium">
                  Usa le frecce <span className="text-amber-400 font-bold">← →</span> per spostare le foto avanti/indietro. La prima foto in alto a sinistra sarà l'anteprima del sito.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {formData.images.map((img, idx) => (
                    <div 
                      key={idx} 
                      className={`relative group aspect-[4/3] rounded-2xl overflow-hidden border-2 bg-slate-950 flex flex-col justify-between p-1 transition-all ${
                        idx === 0 
                          ? 'border-amber-400 ring-2 ring-amber-400/40 shadow-lg shadow-amber-500/20' 
                          : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover rounded-xl" />
                      
                      {/* Cover Badge */}
                      {idx === 0 && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 bg-amber-500 text-slate-950 font-extrabold text-[10px] rounded-md shadow-md flex items-center space-x-1 z-10">
                          <Star className="w-3 h-3 fill-slate-950" />
                          <span>Copertina Sito</span>
                        </span>
                      )}

                      {/* Reordering & Action Controls Bar */}
                      <div className="absolute bottom-2 inset-x-2 flex items-center justify-between bg-slate-950/85 backdrop-blur-md p-1 rounded-xl border border-white/10 opacity-90 group-hover:opacity-100 transition-opacity z-10">
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveImage(idx, idx - 1)}
                            className="p-1 text-slate-300 hover:text-amber-400 disabled:opacity-30 disabled:hover:text-slate-300"
                            title="Sposta Prima (Avanti)"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === formData.images.length - 1}
                            onClick={() => handleMoveImage(idx, idx + 1)}
                            className="p-1 text-slate-300 hover:text-amber-400 disabled:opacity-30 disabled:hover:text-slate-300"
                            title="Sposta Dopo (Indietro)"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>

                        {idx > 0 && (
                          <button
                            type="button"
                            onClick={() => handleMakeCover(idx)}
                            className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 rounded-lg text-[10px] font-bold transition-all"
                            title="Imposta come prima foto (Copertina)"
                          >
                            Metti Prima
                          </button>
                        )}

                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => setCropperTarget({ index: idx, imageSrc: img, aspect: 4/3 })}
                            className="p-1 text-slate-300 hover:text-amber-400 transition-colors"
                            title="Ritaglia & Modifica Foto (4:3)"
                          >
                            <Crop className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                            title="Elimina Foto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      ) : (
        /* TAB 2: DOCUMENTI, SCADENZE, MANUTENZIONE & COSTI */
            <div className="space-y-5 animate-fade-in">
              
              {/* 1. Dati Generali del Veicolo & Documenti Omologativi */}
              <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center">
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  <span>1. Dati Generali del Veicolo & Documenti</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                  <div className="flex flex-col justify-end h-full">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Targa Veicolo <InfoTooltip text="Targa automobilistica per la verifica dei documenti e dello storico ministeriale." />
                    </label>
                    <input
                      type="text"
                      name="targa"
                      value={formData.targa}
                      onChange={handleChange}
                      placeholder="Es. AB 123 CD"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-100"
                    />
                  </div>

                  <div className="flex flex-col justify-end h-full">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Tipo Motore / Alimentazione <InfoTooltip text="Tipo di propulsore (es. V8 Bi-Turbo, V12 Aspirato, Ibrido, Elettrico)." />
                    </label>
                    <input
                      type="text"
                      name="tipoMotore"
                      value={formData.tipoMotore}
                      onChange={handleChange}
                      placeholder="Es. V8 Bi-Turbo, V12 Aspirato..."
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100"
                    />
                  </div>

                  <div className="flex flex-col justify-end h-full">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Codice Colore Carrozzeria <InfoTooltip text="Codice colore originale del produttore per eventuali ritocchi o restauri." />
                    </label>
                    <input
                      type="text"
                      name="codiceColore"
                      value={formData.codiceColore}
                      onChange={handleChange}
                      placeholder="Es. Rosso Corsa DS 322"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100"
                    />
                  </div>

                  <div className="flex flex-col justify-end h-full">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Misura Pneumatici Omologati <InfoTooltip text="Misure approvate a libretto per pneumatici estivi e invernali." />
                    </label>
                    <input
                      type="text"
                      name="pneumatici"
                      value={formData.pneumatici}
                      onChange={handleChange}
                      placeholder="Es. 245/35 R19 - 305/30 R20"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100"
                    />
                  </div>

                  {/* Collocazione Fisica / Ubicazione Veicolo */}
                  <div className="sm:col-span-2 flex flex-col justify-end h-full pt-2 border-t border-slate-800/80">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center">
                        <MapPin className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                        <span>Collocazione Fisica / Ubicazione (Garage / Casa / Deposito)</span>
                        <InfoTooltip text="Luogo di stazionamento fisico della vettura (es. Garage Milano, Residenza Mare, Deposito)." />
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsManagingLocations(true)}
                        className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/30 transition-all"
                        title="Gestisci ed edita voci collocazioni in autonomia"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Modifica Elenco Voci</span>
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <select
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      >
                        <option value="">Seleziona Ubicazione (Opzionale)...</option>
                        {availableLocations.map(loc => (
                          <option key={loc} value={loc}>{loc}</option>
                        ))}
                        <option value="Altro">+ Nuova Collocazione / Garage...</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => setIsManagingLocations(true)}
                        className="p-2.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-amber-400 rounded-xl border border-slate-700 transition-all shrink-0"
                        title="Modifica, aggiungi o cancella collocazioni"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>

                    {formData.location === 'Altro' && (
                      <input
                        type="text"
                        name="customLocation"
                        value={formData.customLocation}
                        onChange={handleChange}
                        placeholder="Nome Nuovo Garage / Casa..."
                        className="w-full mt-2 px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        required
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Scadenze Ministeriali & Contatti Emergenza */}
              <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>2. Scadenze Ministeriali, Polizza & Contatti</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <div className="flex flex-col justify-end h-full">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Scadenza Revisione <InfoTooltip text="Data limite per l'ispezione periodica ministeriale di legge." />
                    </label>
                    <input
                      type="text"
                      name="scadenzaRevisione"
                      value={formData.scadenzaRevisione}
                      onChange={handleChange}
                      placeholder="Es. 31/10/2026"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100"
                    />
                  </div>

                  <div className="flex flex-col justify-end h-full">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Scadenza Bollo Auto <InfoTooltip text="Data di scadenza del pagamento del bollo automobilistico regionale." />
                    </label>
                    <input
                      type="text"
                      name="scadenzaBollo"
                      value={formData.scadenzaBollo}
                      onChange={handleChange}
                      placeholder="Es. 31/12/2026"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100"
                    />
                  </div>

                  <div className="flex flex-col justify-end h-full">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Scadenza Assicurazione <InfoTooltip text="Scadenza della polizza RC Auto, Furto/Incendio e garanzie." />
                    </label>
                    <input
                      type="text"
                      name="scadenzaAssicurazione"
                      value={formData.scadenzaAssicurazione}
                      onChange={handleChange}
                      placeholder="Es. 15/06/2027"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100"
                    />
                  </div>

                  <div className="sm:col-span-3 flex flex-col justify-end h-full">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Contatti Utili & Soccorso Stradale <InfoTooltip text="Numeri di soccorso stradale, officina di fiducia, concessionario e soccorso chiavi." />
                    </label>
                    <input
                      type="text"
                      name="contattiEmergenza"
                      value={formData.contattiEmergenza}
                      onChange={handleChange}
                      placeholder="Es. Soccorso ACI 803.116, Meccanico 333 1234567"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100"
                    />
                  </div>
                </div>
              </div>

              {/* 2.1 Documenti Scansionati & Allegati (Libretto, Assicurazione, Bollo) */}
              <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center">
                    <Paperclip className="w-4 h-4 mr-2 text-amber-400" />
                    <span>Allegati & Scansioni Documenti (Libretto, Assicurazione, Bollo, PDF)</span>
                  </h3>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {formData.documents ? formData.documents.length : 0} salvati
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Carica i file PDF o le foto scansionate dei documenti della vettura (Libretto di circolazione, Polizza Assicurativa, Ricevuta Bollo pagato o altri allegati). Potrai consultarli, scaricarli e stamparli in qualsiasi momento.
                </p>

                {/* Upload Buttons Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <label className="flex flex-col items-center justify-center p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 rounded-xl cursor-pointer transition-all group text-center">
                    <FileCheck className="w-5 h-5 text-amber-400 mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-slate-200">Libretto</span>
                    <span className="text-[10px] text-slate-400">PDF / Immagine</span>
                    <input 
                      type="file" 
                      accept=".pdf,image/*" 
                      onChange={(e) => handleDocumentFileUpload(e, 'libretto')} 
                      className="hidden" 
                    />
                  </label>

                  <label className="flex flex-col items-center justify-center p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 rounded-xl cursor-pointer transition-all group text-center">
                    <ShieldCheck className="w-5 h-5 text-blue-400 mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-slate-200">Assicurazione</span>
                    <span className="text-[10px] text-slate-400">PDF / Immagine</span>
                    <input 
                      type="file" 
                      accept=".pdf,image/*" 
                      onChange={(e) => handleDocumentFileUpload(e, 'assicurazione')} 
                      className="hidden" 
                    />
                  </label>

                  <label className="flex flex-col items-center justify-center p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 rounded-xl cursor-pointer transition-all group text-center">
                    <Euro className="w-5 h-5 text-emerald-400 mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-slate-200">Bollo Pagato</span>
                    <span className="text-[10px] text-slate-400">PDF / Immagine</span>
                    <input 
                      type="file" 
                      accept=".pdf,image/*" 
                      onChange={(e) => handleDocumentFileUpload(e, 'bollo')} 
                      className="hidden" 
                    />
                  </label>

                  <label className="flex flex-col items-center justify-center p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 rounded-xl cursor-pointer transition-all group text-center">
                    <Plus className="w-5 h-5 text-purple-400 mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-slate-200">Altro Allegato</span>
                    <span className="text-[10px] text-slate-400">Qualsiasi PDF</span>
                    <input 
                      type="file" 
                      accept=".pdf,image/*" 
                      onChange={(e) => handleDocumentFileUpload(e, 'altro')} 
                      className="hidden" 
                    />
                  </label>
                </div>

                {/* List of Loaded Documents */}
                {formData.documents && formData.documents.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    <span className="text-xs font-bold text-slate-300">Documenti Presenti per questa Vettura:</span>
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {formData.documents.map((doc) => (
                        <div 
                          key={doc.id}
                          className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 transition-all text-xs"
                        >
                          <div className="flex items-center space-x-3 overflow-hidden mr-2">
                            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg shrink-0">
                              <Paperclip className="w-4 h-4" />
                            </div>
                            <div className="truncate">
                              <p className="font-bold text-slate-200 truncate">{doc.title}</p>
                              <p className="text-[11px] text-slate-400 truncate">
                                {doc.fileName} • Caricato il {doc.uploadedAt || 'N/D'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => openDocument(doc)}
                              className="p-1.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 rounded-lg transition-all"
                              title="Apri e Visualizza Documento"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => downloadDocument(doc)}
                              className="p-1.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 rounded-lg transition-all"
                              title="Scarica File Originale"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openDocument(doc, true)}
                              className="p-1.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 rounded-lg transition-all"
                              title="Stampa Documento"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveDocument(doc.id)}
                              className="p-1.5 bg-slate-800 hover:bg-rose-500 hover:text-white text-rose-400 rounded-lg transition-all ml-1"
                              title="Elimina Documento"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Registro Manutenzione & Tagliandi */}
              <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center">
                  <Wrench className="w-4 h-4 mr-2" />
                  <span>3. Registro della Manutenzione (Ordinaria & Straordinaria)</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                  <div className="flex flex-col justify-end h-full">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Data Ultimo Tagliando <InfoTooltip text="Data dell'ultimo intervento di manutenzione ordinaria." />
                    </label>
                    <input
                      type="text"
                      name="ultimoTagliandoData"
                      value={formData.ultimoTagliandoData}
                      onChange={handleChange}
                      placeholder="Es. 15/03/2024"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100"
                    />
                  </div>

                  <div className="flex flex-col justify-end h-full">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Km Ultimo Tagliando <InfoTooltip text="Chilometraggio all'ultimo tagliando." />
                    </label>
                    <input
                      type="text"
                      name="ultimoTagliandoKm"
                      value={formData.ultimoTagliandoKm}
                      onChange={handleChange}
                      placeholder="Es. 45.000 km"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100"
                    />
                  </div>

                  <div className="flex flex-col justify-end h-full">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Data Prossimo Tagliando <InfoTooltip text="Data prevista o scadenza limite per il prossimo intervento di manutenzione." />
                    </label>
                    <input
                      type="text"
                      name="prossimoTagliandoData"
                      value={formData.prossimoTagliandoData}
                      onChange={handleChange}
                      placeholder="Es. 15/03/2026"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-amber-500/40 rounded-xl text-sm text-slate-100 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div className="flex flex-col justify-end h-full">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Km Prossimo Tagliando <InfoTooltip text="Chilometraggio massimo raccomandato per la prossima manutenzione." />
                    </label>
                    <input
                      type="text"
                      name="prossimoTagliandoKm"
                      value={formData.prossimoTagliandoKm}
                      onChange={handleChange}
                      placeholder="Es. 60.000 km"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-amber-500/40 rounded-xl text-sm text-slate-100 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div className="sm:col-span-2 flex flex-col justify-end h-full">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Dettagli Interventi (Freni, Olio, Filtri, Distribuzione) <InfoTooltip text="Descrizione dei lavori (olio, filtri, dischi freni, frizione, cinghia, ricarica AC)." />
                    </label>
                    <textarea
                      name="interventiManutenzione"
                      value={formData.interventiManutenzione}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Es. Cambio olio, filtri, dischi e pastiglie freni..."
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100"
                    />
                  </div>

                  <div className="sm:col-span-2 flex flex-col justify-end h-full">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Interventi Pneumatici & Stagione <InfoTooltip text="Storico montaggio gomme estive/invernali, convergenza ed equilibratura." />
                    </label>
                    <input
                      type="text"
                      name="pneumaticiStagione"
                      value={formData.pneumaticiStagione}
                      onChange={handleChange}
                      placeholder="Es. Gomme estive montate a Aprile 2024 (Inversione OK)"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Economia Veicolo, Consumi & Note Meccanico */}
              <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-4">
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center">
                  <Euro className="w-4 h-4 mr-2 text-amber-400 shrink-0" />
                  <span>4. Monitoraggio Consumi, Costi Annui & Diario di Viaggio</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                  <div className="flex flex-col justify-end h-full">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Media Consumi <InfoTooltip text="Media km/L per monitorare l'efficienza del motore nel tempo." />
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="mediaConsumi"
                        value={formData.mediaConsumi}
                        onChange={handleChange}
                        placeholder="Es. 8.5"
                        className="w-full pl-3.5 pr-14 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-extrabold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 pointer-events-none">
                        km/L
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col justify-end h-full">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Costo Assicurazione <InfoTooltip text="Spesa annuale per la polizza assicurativa RC Auto e garanzie." />
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="costoAnnoAssicurazione"
                        value={formData.costoAnnoAssicurazione}
                        onChange={handleChange}
                        placeholder="Es. 1200"
                        className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 pointer-events-none">
                        €
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col justify-end h-full">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Costo Bollo Auto <InfoTooltip text="Importo della tassa automobilistica annuale regionale." />
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="costoAnnoBollo"
                        value={formData.costoAnnoBollo}
                        onChange={handleChange}
                        placeholder="Es. 200"
                        className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 pointer-events-none">
                        €
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col justify-end h-full">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Manutenzione Annua <InfoTooltip text="Spesa totale annua per tagliandi e riparazioni." />
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="costiManutenzioneAnnua"
                        value={formData.costiManutenzioneAnnua}
                        onChange={handleChange}
                        placeholder="Es. 600"
                        className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 pointer-events-none">
                        €
                      </span>
                    </div>
                  </div>

                  <div className="sm:col-span-2 lg:col-span-4 flex flex-col justify-end h-full">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Diario di Viaggio & Note per Meccanico <InfoTooltip text="Spazio per annotare anomalie temporanee, spie o comportamenti sospetti da riferire al meccanico." />
                    </label>
                    <textarea
                      name="noteAnomalie"
                      value={formData.noteAnomalie}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Es. Rumore leggero al minimo a freddo, verificare cinghia al prossimo controllo..."
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100"
                    />
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Modal Footer Submit */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition-all"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>{carToEdit ? 'Salva Modifiche' : 'Inserisci Vettura'}</span>
            </button>
          </div>

        </form>

      </div>

      {/* Interactive Image Cropper Modal */}
      {cropperTarget && (
        <ImageCropperModal
          imageSrc={cropperTarget.imageSrc}
          aspectRatio={cropperTarget.aspect}
          title={cropperTarget.index === 'logo' ? "Ritaglia & Modifica Logo Marchio" : `Ritaglia & Modifica Foto ${cropperTarget.index + 1}`}
          onCropSave={(croppedUrl) => {
            if (cropperTarget.index === 'logo') {
              setFormData(prev => ({ ...prev, customLogoImg: croppedUrl }));
              const finalBrand = (formData.brand === 'Altro' ? formData.customBrand : formData.brand).trim();
              if (finalBrand) {
                saveCustomBrandLogo(finalBrand, croppedUrl);
              }
            } else {
              const updatedImages = [...formData.images];
              updatedImages[cropperTarget.index] = croppedUrl;
              setFormData(prev => ({ ...prev, images: updatedImages }));
            }
            setCropperTarget(null);
          }}
          onClose={() => setCropperTarget(null)}
        />
      )}

      {/* Modal Gestione Collocazioni / Garage */}
      {isManagingLocations && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="glass-panel w-full max-w-md rounded-3xl p-6 border border-amber-500/30 bg-slate-900 shadow-2xl space-y-4 font-sans">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-amber-400">
                <MapPin className="w-5 h-5" />
                <h3 className="font-bold text-base text-white font-heading">Gestisci Collocazioni & Garage</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsManagingLocations(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Modifica i nomi delle collocazioni attive, aggiungine di nuove o rimuovile dall'elenco.
            </p>

            {/* Add New Location Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newLocInput}
                onChange={(e) => setNewLocInput(e.target.value)}
                placeholder="Nuovo garage / casa / deposito..."
                className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newLocInput.trim()) {
                      const updated = addLocation(newLocInput.trim());
                      setAvailableLocations(updated);
                      setNewLocInput('');
                    }
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  if (newLocInput.trim()) {
                    const updated = addLocation(newLocInput.trim());
                    setAvailableLocations(updated);
                    setNewLocInput('');
                  }
                }}
                className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all active:scale-95 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Aggiungi</span>
              </button>
            </div>

            {/* List of locations with Inline Edit & Delete */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {availableLocations.map((loc) => (
                <div key={loc} className="flex items-center justify-between gap-2 p-2.5 bg-slate-950/70 rounded-xl border border-slate-800 hover:border-slate-700 transition-all">
                  {editingLocName === loc ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-amber-500/60 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (editingValue.trim() && editingValue.trim() !== loc) {
                              const updated = renameLocation(loc, editingValue.trim());
                              setAvailableLocations(updated);
                              if (formData.location === loc) {
                                setFormData(prev => ({ ...prev, location: editingValue.trim() }));
                              }
                            }
                            setEditingLocName(null);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (editingValue.trim() && editingValue.trim() !== loc) {
                            const updated = renameLocation(loc, editingValue.trim());
                            setAvailableLocations(updated);
                            if (formData.location === loc) {
                              setFormData(prev => ({ ...prev, location: editingValue.trim() }));
                            }
                          }
                          setEditingLocName(null);
                        }}
                        className="p-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-bold text-xs"
                        title="Salva Modifica Nome"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingLocName(null)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg text-xs"
                        title="Annulla Modifica"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-xs font-semibold text-slate-200">{loc}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingLocName(loc);
                            setEditingValue(loc);
                          }}
                          className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Modifica Nome Collocazione"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Eliminare la collocazione "${loc}"?`)) {
                              const updated = removeLocation(loc);
                              setAvailableLocations(updated);
                              if (formData.location === loc) {
                                setFormData(prev => ({ ...prev, location: '' }));
                              }
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Elimina Collocazione"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsManagingLocations(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-xl transition-all"
              >
                Fatto / Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup Gestione Marchi & Loghi */}
      {isManagingBrands && (
        <BrandLogosModal
          existingBrands={existingBrands}
          onClose={() => setIsManagingBrands(false)}
          onSelectBrand={(selectedBrandName) => {
            setFormData(prev => ({
              ...prev,
              brand: selectedBrandName,
              customBrand: ''
            }));
          }}
        />
      )}

    </div>
  );
}
