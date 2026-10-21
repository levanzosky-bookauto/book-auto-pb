import React, { useEffect, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
}

export default function PdfPageCanvas({ source, className }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pages, setPages] = useState([]);

  useEffect(() => {
    let isCancelled = false;

    async function renderPdf() {
      if (!source) return;
      setLoading(true);
      setError(null);

      try {
        let loadingTask;
        if (typeof source === 'string' && source.startsWith('data:')) {
          const base64 = source.split(';base64,')[1] || source;
          const binary = atob(base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          loadingTask = pdfjsLib.getDocument({ data: bytes });
        } else {
          loadingTask = pdfjsLib.getDocument(source);
        }

        const pdf = await loadingTask.promise;
        if (isCancelled) return;

        const renderedPages = [];
        for (let p = 1; p <= pdf.numPages; p++) {
          const page = await pdf.getPage(p);
          const viewport = page.getViewport({ scale: 2.0 });

          const offscreenCanvas = document.createElement('canvas');
          offscreenCanvas.width = viewport.width;
          offscreenCanvas.height = viewport.height;
          const ctx = offscreenCanvas.getContext('2d');

          await page.render({
            canvasContext: ctx,
            viewport: viewport
          }).promise;

          renderedPages.push(offscreenCanvas.toDataURL('image/jpeg', 0.95));
        }

        if (!isCancelled) {
          setPages(renderedPages);
          setLoading(false);
        }
      } catch (err) {
        if (!isCancelled) {
          console.warn('PdfPageCanvas render error:', err);
          setError(err.message || 'Errore rendering scansione');
          setLoading(false);
        }
      }
    }

    renderPdf();

    return () => {
      isCancelled = true;
    };
  }, [source]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-2 text-slate-400">
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-xs font-semibold">Caricamento scansione documento in corso...</p>
      </div>
    );
  }

  if (error || pages.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-rose-500 bg-rose-50 rounded border border-rose-200">
        Impossibile caricare anteprima scansione: {error || 'File non trovato'}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center gap-4 w-full h-full ${className || ''}`}>
      {pages.map((dataUrl, idx) => (
        <img 
          key={idx}
          src={dataUrl}
          alt={`Pagina ${idx + 1}`}
          className="max-w-full max-h-[260mm] w-auto h-auto object-contain block mx-auto my-auto shadow-sm border border-slate-200 rounded"
        />
      ))}
    </div>
  );
}
