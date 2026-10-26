import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Printer, Image as ImageIcon, FileText, Download, Loader2, Type, Wrench, ShieldCheck, Calendar, Euro, Paperclip, Eye, FileCheck, Smartphone, ZoomIn, CheckSquare, Square, SlidersHorizontal, ChevronDown, ChevronUp, Car } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PDFDocument } from 'pdf-lib';
import { getLogoForBrand, isValidBrandLogo } from '../utils/brandLogos';
import { PDF_FONT_OPTIONS, getDefaultPdfFont } from '../utils/pdfFonts';
import { openDocument, downloadDocument, getDocumentSource, getSafeDocumentBlobUrl } from '../utils/documentViewer';
import { isStaffUser } from '../utils/permissions';
import PdfPageCanvas from './PdfPageCanvas';

// Helper to categorize documents into standard buckets: 'libretto', 'assicurazione', 'bollo', 'altro'
export const getDocumentCategory = (doc) => {
  const cat = (doc?.category || '').toLowerCase().trim();
  if (cat === 'libretto' || cat.includes('librett') || cat.includes('circolaz') || cat.includes('carta')) return 'libretto';
  if (cat === 'assicurazione' || cat.includes('assicuraz') || cat.includes('polizz') || cat.includes('rca')) return 'assicurazione';
  if (cat === 'bollo' || cat.includes('bollo') || cat.includes('tassa') || cat.includes('f24') || cat.includes('ricevuta')) return 'bollo';

  const text = `${doc?.title || ''} ${doc?.fileName || ''}`.toLowerCase();
  if (text.includes('librett') || text.includes('circolaz') || text.includes('carta')) return 'libretto';
  if (text.includes('assicuraz') || text.includes('polizz') || text.includes('rca')) return 'assicurazione';
  if (text.includes('bollo') || text.includes('tassa') || text.includes('f24') || text.includes('ricevuta')) return 'bollo';
  return 'altro';
};

