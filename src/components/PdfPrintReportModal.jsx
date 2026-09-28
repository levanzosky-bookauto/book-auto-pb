import React, { useState, useEffect, useRef } from 'react';
import { X, Printer, Image as ImageIcon, FileText, Download, Loader2, Type, Wrench, ShieldCheck, Calendar, Euro, Paperclip, Eye, FileCheck } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { getLogoForBrand } from '../utils/brandLogos';
import { PDF_FONT_OPTIONS, getDefaultPdfFont } from '../utils/pdfFonts';
import { openDocument, downloadDocument } from '../utils/documentViewer';

export default function PdfPrintReportModal({ 
  selectedCars, 
  onClose 
}) {
  const [includePhotos, setIncludePhotos] = useState(true);
  const [includeExtendedReport, setIncludeExtendedReport] = useState(false);
  const [includeDocuments, setIncludeDocuments] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [selectedFontId, setSelectedFontId] = useState(() => getDefaultPdfFont().id);
  const reportContainerRef = useRef(null);

  const currentFont = PDF_FONT_OPTIONS.find(f => f.id === selectedFontId) || PDF_FONT_OPTIONS[0];

  // Helper functions to auto-append currency (€) and consumption (km/L) if missing
  const formatCurrency = (val) => {
    if (!val || val === 'N/D') return 'N/D';
    const str = String(val).trim();
    if (str.includes('€')) return str;
    const num = parseFloat(str.replace(',', '.'));
    if (!isNaN(num)) return `${num.toLocaleString('it-IT')} €`;
    return `${str} €`;
  };

  const formatConsumption = (val) => {
    if (!val || val === 'N/D') return 'N/D';
    const str = String(val).trim();
    if (str.toLowerCase().includes('l') || str.toLowerCase().includes('km')) return str;
    return `${str} km/L`;
  };

  const fontStyle = {
    fontFamily: currentFont.family,
    fontVariantNumeric: 'lining-nums tabular-nums',
    fontFeatureSettings: '"lnum" 1, "tnum" 1'
  };

  // Helper to generate dynamic filename for PDF downloads / prints
  const getPdfFileName = () => {
    const dateStr = new Date().toISOString().slice(0, 10);
    if (selectedCars && selectedCars.length === 1) {
      const car = selectedCars[0];
      const cleanBrand = (car.brand || '').trim().replace(/[^a-zA-Z0-9]/g, '_');
      const cleanModel = (car.model || '').trim().replace(/[^a-zA-Z0-9]/g, '_');
      const name = `${cleanBrand}_${cleanModel}_${dateStr}`.replace(/_+/g, '_');
      return `${name}.pdf`;
    }
    return `Book_Auto_PB_${dateStr}.pdf`;
  };

  // Trigger browser print dialog
  const handlePrint = () => {
    try {
      const originalTitle = document.title;
      const customTitle = getPdfFileName().replace('.pdf', '');
      document.title = customTitle;
      window.focus();
      setTimeout(() => {
        window.print();
        setTimeout(() => {
          document.title = originalTitle;
        }, 1000);
      }, 100);
    } catch (err) {
      console.error('Print failed:', err);
      window.print();
    }
  };

  // Generate and download direct PDF file matching exact layout
  const handleDownloadDirectPdf = async () => {
    if (!reportContainerRef.current) return;
    setIsGeneratingPdf(true);

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const carPages = reportContainerRef.current.querySelectorAll('.print-car-page');

      for (let i = 0; i < carPages.length; i++) {
        const carPage = carPages[i];
        
        // Render ultra HD canvas at scale 3.5 (300 DPI)
        const canvas = await html2canvas(carPage, {
          scale: 3.5,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#ffffff'
        });

        // Use lossless PNG to prevent JPEG compression artifacts & font blur
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 210; // A4 width in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (i > 0) {
          pdf.addPage();
        }

        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, Math.min(imgHeight, 297), undefined, 'FAST');
      }

      pdf.save(getPdfFileName());
    } catch (error) {
      console.error('Error generating PDF:', error);
      handlePrint();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Keyboard shortcut listener (Cmd+P / Ctrl+P inside modal)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-md overflow-y-auto animate-fade-in print:p-0 print:bg-white print:static print:inset-auto">
      
      {/* Printable Report Modal Outer Shell */}
      <div 
        className="printable-report-modal glass-panel w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl border border-white/10 my-auto flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:w-full print:rounded-none print:bg-white text-slate-100 print:text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Controls Top Bar (Hidden during printing via 'no-print') */}
        <div className="no-print flex flex-col gap-3 px-6 py-4 border-b border-white/10 bg-slate-900/90 shrink-0">
          
          {/* Header Row: Title & Top-Right Close Button */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold font-heading text-white">
                  Stampa PDF ({selectedCars.length} {selectedCars.length === 1 ? 'vettura' : 'vetture'})
                </h2>
                <p className="text-xs text-slate-400">
                  Layout ufficiale 1 pagina A4 per vettura con Logo Marchio, Dettagli e Galleria Foto
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-400 rounded-xl border border-slate-700 transition-all shrink-0 ml-auto"
              title="Chiudi Finestra"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Controls Toolbar Row */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-2 border-t border-slate-800/80">
            
            {/* Font Selection Dropdown */}
            <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
              <Type className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <label className="text-slate-400 shrink-0 font-medium hidden sm:inline">Font PDF:</label>
              <select
                value={selectedFontId}
                onChange={(e) => {
                  const newFont = e.target.value;
                  setSelectedFontId(newFont);
                  localStorage.setItem('pdf_report_selected_font', newFont);
                }}
                className="bg-transparent text-amber-400 font-bold text-xs focus:outline-none cursor-pointer py-0.5 max-w-[150px] sm:max-w-[210px] truncate"
                title="Scegli il carattere tipografico per la scheda PDF"
              >
                <optgroup label="Serif Eleganti (Catalogo Lusso)">
                  {PDF_FONT_OPTIONS.filter(f => f.group === 'Serif Eleganti').map(f => (
                    <option key={f.id} value={f.id} className="bg-slate-900 text-white font-serif py-1">
                      {f.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Sans-Serif Moderni & Sport">
                  {PDF_FONT_OPTIONS.filter(f => f.group === 'Sans-Serif Moderni').map(f => (
                    <option key={f.id} value={f.id} className="bg-slate-900 text-white font-sans py-1">
                      {f.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Include Photos Toggle Button */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setIncludePhotos(true)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  includePhotos 
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Con Foto</span>
              </button>

              <button
                type="button"
                onClick={() => setIncludePhotos(false)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  !includePhotos 
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Senza Foto</span>
              </button>
            </div>

            {/* Include Extended Maintenance Report Toggle */}
            <button
              type="button"
              onClick={() => setIncludeExtendedReport(!includeExtendedReport)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                includeExtendedReport 
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 font-bold shadow-md' 
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
              title="Includi scheda tecnica A4 con Registro Manutenzione, Scadenze e Costi"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>+ Scheda Manutenzione</span>
            </button>

            {/* Include Scanned Documents Toggle */}
            <button
              type="button"
              onClick={() => setIncludeDocuments(!includeDocuments)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                includeDocuments 
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 font-bold shadow-md' 
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
              title="Includi scansioni del Libretto, Assicurazione e Bollo nel report di stampa"
            >
              <Paperclip className="w-3.5 h-3.5" />
              <span>+ Documenti Scansionati</span>
            </button>

            {/* Direct PDF Download Action Button */}
            <button
              onClick={handleDownloadDirectPdf}
              disabled={isGeneratingPdf}
              className="flex items-center space-x-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs rounded-xl border border-amber-500/30 transition-all active:scale-95 disabled:opacity-50"
              title="Scarica direttamente il file PDF sul tuo dispositivo"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Generazione PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>Scarica PDF</span>
                </>
              )}
            </button>

            {/* Print Action Button */}
            <button
              onClick={handlePrint}
              className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Stampa PDF</span>
            </button>

          </div>

          {/* Quick Buttons Row for Attached Documents (Libretto, Assicurazione, Bollo) */}
          {selectedCars.some(c => c.documents && c.documents.length > 0) && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/60 text-xs">
              <span className="text-slate-400 font-bold flex items-center space-x-1">
                <Paperclip className="w-3.5 h-3.5 text-amber-400" />
                <span>Stampa/Apri Documenti Scansionati Vettura:</span>
              </span>
              {selectedCars.flatMap(c => (c.documents || []).map(d => ({ car: c, doc: d }))).map(({ car, doc }) => (
                <div key={doc.id} className="flex items-center space-x-1 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-[11px]">
                  <span className="text-slate-300 font-medium truncate max-w-[120px]">{doc.title}</span>
                  <button
                    type="button"
                    onClick={() => openDocument(doc)}
                    className="p-1 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-amber-400 rounded transition-all"
                    title="Apri e Visualizza Documento"
                  >
                    <Eye className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openDocument(doc, true)}
                    className="p-1 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-amber-400 rounded transition-all"
                    title="Stampa Singolo Documento"
                  >
                    <Printer className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Printable Pages Container (1 page per 4 photos matching reference layout) */}
        <div ref={reportContainerRef} className="overflow-y-auto p-4 sm:p-8 space-y-12 flex-1 flex flex-col items-center bg-slate-900/60 print:overflow-visible print:p-0 print:space-y-0 print:bg-white">
          
          {selectedCars.map((car) => {
            const logoImage = getLogoForBrand(car.brand) || car.logoImg;

            // Photos array (excluding logo image if present in car photos)
            const rawPhotos = car.carPhotos && car.carPhotos.length > 0 
              ? car.carPhotos 
              : (car.images && car.images.length > 0 ? car.images : [car.pageImage]);
            
            const photos = rawPhotos.filter(img => img !== car.logoImg && img !== logoImage);
            const finalPhotos = photos.length > 0 ? photos : rawPhotos;

            // Group photos into pages of 4 photos each
            const photoPages = [];
            if (!includePhotos || finalPhotos.length === 0) {
              photoPages.push([]);
            } else {
              for (let i = 0; i < finalPhotos.length; i += 4) {
                photoPages.push(finalPhotos.slice(i, i + 4));
              }
            }

            return (
              <React.Fragment key={car.id}>
                {photoPages.map((pagePhotos, pageIndex) => {
                  const isFirstPage = pageIndex === 0;

                  return (
                    <div 
                      key={`${car.id}_page_${pageIndex}`} 
                      className="print-car-page bg-white text-slate-900 shadow-2xl rounded-sm print:rounded-none print:shadow-none border border-slate-200 print:border-none w-[210mm] max-w-full min-h-[297mm] h-[297mm] p-[12mm] flex flex-col justify-between box-border shrink-0 my-0 mx-auto"
                    >
                      
                      {isFirstPage ? (
                        /* PAGE 1 HEADER: Dedicated 6cm x 6cm (60mm x 60mm) Logo Space + Car Specs */
                        <div className="flex items-start justify-between gap-6 pb-4 border-b border-slate-200">
                          
                          {/* Left: Dedicated 6cm x 6cm Logo Container (Clean on white, 0 borders) */}
                          <div className="w-[60mm] h-[60mm] flex items-center justify-center shrink-0 p-0 bg-transparent">
                            {logoImage ? (
                              <img 
                                src={logoImage} 
                                alt={`Logo ${car.brand}`} 
                                className="max-w-[60mm] max-h-[60mm] w-auto h-auto object-contain block mx-auto my-auto"
                              />
                            ) : (
                              <div className="w-[50mm] h-[50mm] rounded-full border-4 border-slate-900 flex items-center justify-center font-bold text-3xl text-slate-900 font-report-serif">
                                {car.brand.slice(0, 3).toUpperCase()}
                              </div>
                            )}
                          </div>

                          {/* Right: Brand Title, Model, and Vertical Specs List */}
                          <div className="flex-1 space-y-1.5 text-slate-950 pt-0.5" style={fontStyle}>
                            <div>
                              <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight leading-tight" style={fontStyle}>
                                {car.brand}
                              </h1>
                              <h2 className="text-2xl font-bold text-slate-900 mt-0.5 mb-2" style={fontStyle}>
                                {car.model || 'Modello Vettura'}
                              </h2>
                            </div>

                            {/* Specs List Lines */}
                            <div className="text-sm text-slate-900 space-y-1 pt-1 border-t border-slate-100" style={fontStyle}>
                              {car.immatricolazione && (
                                <p className="leading-snug">
                                  <strong className="font-bold text-slate-950">Immatricolazione:</strong> {car.immatricolazione}
                                </p>
                              )}
                              
                              {car.chassis && (
                                <p className="leading-snug">
                                  <strong className="font-bold text-slate-950">N° Telaio:</strong> {car.chassis}
                                </p>
                              )}

                              {car.cilindrata && (
                                <p className="leading-snug">
                                  <strong className="font-bold text-slate-950">Cilindrata:</strong> {car.cilindrata}
                                </p>
                              )}

                              {car.horsepower && (
                                <p className="leading-snug">
                                  <strong className="font-bold text-slate-950">Cavalli:</strong> {car.horsepower}
                                </p>
                              )}

                              {car.esemplari && (
                                <p className="leading-snug">
                                  <strong className="font-bold text-slate-950">Esemplari:</strong> {car.esemplari}
                                </p>
                              )}

                              {car.notes && (
                                <p className="pt-1 italic text-slate-700 font-sans text-xs">
                                  <strong className="font-bold not-italic text-slate-950" style={fontStyle}>Note:</strong> {car.notes}
                                </p>
                              )}
                            </div>

                          </div>

                        </div>
                      ) : (
                        /* SUBSEQUENT PAGES HEADER: Compact Header for Overflow Photos */
                        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                          <div className="flex items-center space-x-3">
                            {logoImage && (
                              <img src={logoImage} alt="" className="w-10 h-10 object-contain" />
                            )}
                            <div>
                              <h2 className="text-xl font-bold text-slate-950" style={fontStyle}>
                                {car.brand} {car.model}
                              </h2>
                              <p className="text-xs text-slate-500 font-sans">Galleria Foto aggiuntive (Pagina {pageIndex + 1})</p>
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-slate-400" style={fontStyle}>
                            Pagina {pageIndex + 1} di {photoPages.length}
                          </span>
                        </div>
                      )}

                      {/* Photos Section: Dynamic Layout for 1, 2, 3, or 4 Photos */}
                      
                      {/* 1 Photo: Centered alone in page middle */}
                      {includePhotos && pagePhotos.length === 1 && (
                        <div className="flex-1 my-auto flex items-center justify-center py-4 w-full">
                          <div className="w-full max-w-[175mm] h-full max-h-[155mm] min-h-[100mm] bg-white flex items-center justify-center p-0 mx-auto">
                            <img 
                              src={pagePhotos[0]} 
                              alt={`${car.brand} ${car.model}`}
                              className="max-w-full max-h-[150mm] w-auto h-auto object-contain block mx-auto my-auto"
                            />
                          </div>
                        </div>
                      )}

                      {/* 2 Photos: Vertical Stack (1 top, 1 bottom, centered) */}
                      {includePhotos && pagePhotos.length === 2 && (
                        <div className="flex-1 my-auto flex flex-col justify-center items-center space-y-4 py-2 w-full">
                          <div className="w-full max-w-[155mm] min-h-[70mm] max-h-[88mm] bg-white flex items-center justify-center p-0 mx-auto">
                            <img 
                              src={pagePhotos[0]} 
                              alt={`${car.brand} ${car.model} - foto 1`}
                              className="max-w-full max-h-[85mm] w-auto h-auto object-contain block mx-auto my-auto"
                            />
                          </div>
                          <div className="w-full max-w-[155mm] min-h-[70mm] max-h-[88mm] bg-white flex items-center justify-center p-0 mx-auto">
                            <img 
                              src={pagePhotos[1]} 
                              alt={`${car.brand} ${car.model} - foto 2`}
                              className="max-w-full max-h-[85mm] w-auto h-auto object-contain block mx-auto my-auto"
                            />
                          </div>
                        </div>
                      )}

                      {/* 3 Photos: 2 on top row + 1 centered in middle on bottom row */}
                      {includePhotos && pagePhotos.length === 3 && (
                        <div className="flex-1 my-auto flex flex-col justify-center space-y-4 py-2 w-full">
                          {/* Top Row: 2 Photos */}
                          <div className="grid grid-cols-2 gap-4 w-full items-center">
                            <div className="w-full h-full min-h-[70mm] max-h-[85mm] bg-white flex items-center justify-center p-0">
                              <img 
                                src={pagePhotos[0]} 
                                alt={`${car.brand} ${car.model} - foto 1`}
                                className="max-w-full max-h-[82mm] w-auto h-auto object-contain block mx-auto my-auto"
                              />
                            </div>
                            <div className="w-full h-full min-h-[70mm] max-h-[85mm] bg-white flex items-center justify-center p-0">
                              <img 
                                src={pagePhotos[1]} 
                                alt={`${car.brand} ${car.model} - foto 2`}
                                className="max-w-full max-h-[82mm] w-auto h-auto object-contain block mx-auto my-auto"
                              />
                            </div>
                          </div>

                          {/* Bottom Row: 1 Photo Centered in Middle */}
                          <div className="w-full flex justify-center items-center">
                            <div className="w-1/2 max-w-[90mm] h-full min-h-[70mm] max-h-[85mm] bg-white flex items-center justify-center p-0 mx-auto">
                              <img 
                                src={pagePhotos[2]} 
                                alt={`${car.brand} ${car.model} - foto 3`}
                                className="max-w-full max-h-[82mm] w-auto h-auto object-contain block mx-auto my-auto"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 4 Photos: 2x2 Grid */}
                      {includePhotos && pagePhotos.length >= 4 && (
                        <div className="grid grid-cols-2 gap-4 flex-1 my-auto items-center py-2">
                          {pagePhotos.map((photoUrl, pIdx) => (
                            <div 
                              key={pIdx} 
                              className="w-full h-full min-h-[70mm] max-h-[90mm] bg-white flex items-center justify-center p-0"
                            >
                              <img 
                                src={photoUrl} 
                                alt={`${car.brand} ${car.model} - foto ${pageIndex * 4 + pIdx + 1}`}
                                className="max-w-full max-h-[88mm] w-auto h-auto object-contain block mx-auto my-auto"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Footer Sheet Margin */}
                      <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400 font-sans uppercase tracking-widest">
                        <span>BOOK AUTO PB</span>
                        <span>{car.brand} {car.model} {photoPages.length > 1 ? `— Pagina ${pageIndex + 1}/${photoPages.length}` : ''}</span>
                      </div>

                    </div>
                  );
                })}

                {/* OPTIONAL EXTENDED MAINTENANCE & DOCUMENTATION PAGE (PAGE 2) */}
                {includeExtendedReport && (
                  <div 
                    key={`${car.id}_extended_page`} 
                    className="print-car-page bg-white text-slate-900 shadow-2xl rounded-sm print:rounded-none print:shadow-none border border-slate-200 print:border-none w-[210mm] max-w-full min-h-[297mm] h-[297mm] p-[12mm] flex flex-col justify-between box-border shrink-0 my-0 mx-auto"
                  >
                    {/* Extended Page Header */}
                    <div className="flex items-center justify-between pb-3 border-b-2 border-slate-900">
                      <div className="flex items-center space-x-3">
                        {logoImage && (
                          <img src={logoImage} alt="" className="w-10 h-10 object-contain" />
                        )}
                        <div>
                          <h2 className="text-xl font-extrabold text-slate-950 uppercase tracking-tight" style={fontStyle}>
                            {car.brand} {car.model}
                          </h2>
                          <p className="text-xs font-semibold text-amber-700 font-sans uppercase tracking-wider">
                            Scheda Tecnica Completa, Scadenze & Registro Manutenzione
                          </p>
                        </div>
                      </div>
                      <div className="text-right font-sans text-xs text-slate-500">
                        <span>Targa: <strong>{car.targa || 'N/D'}</strong></span>
                        <br />
                        <span>VIN: <strong>{car.chassis || 'N/D'}</strong></span>
                      </div>
                    </div>

                    {/* Extended Page Body Grids */}
                    <div className="flex-1 py-4 space-y-4 font-sans text-xs">
                      
                      {/* Grid 1: Dati Generali Veicolo & Documenti */}
                      <div className="border border-slate-300 rounded-lg p-3 bg-slate-50/50">
                        <div className="flex items-center space-x-2 border-b border-slate-200 pb-1.5 mb-2">
                          <ShieldCheck className="w-4 h-4 text-slate-800" />
                          <h3 className="font-bold text-slate-900 text-sm uppercase" style={fontStyle}>
                            1. Dati Generali del Veicolo & Documenti
                          </h3>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-slate-800">
                          <div><strong>Marca / Modello:</strong> {car.brand} {car.model}</div>
                          <div><strong>Anno Immatricolazione:</strong> {car.immatricolazione || 'N/D'}</div>
                          <div><strong>Targa Veicolo:</strong> {car.targa || 'N/D'}</div>
                          <div><strong>N° Telaio (VIN):</strong> {car.chassis || 'N/D'}</div>
                          <div><strong>Tipo Motore:</strong> {car.tipoMotore || 'N/D'}</div>
                          <div><strong>Cilindrata & Cavalli:</strong> {car.cilindrata || 'N/D'} / {car.horsepower || 'N/D'}</div>
                          <div><strong>Codice Colore:</strong> {car.codiceColore || 'N/D'}</div>
                          <div className="col-span-2"><strong>Misura Pneumatici Omologati:</strong> {car.pneumatici || 'N/D'}</div>
                        </div>
                        {car.contattiEmergenza && (
                          <div className="mt-2 pt-1.5 border-t border-slate-200 text-slate-700">
                            <strong>Contatti Utili & Soccorso Stradale:</strong> {car.contattiEmergenza}
                          </div>
                        )}
                      </div>

                      {/* Grid 2: Scadenze Ministeriali & Polizza */}
                      <div className="border border-slate-300 rounded-lg p-3 bg-slate-50/50">
                        <div className="flex items-center space-x-2 border-b border-slate-200 pb-1.5 mb-2">
                          <Calendar className="w-4 h-4 text-slate-800" />
                          <h3 className="font-bold text-slate-900 text-sm uppercase" style={fontStyle}>
                            2. Scadenze Ministeriali & Assicurazione
                          </h3>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-slate-800">
                          <div className="p-2 bg-white rounded border border-slate-200">
                            <span className="block text-[10px] text-slate-500 uppercase font-bold">Scadenza Revisione</span>
                            <span className="font-bold text-slate-900 text-sm">{car.scadenzaRevisione || 'Non impostata'}</span>
                          </div>
                          <div className="p-2 bg-white rounded border border-slate-200">
                            <span className="block text-[10px] text-slate-500 uppercase font-bold">Scadenza Bollo Auto</span>
                            <span className="font-bold text-slate-900 text-sm">{car.scadenzaBollo || 'Non impostata'}</span>
                          </div>
                          <div className="p-2 bg-white rounded border border-slate-200">
                            <span className="block text-[10px] text-slate-500 uppercase font-bold">Polizza Assicurativa</span>
                            <span className="font-bold text-slate-900 text-sm">{car.scadenzaAssicurazione || 'Non impostata'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Grid 3: Registro della Manutenzione */}
                      <div className="border border-slate-300 rounded-lg p-3 bg-slate-50/50">
                        <div className="flex items-center space-x-2 border-b border-slate-200 pb-1.5 mb-2">
                          <Wrench className="w-4 h-4 text-slate-800" />
                          <h3 className="font-bold text-slate-900 text-sm uppercase" style={fontStyle}>
                            3. Registro Manutenzione Ordinaria & Straordinaria
                          </h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-slate-800 items-stretch">
                          <div className="flex flex-col h-full justify-between space-y-1.5">
                            <div>
                              <div><strong>Ultimo Tagliando:</strong> {car.ultimoTagliandoData || 'N/D'} {car.ultimoTagliandoKm ? `(${car.ultimoTagliandoKm})` : ''}</div>
                              <div className="text-amber-800 font-semibold mt-0.5">
                                <strong>Prossimo Tagliando:</strong> {car.prossimoTagliandoData || 'N/D'} {car.prossimoTagliandoKm ? `(${car.prossimoTagliandoKm})` : ''}
                              </div>
                            </div>
                            <div className="flex-1 flex flex-col pt-1">
                              <span className="block font-bold text-slate-900 mb-1">Dettagli Interventi & Tagliandi:</span>
                              <p className="flex-1 text-slate-700 bg-white p-2 rounded border border-slate-200 whitespace-pre-wrap">
                                {car.interventiManutenzione || 'Nessun intervento registrato'}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col h-full justify-between space-y-1.5">
                            <div>
                              <div><strong>Stato Pneumatici & Inversioni:</strong></div>
                              <div className="text-slate-600 font-semibold mt-0.5">
                                <strong>Pneumatici Omologati:</strong> {car.pneumatici || 'N/D'}
                              </div>
                            </div>
                            <div className="flex-1 flex flex-col pt-1">
                              <span className="block font-bold text-slate-900 mb-1">Note Pneumatici & Inversioni:</span>
                              <p className="flex-1 text-slate-700 bg-white p-2 rounded border border-slate-200 whitespace-pre-wrap">
                                {car.pneumaticiStagione || 'Nessuna nota pneumatici'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Grid 4: Consumi & Gestione Economica TCO */}
                      <div className="border border-slate-300 rounded-lg p-3 bg-slate-50/50">
                        <div className="flex items-center space-x-2 border-b border-slate-200 pb-1.5 mb-2">
                          <Euro className="w-4 h-4 text-slate-800" />
                          <h3 className="font-bold text-slate-900 text-sm uppercase" style={fontStyle}>
                            4. Consumi & Gestione Costi (TCO)
                          </h3>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-slate-800 mb-2">
                          <div className="p-1.5 bg-white rounded border border-slate-200">
                            <span className="block text-[10px] text-slate-500 uppercase font-bold">Media Consumi</span>
                            <span className="font-bold text-slate-900">{formatConsumption(car.mediaConsumi)}</span>
                          </div>
                          <div className="p-1.5 bg-white rounded border border-slate-200">
                            <span className="block text-[10px] text-slate-500 uppercase font-bold">Costo Assicurazione</span>
                            <span className="font-bold text-slate-900">{formatCurrency(car.costoAnnoAssicurazione)}</span>
                          </div>
                          <div className="p-1.5 bg-white rounded border border-slate-200">
                            <span className="block text-[10px] text-slate-500 uppercase font-bold">Costo Bollo</span>
                            <span className="font-bold text-slate-900">{formatCurrency(car.costoAnnoBollo)}</span>
                          </div>
                          <div className="p-1.5 bg-white rounded border border-slate-200">
                            <span className="block text-[10px] text-slate-500 uppercase font-bold">Manutenzione Annua</span>
                            <span className="font-bold text-slate-900">{formatCurrency(car.costiManutenzioneAnnua)}</span>
                          </div>
                        </div>
                        {car.noteAnomalie && (
                          <div className="pt-1.5 border-t border-slate-200 text-slate-700">
                            <strong>Note, Diario di Viaggio & Rumori Anomalie:</strong>
                            <p className="mt-0.5 text-slate-700 bg-white p-2 rounded border border-slate-200 italic">
                              {car.noteAnomalie}
                            </p>
                          </div>
                        )}
                      </div>

                    </div>

                    {/* Footer Sheet Margin */}
                    <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400 font-sans uppercase tracking-widest">
                      <span>BOOK AUTO PB</span>
                      <span>{car.brand} {car.model} — SCHEDA TECNICA MANUTENZIONE & COSTI</span>
                    </div>
                  </div>
                )}

                {/* DEDICATED CLEAN A4 PRINTABLE PAGE FOR EACH ATTACHED DOCUMENT */}
                {includeDocuments && car.documents && car.documents.map((doc, docIdx) => {
                  const isImage = doc.fileData && (doc.fileData.startsWith('data:image/') || doc.fileType?.includes('image'));

                  return (
                    <div 
                      key={`${car.id}_doc_${doc.id || docIdx}`} 
                      className="print-car-page bg-white text-slate-900 shadow-2xl rounded-sm print:rounded-none print:shadow-none border border-slate-200 print:border-none w-[210mm] max-w-full min-h-[297mm] h-[297mm] p-[10mm] flex flex-col justify-between box-border shrink-0 my-0 mx-auto"
                    >
                      {/* Top Action Bar (ONLY VISIBLE ON SCREEN IN MODAL, HIDDEN ON PRINT) */}
                      <div className="no-print flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                        <span className="text-xs font-bold text-amber-700 uppercase">
                          {doc.title || 'Documento Scansionato'} ({doc.fileName})
                        </span>
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => openDocument(doc)}
                            className="px-2.5 py-1 bg-slate-800 text-amber-400 hover:bg-amber-500 hover:text-slate-950 rounded text-xs font-bold transition-all flex items-center space-x-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Apri</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openDocument(doc, true)}
                            className="px-2.5 py-1 bg-slate-800 text-amber-400 hover:bg-amber-500 hover:text-slate-950 rounded text-xs font-bold transition-all flex items-center space-x-1"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Stampa Singolo</span>
                          </button>
                        </div>
                      </div>

                      {/* Main Pure Document Image Scan (NO WRITTEN TEXT ON PRINTED SHEET) */}
                      <div className="flex-1 my-auto flex items-center justify-center p-0 w-full overflow-hidden">
                        {isImage ? (
                          <div className="w-full h-full max-h-[265mm] flex items-center justify-center p-0">
                            <img 
                              src={doc.fileData} 
                              alt={doc.title}
                              className="max-w-full max-h-[260mm] w-auto h-auto object-contain block mx-auto my-auto rounded-none shadow-none"
                            />
                          </div>
                        ) : (
                          <div className="w-full p-8 bg-slate-50 border border-slate-300 rounded-xl text-center space-y-3">
                            <Paperclip className="w-12 h-12 text-amber-600 mx-auto" />
                            <h3 className="text-lg font-bold text-slate-900">{doc.title}</h3>
                            <p className="text-sm text-slate-600">File PDF Allegato: {doc.fileName}</p>
                          </div>
                        )}
                      </div>

                      {/* Footer Sheet Margin */}
                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400 font-sans uppercase tracking-widest">
                        <span>BOOK AUTO PB</span>
                        <span>{car.brand} {car.model}</span>
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}

        </div>

      </div>
    </div>
  );
}


