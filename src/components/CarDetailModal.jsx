import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Heart, 
  Edit3, 
  Trash2, 
  Copy, 
  Check, 
  Calendar, 
  Gauge, 
  Zap, 
  Award, 
  FileText, 
  Share2, 
  Printer,
  FileSearch,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Star,
  Crop,
  MapPin,
  Paperclip,
  Eye,
  ShieldCheck,
  FileCheck
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ImageCropperModal from './ImageCropperModal';
import { openDocument, downloadDocument } from '../utils/documentViewer';

export default function CarDetailModal({ 
  car, 
  onClose, 
  onToggleFavorite, 
  onEditCar, 
  onDeleteCar,
  onUpdateCarPhotos,
  onOpenPrintPdf
}) {
  const [selectedImgIndex, setSelectedImgIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('photos'); // 'photos' | 'pdf'
  const [copiedVin, setCopiedVin] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const modalContentRef = useRef(null);
  const [cropperTarget, setCropperTarget] = useState(null); // { index: number, imageSrc: string }

  // Local state for instant UI reordering feedback
  const [imagesList, setImagesList] = useState([]);

  useEffect(() => {
    if (car) {
      const imgs = (car.images && car.images.length > 0) 
        ? car.images 
        : (car.carPhotos && car.carPhotos.length > 0 ? car.carPhotos : [car.pageImage]);
      setImagesList(imgs);
    }
  }, [car]);

  if (!car) return null;

  const images = imagesList.length > 0 ? imagesList : (car.images || [car.pageImage]);

  const handleMovePhoto = (e, fromIdx, toIdx) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (toIdx < 0 || toIdx >= images.length) return;
    const updated = [...images];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);

    setImagesList(updated);
    setSelectedImgIndex(toIdx);

    if (onUpdateCarPhotos) {
      onUpdateCarPhotos(car.id, updated);
    }
  };

  const handleMakeCoverPhoto = (e, fromIdx) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (fromIdx === 0) return;
    const updated = [...images];
    const [moved] = updated.splice(fromIdx, 1);
    updated.unshift(moved);

    setImagesList(updated);
    setSelectedImgIndex(0);

    if (onUpdateCarPhotos) {
      onUpdateCarPhotos(car.id, updated);
    }
  };

  const handleDeletePhoto = (e, indexToDelete) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (images.length <= 1) {
      alert("La vettura deve contenere almeno 1 foto.");
      return;
    }
    if (window.confirm("Sei sicuro di voler eliminare questa foto dalla vettura?")) {
      const updated = images.filter((_, i) => i !== indexToDelete);
      setImagesList(updated);
      setSelectedImgIndex(prev => Math.min(prev, updated.length - 1));

      if (onUpdateCarPhotos) {
        onUpdateCarPhotos(car.id, updated);
      }
    }
  };

  const handleDownloadPdf = () => {
    if (onOpenPrintPdf) {
      onOpenPrintPdf(car);
    } else {
      window.print();
    }
  };

  const handleCopyVin = () => {
    if (car.chassis) {
      navigator.clipboard.writeText(car.chassis);
      setCopiedVin(true);
      setTimeout(() => setCopiedVin(false), 2000);
    }
  };

  const handlePrint = () => {
    if (onOpenPrintPdf) {
      onOpenPrintPdf(car);
    } else {
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div 
        className="glass-panel w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl border border-white/10 my-auto flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-white/10 bg-slate-900/80 shrink-0">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
              {car.brand}
            </span>
            <span className="text-sm font-bold text-white font-heading truncate max-w-[200px] sm:max-w-xs">
              {car.model}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Stampa PDF Button */}
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
              title="Stampa PDF"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>Stampa PDF</span>
            </button>

            {/* Scarica PDF Button */}
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-xl text-xs font-semibold border border-amber-500/30 transition-all disabled:opacity-50 cursor-pointer"
              title="Scarica PDF"
            >
              {isDownloadingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Scarica PDF</span>
                </>
              )}
            </button>

            {/* Modifica Dati Button */}
            <button
              onClick={() => onEditCar(car)}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer active:scale-95"
              title="Modifica Dati Vettura"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Modifica Dati</span>
            </button>

            {/* Preferito */}
            <button
              onClick={() => onToggleFavorite(car.id)}
              className={`p-1.5 rounded-xl border transition-all ${
                car.isFavorite
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
              title="Preferito"
            >
              <Heart className={`w-4 h-4 ${car.isFavorite ? 'fill-rose-400' : ''}`} />
            </button>

            {/* Elimina */}
            <button
              onClick={() => {
                if (window.confirm(`Sei sicuro di voler eliminare ${car.brand} ${car.model}?`)) {
                  onDeleteCar(car.id);
                  onClose();
                }
              }}
              className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl transition-all"
              title="Elimina"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Chiudi */}
            <button
              onClick={onClose}
              className="p-1.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-400 rounded-xl border border-slate-700 transition-all ml-1"
              title="Chiudi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div ref={modalContentRef} className="overflow-y-auto p-6 space-y-6 flex-1">
          
          {/* Main Title & Brand Header */}
          <div>
            <div className="flex items-center space-x-2 text-sm text-amber-400 font-bold uppercase tracking-wider mb-1">
              <span>{car.brand}</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold font-heading text-white tracking-tight">
              {car.model || 'Modello Vettura'}
            </h2>
          </div>

          {/* Photos Gallery */}
          <div className="space-y-4">
              
              {/* Main Image Display Box */}
              <div className="relative aspect-[16/10] sm:aspect-[16/9] bg-slate-950 rounded-2xl overflow-hidden border border-white/10 group shadow-inner">
                <img
                  src={images[selectedImgIndex]}
                  alt={`${car.brand} ${car.model}`}
                  className="w-full h-full object-contain"
                />

                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setSelectedImgIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/80 backdrop-blur-md text-white border border-white/20 hover:bg-amber-500 hover:text-slate-950 transition-all"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setSelectedImgIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/80 backdrop-blur-md text-white border border-white/20 hover:bg-amber-500 hover:text-slate-950 transition-all"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnails Bar with Large, Easy-to-Click Reordering Controls */}
              {images.length > 1 && (
                <div className="space-y-3 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">
                      Riordina Foto Galleria ({images.length} foto)
                    </span>
                    <span className="text-[11px] text-amber-400 font-medium">
                      La prima foto (#1) è la <strong>Copertina del Sito</strong>
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 overflow-x-auto pb-4 pt-1 no-scrollbar">
                    {images.map((img, i) => (
                      <div 
                        key={i}
                        className={`relative group w-32 shrink-0 flex flex-col rounded-2xl overflow-hidden border-2 transition-all bg-slate-900 ${
                          i === selectedImgIndex
                            ? 'border-amber-400 ring-2 ring-amber-400/30 shadow-lg shadow-amber-500/20'
                            : 'border-slate-800 opacity-90 hover:opacity-100'
                        }`}
                      >
                        {/* Image Thumbnail */}
                        <div 
                          onClick={() => setSelectedImgIndex(i)}
                          className="w-full h-20 relative bg-slate-950 overflow-hidden cursor-pointer"
                        >
                          <img src={img} alt="" className="w-full h-full object-cover" />
                          
                          {/* Badge 1ª Foto Copertina */}
                          {i === 0 ? (
                            <span className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-amber-500 text-slate-950 font-extrabold text-[10px] rounded-md shadow-md flex items-center space-x-1 z-10">
                              <Star className="w-3 h-3 fill-slate-950" />
                              <span>Copertina</span>
                            </span>
                          ) : (
                            <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-slate-900/80 backdrop-blur-md text-slate-300 font-bold text-[10px] rounded border border-white/10 z-10">
                              #{i + 1}
                            </span>
                          )}
                        </div>

                        {/* Large Action Buttons Toolbar */}
                        <div className="p-1.5 bg-slate-950 flex flex-col space-y-1 border-t border-slate-800">
                          
                          {/* Left / Right Arrow Buttons */}
                          <div className="flex items-center justify-between gap-1">
                            <button
                              type="button"
                              disabled={i === 0}
                              onClick={(e) => handleMovePhoto(e, i, i - 1)}
                              className="flex-1 py-1.5 px-1 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 disabled:opacity-20 disabled:hover:bg-slate-800 disabled:hover:text-slate-200 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center space-x-0.5 cursor-pointer shadow-sm active:scale-95"
                              title="Sposta Foto a Sinistra (Prima)"
                            >
                              <ChevronLeft className="w-4 h-4" />
                              <span className="text-[10px]">Prima</span>
                            </button>

                            <button
                              type="button"
                              disabled={i === images.length - 1}
                              onClick={(e) => handleMovePhoto(e, i, i + 1)}
                              className="flex-1 py-1.5 px-1 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 disabled:opacity-20 disabled:hover:bg-slate-800 disabled:hover:text-slate-200 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center space-x-0.5 cursor-pointer shadow-sm active:scale-95"
                              title="Sposta Foto a Destra (Dopo)"
                            >
                              <span className="text-[10px]">Dopo</span>
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Crop & Edit Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setCropperTarget({ index: i, imageSrc: img });
                            }}
                            className="w-full py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer active:scale-95 mt-1"
                            title="Ritaglia & Modifica Foto (8,5 x 6,5 cm)"
                          >
                            <Crop className="w-3 h-3 text-amber-400" />
                            <span>Ritaglia Foto</span>
                          </button>

                          {/* Set Cover Button if not cover */}
                          {i > 0 && (
                            <button
                              type="button"
                              onClick={(e) => handleMakeCoverPhoto(e, i)}
                              className="w-full py-1 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-slate-950 border border-amber-500/30 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer active:scale-95 mt-1"
                              title="Imposta come prima foto (Copertina del Sito)"
                            >
                              <Star className="w-3 h-3" />
                              <span>Metti Copertina</span>
                            </button>
                          )}

                          {/* Delete Photo Button */}
                          <button
                            type="button"
                            onClick={(e) => handleDeletePhoto(e, i)}
                            className="w-full py-1 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/30 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer active:scale-95 mt-1"
                            title="Elimina questa foto"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Elimina Foto</span>
                          </button>

                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          {/* Technical Specs Section */}
          <div className="space-y-4 pt-2">
            <h3 className="text-lg font-bold font-heading text-white flex items-center">
              <FileText className="w-5 h-5 mr-2 text-amber-400" />
              Scheda Tecnica & Dettagli
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Collocazione Fisica / Posizione */}
              <div className="bg-slate-900/70 p-4 rounded-2xl border border-amber-500/30 flex items-center space-x-3 col-span-1 sm:col-span-2 bg-gradient-to-r from-amber-500/10 via-slate-900/70 to-slate-900/70">
                <div className="p-3 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-500/30 shadow-md">
                  <MapPin className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-amber-400 font-bold uppercase tracking-wider">Collocazione Fisica / Ubicazione</p>
                  <p className="text-base font-extrabold text-white">{car.location || 'Non specificata (Garage Predefinito)'}</p>
                </div>
              </div>

              {/* Immatricolazione */}
              <div className="bg-slate-900/70 p-4 rounded-2xl border border-slate-800 flex items-center space-x-3">
                <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Immatricolazione / Anno</p>
                  <p className="text-base font-bold text-white">{car.immatricolazione || 'Non specificato'}</p>
                </div>
              </div>

              {/* Cilindrata */}
              <div className="bg-slate-900/70 p-4 rounded-2xl border border-slate-800 flex items-center space-x-3">
                <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                  <Gauge className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Cilindrata Motorizzazione</p>
                  <p className="text-base font-bold text-white">{car.cilindrata ? `${car.cilindrata} cc` : 'Non specificato'}</p>
                </div>
              </div>

              {/* Cavalli */}
              <div className="bg-slate-900/70 p-4 rounded-2xl border border-slate-800 flex items-center space-x-3">
                <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Potenza Massima</p>
                  <p className="text-base font-bold text-white">{car.horsepower ? `${car.horsepower} CV` : 'Non specificato'}</p>
                </div>
              </div>

              {/* Esemplari */}
              <div className="bg-slate-900/70 p-4 rounded-2xl border border-slate-800 flex items-center space-x-3">
                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium">Produzione / Esemplari</p>
                  <p className="text-base font-bold text-white">{car.esemplari || 'Non specificato'}</p>
                </div>
              </div>

            </div>

            {/* Numero di Telaio Box */}
            {car.chassis && (
              <div className="bg-slate-900/90 p-4 rounded-2xl border border-amber-500/30 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Numero di Telaio (VIN)</p>
                  <p className="text-lg font-mono font-bold text-white tracking-widest mt-0.5">{car.chassis}</p>
                </div>
                <button
                  onClick={handleCopyVin}
                  className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold transition-all"
                >
                  {copiedVin ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">Copiato!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copia VIN</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Notes Section */}
            {car.notes && (
              <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                <p className="text-xs text-slate-400 font-medium mb-1">Note Aggiuntive & Condizioni</p>
                <p className="text-sm text-slate-200 whitespace-pre-line">{car.notes}</p>
              </div>
            )}

            {/* Scansioni Documenti & Allegati (Libretto, Assicurazione, Bollo) */}
            <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center">
                  <Paperclip className="w-4 h-4 mr-2" />
                  <span>Documenti Scansionati (Libretto, Assicurazione, Bollo, PDF)</span>
                </h4>
                {car.documents && car.documents.length > 0 && (
                  <span className="text-[11px] text-slate-400 font-medium">
                    {car.documents.length} documento/i allegati
                  </span>
                )}
              </div>

              {car.documents && car.documents.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {car.documents.map((doc) => (
                    <div 
                      key={doc.id}
                      className="p-3 bg-slate-950 rounded-xl border border-slate-800 hover:border-amber-500/30 transition-all flex flex-col justify-between space-y-2"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg shrink-0 mt-0.5">
                          <Paperclip className="w-4 h-4" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-slate-200 truncate">{doc.title}</p>
                          <p className="text-[11px] text-slate-400 truncate">{doc.fileName}</p>
                          {doc.uploadedAt && (
                            <p className="text-[10px] text-slate-500">Caricato: {doc.uploadedAt}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 pt-1 border-t border-slate-800/80">
                        <button
                          type="button"
                          onClick={() => openDocument(doc)}
                          className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Apri</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadDocument(doc)}
                          className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Scarica</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openDocument(doc, true)}
                          className="py-1.5 px-2 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 rounded-lg text-xs font-bold transition-all flex items-center justify-center"
                          title="Stampa Documento"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Nessun documento scansionato allegato a questa vettura. Clicca su "Modifica Dati" per caricare il Libretto, la Polizza Assicurativa o la ricevuta del Bollo in PDF.
                </p>
              )}
            </div>

          </div>

        </div>



      </div>

      {/* Interactive Image Cropper Modal */}
      {cropperTarget && (
        <ImageCropperModal
          imageSrc={cropperTarget.imageSrc}
          aspectRatio={8.5 / 6.5}
          title={`Ritaglia & Modifica Foto ${cropperTarget.index + 1}`}
          onCropSave={(croppedUrl) => {
            const updatedImages = [...images];
            updatedImages[cropperTarget.index] = croppedUrl;
            setImagesList(updatedImages);
            if (onUpdateCarPhotos) {
              onUpdateCarPhotos(car.id, updatedImages);
            }
            setCropperTarget(null);
          }}
          onClose={() => setCropperTarget(null)}
        />
      )}

    </div>
  );
}