export default function PdfPrintReportModal({ 
  selectedCars, 
  onClose,
  currentUser,
  clientPermissions 
}) {
  const isStaff = isStaffUser(currentUser);
  const [includePhotos, setIncludePhotos] = useState(true);
  const [includeExtendedReport, setIncludeExtendedReport] = useState(false);
  const [includeDocuments, setIncludeDocuments] = useState(true);

  // Flat list of all documents attached across selected cars
  const allAttachedDocs = useMemo(() => {
    return (selectedCars || []).flatMap(c => (c.documents || []).map(d => ({ car: c, doc: d })));
  }, [selectedCars]);

  // Standard document categories: 'libretto', 'assicurazione', 'bollo', 'altro'
  const allCategoriesList = ['libretto', 'assicurazione', 'bollo', 'altro'];
  const [selectedCategories, setSelectedCategories] = useState(allCategoriesList);

  useEffect(() => {
    setSelectedCategories(allCategoriesList);
    setIncludeDocuments(allAttachedDocs.length > 0);
  }, [selectedCars]);

  // Counts per category across selected cars
  const categoryCounts = useMemo(() => {
    const counts = { libretto: 0, assicurazione: 0, bollo: 0, altro: 0 };
    allAttachedDocs.forEach(({ doc }) => {
      const cat = getDocumentCategory(doc);
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [allAttachedDocs]);

  // The 3 standard categories always available (+ Altri Allegati if present)
  const visibleDocCategories = useMemo(() => {
    const cats = [
      { id: 'libretto', label: 'Libretto di Circolazione', count: categoryCounts.libretto || 0 },
      { id: 'assicurazione', label: 'Polizza Assicurativa', count: categoryCounts.assicurazione || 0 },
      { id: 'bollo', label: 'Ricevuta Bollo', count: categoryCounts.bollo || 0 },
    ];
    if ((categoryCounts.altro || 0) > 0) {
      cats.push({ id: 'altro', label: 'Altri Allegati', count: categoryCounts.altro });
    }
    return cats;
  }, [categoryCounts]);

  // Memoized blob URLs for attached PDF documents so they don't recreate on every render
  const documentBlobUrls = useMemo(() => {
    const urls = {};
    allAttachedDocs.forEach(({ doc }) => {
      if (doc && doc.id) {
        const url = getSafeDocumentBlobUrl(doc);
        if (url) {
          urls[doc.id] = url;
        }
      }
    });
    return urls;
  }, [allAttachedDocs]);

  useEffect(() => {
    return () => {
      // Clean up object URLs on unmount
      Object.values(documentBlobUrls).forEach(url => {
        if (typeof url === 'string' && url.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(url);
          } catch (e) {}
        }
      });
    };
  }, [documentBlobUrls]);

  const toggleCategory = (catId) => {
    setSelectedCategories(prev => {
      const next = prev.includes(catId) 
        ? prev.filter(id => id !== catId) 
        : [...prev, catId];
      setIncludeDocuments(next.length > 0);
      return next;
    });
  };

  const selectAllCategories = () => {
    setSelectedCategories(allCategoriesList);
    setIncludeDocuments(true);
  };

  const deselectAllCategories = () => {
    setSelectedCategories([]);
    setIncludeDocuments(false);
  };

  const isDocSelected = (doc) => {
    if (!includeDocuments) return false;
    const cat = getDocumentCategory(doc);
    return selectedCategories.includes(cat);
  };

  const selectedDocsCount = useMemo(() => {
    if (!includeDocuments) return 0;
    return allAttachedDocs.filter(({ doc }) => selectedCategories.includes(getDocumentCategory(doc))).length;
  }, [allAttachedDocs, selectedCategories, includeDocuments]);

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [selectedFontId, setSelectedFontId] = useState(() => getDefaultPdfFont().id);
  const [scaleFactor, setScaleFactor] = useState(1);
  const [isFullSize, setIsFullSize] = useState(false);
  const [forceFullScale, setForceFullScale] = useState(false);
  const [showMobileOptions, setShowMobileOptions] = useState(false);
  const reportContainerRef = useRef(null);

  const currentFont = PDF_FONT_OPTIONS.find(f => f.id === selectedFontId) || PDF_FONT_OPTIONS[0];

  // Dynamically calculate scale factor so 210mm (~794px) A4 sheet fits phone screen width perfectly
  useEffect(() => {
    const updateScale = () => {
      if (!reportContainerRef.current) return;
      const containerWidth = reportContainerRef.current.clientWidth;
      // 210mm in pixels is approximately 794px at standard 96 DPI
      const targetWidth = 794;
      // Margin on mobile: 8px each side = 16px
      const availableWidth = Math.max(260, containerWidth - 16);
      if (availableWidth < targetWidth) {
        setScaleFactor(availableWidth / targetWidth);
      } else {
        setScaleFactor(1);
      }
    };

    updateScale();
    const timer = setTimeout(updateScale, 150);

    let resizeObserver = null;
    if (typeof window !== 'undefined' && window.ResizeObserver && reportContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        updateScale();
      });
      resizeObserver.observe(reportContainerRef.current);
    }

    window.addEventListener('resize', updateScale);
    return () => {
      clearTimeout(timer);
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, [selectedCars, includePhotos, includeExtendedReport, includeDocuments, selectedCategories, isFullSize]);

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

  // Helper to compile unified multi-page PDF blob with car pages + maintenance sheet + selected documents
  // STRICT CAR-BY-CAR SEQUENCING:
  // For each car:
  //   1. Scheda Vettura con Foto (1 or more pages)
  //   2. Scheda Manutenzione (if includeExtendedReport)
  //   3. Checked Scanned Documents for THIS car
  // Then moves to next car!
  const buildUnifiedPdfBlob = async () => {
    if (!reportContainerRef.current) return null;

    const mergedPdf = await PDFDocument.create();

    for (const car of selectedCars) {
      // 1. Capture HTML main sheets for THIS car (Car Card + Maintenance)
      let carSheetPages = reportContainerRef.current.querySelectorAll(`.print-main-sheet-page[data-car-id="${car.id}"]`);
      if (!carSheetPages || carSheetPages.length === 0) {
        carSheetPages = reportContainerRef.current.querySelectorAll(`.print-car-page:not(.print-doc-page)[data-car-id="${car.id}"]`);
      }

      if (carSheetPages && carSheetPages.length > 0) {
        const carJsPdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
          compress: true
        });

        for (let i = 0; i < carSheetPages.length; i++) {
          const pageEl = carSheetPages[i];
          const canvas = await html2canvas(pageEl, {
            scale: 2.5,
            useCORS: true,
            allowTaint: true,
            logging: false,
            backgroundColor: '#ffffff'
          });
          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          if (i > 0) carJsPdf.addPage();
          carJsPdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
        }

        const carArrayBuf = carJsPdf.output('arraybuffer');
        const loadedCarPdf = await PDFDocument.load(carArrayBuf);
        const copiedCarPages = await mergedPdf.copyPages(loadedCarPdf, loadedCarPdf.getPageIndices());
        copiedCarPages.forEach(p => mergedPdf.addPage(p));
      }

      // 2. Immediately append selected attached documents for THIS car
      if (isStaff && includeDocuments) {
        const docsToAppend = (car.documents || []).filter(isDocSelected);
        for (const doc of docsToAppend) {
          const source = getDocumentSource(doc);
          if (!source) continue;

          const isPdf = doc.fileType === 'application/pdf' || 
            (typeof source === 'string' && (source.startsWith('data:application/pdf') || source.toLowerCase().includes('.pdf')));

          try {
            if (isPdf) {
              let pdfBytes = null;
              if (typeof source === 'string' && source.startsWith('data:')) {
                const base64 = source.split(';base64,')[1] || source;
                const binStr = atob(base64);
                pdfBytes = new Uint8Array(binStr.length);
                for (let k = 0; k < binStr.length; k++) {
                  pdfBytes[k] = binStr.charCodeAt(k);
                }
              } else if (typeof source === 'string') {
                const res = await fetch(source);
                pdfBytes = await res.arrayBuffer();
              }

              if (pdfBytes) {
                const loadedDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
                const copiedPages = await mergedPdf.copyPages(loadedDoc, loadedDoc.getPageIndices());
                copiedPages.forEach(p => mergedPdf.addPage(p));
              }
            } else {
              // Image document
              let imgBytes = null;
              let isPng = false;
              if (typeof source === 'string' && source.startsWith('data:')) {
                isPng = source.startsWith('data:image/png');
                const base64 = source.split(';base64,')[1] || source;
                const binStr = atob(base64);
                imgBytes = new Uint8Array(binStr.length);
                for (let k = 0; k < binStr.length; k++) {
                  imgBytes[k] = binStr.charCodeAt(k);
                }
              } else if (typeof source === 'string') {
                isPng = source.toLowerCase().endsWith('.png');
                const res = await fetch(source);
                imgBytes = await res.arrayBuffer();
              }

              if (imgBytes) {
                const embeddedImg = isPng 
                  ? await mergedPdf.embedPng(imgBytes) 
                  : await mergedPdf.embedJpg(imgBytes);

                const a4Width = 595.28;
                const a4Height = 841.89;
                const page = mergedPdf.addPage([a4Width, a4Height]);
                const margin = 20;
                const maxW = a4Width - margin * 2;
                const maxH = a4Height - margin * 2;
                const scale = Math.min(maxW / embeddedImg.width, maxH / embeddedImg.height, 1);
                const drawW = embeddedImg.width * scale;
                const drawH = embeddedImg.height * scale;
                const drawX = (a4Width - drawW) / 2;
                const drawY = (a4Height - drawH) / 2;

                page.drawImage(embeddedImg, {
                  x: drawX,
                  y: drawY,
                  width: drawW,
                  height: drawH
                });
              }
            }
          } catch (docErr) {
            console.warn('Could not merge document into PDF:', doc.title, docErr);
          }
        }
      }
    }

    if (mergedPdf.getPageCount() === 0) return null;
    const finalPdfBytes = await mergedPdf.save();
    return new Blob([finalPdfBytes], { type: 'application/pdf' });
  };

  // Trigger browser print dialog or unified PDF print
  const handlePrint = async () => {
    setIsGeneratingPdf(true);
    setForceFullScale(true);
    await new Promise(r => setTimeout(r, 60));
    try {
      const blob = await buildUnifiedPdfBlob();
      if (blob) {
        const blobUrl = URL.createObjectURL(blob);
        const printWindow = window.open(blobUrl, '_blank');
        if (printWindow) {
          setTimeout(() => {
            try {
              printWindow.focus();
              printWindow.print();
            } catch (e) {
              console.warn('Print window direct call failed:', e);
            }
          }, 750);
        } else {
          // Popup blocker fallback: use hidden iframe
          const printIframe = document.createElement('iframe');
          printIframe.style.position = 'fixed';
          printIframe.style.top = '-10000px';
          printIframe.style.left = '-10000px';
          printIframe.src = blobUrl;
          document.body.appendChild(printIframe);
          setTimeout(() => {
            try {
              printIframe.contentWindow.focus();
              printIframe.contentWindow.print();
            } catch (e) {
              window.print();
            }
            setTimeout(() => {
              if (document.body.contains(printIframe)) {
                document.body.removeChild(printIframe);
              }
            }, 60000);
          }, 800);
        }
        setTimeout(() => URL.revokeObjectURL(blobUrl), 120000);
        return;
      }
    } catch (err) {
      console.error('Print merged error:', err);
      window.print();
    } finally {
      setForceFullScale(false);
      setIsGeneratingPdf(false);
    }
  };

  // Generate and download direct PDF file matching exact layout
  const handleDownloadDirectPdf = async () => {
    if (!reportContainerRef.current) return;
    setIsGeneratingPdf(true);
    setForceFullScale(true);
    await new Promise(r => setTimeout(r, 60));

    try {
      const blob = await buildUnifiedPdfBlob();
      if (blob) {
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = getPdfFileName();
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      handlePrint();
    } finally {
      setForceFullScale(false);
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

  // Helper to wrap A4 page in responsive mobile scaler
  const renderScaledPage = (key, content, pageBadge) => {
    const currentScale = forceFullScale || isFullSize ? 1 : scaleFactor;
    const isScaled = currentScale < 0.99;
    const scaledWidth = Math.round(794 * currentScale);
    const scaledHeight = Math.round(1123 * currentScale);

    return (
      <div 
        key={key}
        className="pdf-page-scaler-wrapper flex flex-col items-center mx-auto print:block print:w-auto print:h-auto"
        style={{
          width: isScaled ? `${scaledWidth}px` : '210mm',
          marginBottom: isScaled ? '2rem' : '3rem',
          position: 'relative'
        }}
      >
        {/* Visual page indicator pill on screen (hidden on print) */}
        {pageBadge && (
          <div className="no-print self-start mb-2 px-3 py-1 bg-slate-800 text-amber-400 border border-slate-700/80 rounded-lg text-xs font-bold tracking-wide flex items-center space-x-2 shadow-md">
            <span>{pageBadge}</span>
          </div>
        )}

        {/* Scaled A4 Sheet Container: Enforces exact A4 proportion on any screen */}
        <div
          style={{
            width: isScaled ? `${scaledWidth}px` : '210mm',
            height: isScaled ? `${scaledHeight}px` : '297mm',
            position: 'relative',
            overflow: 'hidden',
            borderRadius: isScaled ? '4px' : '2px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4)'
          }}
          className="print:shadow-none print:rounded-none print:w-[210mm] print:h-[297mm] print:overflow-visible"
        >
          <div 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              transform: isScaled ? `scale(${currentScale})` : 'none',
              transformOrigin: 'top left',
              width: '210mm',
              minWidth: '210mm',
              height: '297mm',
              minHeight: '297mm',
              boxSizing: 'border-box'
            }}
            className="print:static print:transform-none print:w-[210mm] print:h-[297mm]"
          >
            {content}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-6 bg-slate-950/90 backdrop-blur-md overflow-y-auto animate-fade-in print:p-0 print:bg-white print:static print:inset-auto">
      
      {/* Printable Report Modal Outer Shell */}
      <div 
        className="printable-report-modal glass-panel w-full max-w-5xl rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-white/10 my-auto flex flex-col max-h-[96vh] sm:max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:w-full print:rounded-none print:bg-white text-slate-100 print:text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Controls Top Bar (Hidden during printing via 'no-print') */}
        <div className="no-print flex flex-col gap-2 sm:gap-3 px-3 sm:px-6 py-2.5 sm:py-4 border-b border-white/10 bg-slate-900/95 shrink-0 transition-all">
          
          {/* Header Row: Title & Action Controls */}
          <div className="flex items-center justify-between gap-2">
            
            {/* Left: Title & Badge */}
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
              <div className="p-1.5 sm:p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20 shrink-0">
                <Printer className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-lg font-bold font-heading text-white truncate flex items-center gap-1.5">
                  <span>Stampa PDF</span>
                  <span className="text-[11px] sm:text-xs text-amber-400 font-semibold px-1.5 py-0.5 bg-amber-500/10 rounded-md border border-amber-500/20">
                    {selectedCars.length} {selectedCars.length === 1 ? 'vettura' : 'vetture'}
                  </span>
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-400 hidden sm:block">
                  Layout ufficiale 1 pagina A4 per vettura con Logo Marchio, Dettagli e Galleria Foto
                </p>
              </div>
            </div>

            {/* Right: Actions, Mobile Options Toggle & Close Button */}
            <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
              {/* Direct PDF Download Action Button */}
              <button
                onClick={handleDownloadDirectPdf}
                disabled={isGeneratingPdf}
                className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs rounded-xl border border-amber-500/30 transition-all active:scale-95 disabled:opacity-50 shadow-sm"
                title="Scarica direttamente il file PDF sul tuo dispositivo"
              >
                {isGeneratingPdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span className="hidden xs:inline sm:inline">{isGeneratingPdf ? 'Generando...' : 'Scarica'}</span>
              </button>

              {/* Print Action Button */}
              <button
                onClick={handlePrint}
                disabled={isGeneratingPdf}
                className="flex items-center space-x-1 sm:space-x-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50"
                title="Avvia la stampa o salva in PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden xs:inline sm:inline">{isGeneratingPdf ? '...' : 'Stampa'}</span>
              </button>

              {/* Mobile Options Expand/Collapse Button (Only on mobile < sm) */}
              <button
                type="button"
                onClick={() => setShowMobileOptions(prev => !prev)}
                className={`sm:hidden flex items-center space-x-1 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                  showMobileOptions 
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/10' 
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                }`}
                title={showMobileOptions ? 'Riduci la barra per vedere la scheda intera' : 'Apri opzioni di personalizzazione (font, foto, allegati)'}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                <span>{showMobileOptions ? 'Riduci' : 'Opzioni'}</span>
                {showMobileOptions ? (
                  <ChevronUp className="w-3 h-3 text-amber-400" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                )}
              </button>

              {/* Close Modal Button */}
              <button
                onClick={onClose}
                className="p-1.5 sm:p-2 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-400 rounded-xl border border-slate-700 transition-all shrink-0"
                title="Chiudi Finestra"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          {/* Collapsible Options Container: Hidden by default on mobile, always visible on desktop sm:flex */}
          <div className={`${showMobileOptions ? 'flex' : 'hidden'} sm:flex flex-col gap-2.5 sm:gap-3 pt-2 sm:pt-3 border-t border-slate-800/80`}>
            
            {/* Controls Toolbar Row */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              
              {/* Font Selection Dropdown */}
              <div className="flex items-center space-x-2 bg-slate-950 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
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
                  className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg font-semibold transition-all ${
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
                  className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    !includePhotos 
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Senza Foto</span>
                </button>
              </div>

              {/* Include Extended Maintenance Report & Documents Toggles (Strictly Staff Only) */}
              {isStaff && (
                <>
                  <button
                    type="button"
                    onClick={() => setIncludeExtendedReport(!includeExtendedReport)}
                    className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                      includeExtendedReport 
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 font-bold shadow-md' 
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                    title="Includi scheda tecnica A4 con Registro Manutenzione, Scadenze e Costi"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>+ Scheda Manutenzione</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (includeDocuments && selectedDocsCount > 0) {
                        deselectAllCategories();
                      } else {
                        selectAllCategories();
                      }
                    }}
                    className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                      includeDocuments && selectedDocsCount > 0 
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 font-bold shadow-md' 
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                    title="Includi scansioni del Libretto, Assicurazione e Bollo nel report di stampa"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>
                      + Documenti Scansionati {allAttachedDocs.length > 0 ? `(${selectedDocsCount}/${allAttachedDocs.length})` : ''}
                    </span>
                  </button>
                </>
              )}

              {/* Mobile Fit vs 100% Zoom Toggle */}
              {scaleFactor < 0.99 && (
                <button
                  type="button"
                  onClick={() => setIsFullSize(!isFullSize)}
                  className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                    isFullSize
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 font-bold shadow-md'
                      : 'bg-slate-950 text-slate-300 border-slate-700 hover:text-white'
                  }`}
                  title={isFullSize ? 'Adatta il foglio alla larghezza dello schermo' : 'Mostra dimensione 100% reale'}
                >
                  {isFullSize ? (
                    <>
                      <Smartphone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>📱 Adatta Schermo</span>
                    </>
                  ) : (
                    <>
                      <ZoomIn className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>🔍 Zoom 100%</span>
                    </>
                  )}
                </button>
              )}

              {/* On mobile: Quick close button at bottom of options row */}
              <button
                type="button"
                onClick={() => setShowMobileOptions(false)}
                className="sm:hidden ml-auto px-3 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold"
              >
                Vedi Scheda Intera ✓
              </button>

            </div>

            {/* Document Selection Row with Category Checkboxes (Libretto, Assicurazione, Bollo, Altri) */}
            {allAttachedDocs.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-slate-800/80 text-xs">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className="text-slate-300 font-bold flex items-center space-x-1.5 shrink-0 text-[11px] sm:text-xs">
                    <Paperclip className="w-3.5 h-3.5 text-amber-400" />
                    <span>Includi nella Stampa (spunta):</span>
                  </span>
                  {visibleDocCategories.map(cat => {
                    const hasDocs = cat.count > 0;
                    const isChecked = hasDocs && selectedCategories.includes(cat.id) && includeDocuments;

                    return (
                      <div 
                        key={cat.id} 
                        onClick={() => {
                          if (hasDocs) toggleCategory(cat.id);
                        }}
                        className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border transition-all text-xs font-semibold select-none ${
                          !hasDocs 
                            ? 'opacity-40 cursor-not-allowed bg-slate-950/60 border-slate-800 text-slate-500' 
                            : isChecked 
                              ? 'cursor-pointer bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-sm shadow-amber-500/10 hover:border-amber-400' 
                              : 'cursor-pointer bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                        }`}
                        title={hasDocs ? `Attiva/disattiva ${cat.label} per tutte le vetture selezionate` : `Nessun documento per ${cat.label} nelle vetture selezionate`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={!hasDocs}
                          onChange={() => {}}
                          className="w-3.5 h-3.5 rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-900 cursor-pointer pointer-events-none"
                        />
                        <span className="font-semibold text-xs">
                          {cat.label}
                        </span>
                        <span className={`text-[11px] font-bold px-1.5 py-0.2 rounded ${
                          isChecked ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'
                        }`}>
                          ({cat.count})
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Quick Select All / None */}
                <div className="flex items-center space-x-1.5 shrink-0 ml-auto">
                  <button
                    type="button"
                    onClick={selectAllCategories}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg text-[11px] font-semibold border border-slate-700 transition-all"
                  >
                    ✓ Tutti ({allAttachedDocs.length})
                  </button>
                  <button
                    type="button"
                    onClick={deselectAllCategories}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg text-[11px] font-semibold border border-slate-700 transition-all"
                  >
                    ✕ Nessuno
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Printable Pages Container (1 page per 4 photos matching reference layout) */}
        <div 
          ref={reportContainerRef} 
          className="overflow-y-auto overflow-x-auto p-1.5 sm:p-8 space-y-3 sm:space-y-12 flex-1 flex flex-col items-center bg-slate-900/60 print:overflow-visible print:p-0 print:space-y-0 print:bg-white w-full"
        >
          
          {selectedCars.map((car) => {
            const logoImage = (isValidBrandLogo(car.logoImg) ? car.logoImg : null) || getLogoForBrand(car.brand);

            // Collect all candidate photos, strictly excluding logos, empty strings, and invalid entries
            const candidatePhotos = [
              ...(Array.isArray(car.carPhotos) ? car.carPhotos : []),
              ...(Array.isArray(car.images) ? car.images : []),
              car.mainPhoto,
              car.pageImage
            ].filter(p => typeof p === 'string' && p.trim().length > 0 && p !== car.logoImg && p !== logoImage);

            // Deduplicate preserving original order
            const uniquePhotos = Array.from(new Set(candidatePhotos));
            const finalPhotos = uniquePhotos;

            // Group photos into pages of 4 photos each
            const photoPages = [];
            if (!includePhotos || finalPhotos.length === 0) {
              photoPages.push([]); // Always at least 1 page: the primary official car sheet
            } else {
              for (let i = 0; i < finalPhotos.length; i += 4) {
                photoPages.push(finalPhotos.slice(i, i + 4));
              }
            }

            // Calculate total pages for this car so page badges & footers are 100% accurate
            const mainPagesCount = photoPages.length;
            const hasExtendedPage = isStaff && includeExtendedReport;
            const extendedPagesCount = hasExtendedPage ? 1 : 0;
            const activeDocs = (includeDocuments && Array.isArray(car.documents))
              ? car.documents.filter(isDocSelected)
              : [];
            const docPagesCount = activeDocs.length;
            const totalCarPages = mainPagesCount + extendedPagesCount + docPagesCount;

            return (
              <React.Fragment key={car.id}>
                {photoPages.map((pagePhotos, pageIndex) => {
                  const isFirstPage = pageIndex === 0;
                  const currentPageNum = pageIndex + 1;
                  const pageBadge = isFirstPage
                    ? `📄 Pagina ${currentPageNum} di ${totalCarPages} — Scheda Vettura Ufficiale`
                    : `🖼️ Pagina ${currentPageNum} di ${totalCarPages} — Galleria Fotografica (Parte ${pageIndex + 1})`;

                  return renderScaledPage(
                    `${car.id}_page_${pageIndex}`,
                    <div 
                      key={`${car.id}_page_${pageIndex}`} 
                      data-car-id={car.id}
                      className="print-car-page print-main-sheet-page bg-white text-slate-900 border border-slate-200 print:border-none p-[12mm] flex flex-col justify-between box-border shrink-0 my-0 mx-auto"
                      style={{
                        width: '210mm',
                        minWidth: '210mm',
                        maxWidth: '210mm',
                        height: '297mm',
                        minHeight: '297mm',
                        maxHeight: '297mm',
                        boxSizing: 'border-box'
                      }}
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

                      {/* Clean Professional Showcase Space when no photos uploaded or 'Senza Foto' chosen */}
                      {(!includePhotos || pagePhotos.length === 0) && (
                        <div className="flex-1 my-auto flex flex-col items-center justify-center py-12 text-center text-slate-400">
                          <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-3">
                            <Car className="w-10 h-10 text-slate-300" />
                          </div>
                          <p className="text-sm font-bold text-slate-700 font-sans tracking-wide">
                            {car.brand} {car.model}
                          </p>
                          <p className="text-xs text-slate-400 mt-1 max-w-sm">
                            {includePhotos ? "Nessuna fotografia aggiuntiva registrata" : "Report ufficiale generato senza galleria fotografica"}
                          </p>
                        </div>
                      )}

                      {/* Footer Sheet Margin */}
                      <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400 font-sans uppercase tracking-widest">
                        <span>BOOK AUTO PB</span>
                        <span>{car.brand} {car.model} — Pagina {currentPageNum} di {totalCarPages}</span>
                      </div>

                    </div>,
                    pageBadge
                  );
                })}

                {/* OPTIONAL EXTENDED MAINTENANCE & DOCUMENTATION PAGE (PAGE 2) - STAFF ONLY */}
                {isStaff && includeExtendedReport && (() => {
                  const extendedPageNum = mainPagesCount + 1;
                  const pageBadge = `📋 Pagina ${extendedPageNum} di ${totalCarPages} — Scheda Tecnica Completa, Scadenze & Manutenzione`;

                  return renderScaledPage(
                    `${car.id}_extended_page`,
                    <div 
                      key={`${car.id}_extended_page`} 
                      data-car-id={car.id}
                      className="print-car-page print-main-sheet-page bg-white text-slate-900 border border-slate-200 print:border-none p-[12mm] flex flex-col justify-between box-border shrink-0 my-0 mx-auto"
                      style={{
                        width: '210mm',
                        minWidth: '210mm',
                        maxWidth: '210mm',
                        height: '297mm',
                        minHeight: '297mm',
                        maxHeight: '297mm',
                        boxSizing: 'border-box'
                      }}
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
                        <span>{car.brand} {car.model} — Pagina {extendedPageNum} di {totalCarPages} (SCHEDA TECNICA & MANUTENZIONE)</span>
                      </div>
                    </div>,
                    pageBadge
                  );
                })()}

                {/* DEDICATED CLEAN A4 PRINTABLE PAGE FOR EACH ATTACHED DOCUMENT - ONLY SELECTED CATEGORIES */}
                {includeDocuments && activeDocs.map((doc, docIdx) => {
                  const docSource = getDocumentSource(doc);
                  const blobUrl = documentBlobUrls[doc.id] || getSafeDocumentBlobUrl(doc);
                  const isPdf = doc.fileType === 'application/pdf' || 
                    (typeof docSource === 'string' && (docSource.startsWith('data:application/pdf') || docSource.toLowerCase().includes('.pdf')));
                  const isImage = !isPdf && docSource && (docSource.startsWith('data:image/') || doc.fileType?.includes('image') || /\.(png|jpe?g|webp|gif)$/i.test(doc.fileName || ''));

                  const docPageNum = mainPagesCount + extendedPagesCount + docIdx + 1;
                  const docTitleClean = doc.title || (doc.category ? `Documento ${doc.category}` : 'Documento Scansionato');
                  const pageBadge = `📎 Pagina ${docPageNum} di ${totalCarPages} — Allegato: ${docTitleClean}`;

                  return renderScaledPage(
                    `${car.id}_doc_${doc.id || docIdx}`,
                    <div 
                      key={`${car.id}_doc_${doc.id || docIdx}`} 
                      data-car-id={car.id}
                      className="print-car-page print-doc-page bg-white text-slate-900 border border-slate-200 print:border-none p-[10mm] flex flex-col justify-between box-border shrink-0 my-0 mx-auto"
                      style={{
                        width: '210mm',
                        minWidth: '210mm',
                        maxWidth: '210mm',
                        height: '297mm',
                        minHeight: '297mm',
                        maxHeight: '297mm',
                        boxSizing: 'border-box'
                      }}
                    >
                      {/* Top Action Bar (ONLY VISIBLE ON SCREEN IN MODAL, HIDDEN ON PRINT) */}
                      <div className="no-print flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                        <div className="flex items-center space-x-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                          <span className="text-xs font-bold text-amber-700 uppercase">
                            {docTitleClean}
                          </span>
                          <span className="text-[11px] text-slate-500 font-sans">
                            ({doc.fileName})
                          </span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => openDocument(doc)}
                            className="px-2.5 py-1 bg-slate-800 text-amber-400 hover:bg-amber-500 hover:text-slate-950 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 shadow-sm"
                            title="Visualizza a schermo intero"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Apri</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openDocument(doc, true)}
                            className="px-2.5 py-1 bg-slate-800 text-amber-400 hover:bg-amber-500 hover:text-slate-950 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 shadow-sm"
                            title="Stampa questo singolo documento"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Stampa Singolo</span>
                          </button>
                        </div>
                      </div>

                      {/* Main Pure Document Scan (NO CLUTTER ON PRINTED SHEET) */}
                      <div className="flex-1 my-auto flex items-center justify-center p-0 w-full h-[calc(100%-40mm)] overflow-hidden">
                        {isImage ? (
                          <div className="w-full h-full flex items-center justify-center p-0">
                            <img 
                              src={docSource} 
                              alt={doc.title}
                              className="max-w-full max-h-[260mm] w-auto h-auto object-contain block mx-auto my-auto rounded-none shadow-none"
                            />
                          </div>
                        ) : isPdf && docSource ? (
                          <div className="w-full h-full min-h-[255mm] flex flex-col items-center justify-center p-0 overflow-hidden">
                            <PdfPageCanvas 
                              source={docSource} 
                              className="w-full h-full"
                            />
                          </div>
                        ) : (
                          <div className="w-full p-8 bg-slate-50 border border-slate-300 rounded-xl text-center space-y-3">
                            <Paperclip className="w-12 h-12 text-amber-600 mx-auto" />
                            <h3 className="text-lg font-bold text-slate-900">{doc.title}</h3>
                            <p className="text-sm text-slate-600">File Allegato: {doc.fileName}</p>
                          </div>
                        )}
                      </div>

                      {/* Footer Sheet Margin */}
                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400 font-sans uppercase tracking-widest">
                        <span>BOOK AUTO PB</span>
                        <span>{car.brand} {car.model} — Pagina {docPageNum} di {totalCarPages} ({docTitleClean})</span>
                      </div>
                    </div>,
                    pageBadge
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


