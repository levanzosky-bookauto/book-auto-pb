// Utility for viewing, downloading, and printing uploaded car PDF documents and scanned files
// High-performance cross-browser implementation supporting Blob URLs, Safari macOS/iOS, Base64, and Print

/**
 * Safely converts a base64 Data URL to a native browser Blob with clean MIME type
 */
export function dataUrlToBlob(dataUrl, fallbackType = 'application/pdf') {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  if (!dataUrl.startsWith('data:')) return null;
  try {
    const commaIndex = dataUrl.indexOf(',');
    if (commaIndex === -1) return null;

    const meta = dataUrl.slice(5, commaIndex);
    let mime = meta.split(';')[0].trim() || fallbackType;
    if (!mime.includes('/')) mime = fallbackType;

    const base64Data = dataUrl.slice(commaIndex + 1);
    const raw = window.atob(base64Data);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }
    return new Blob([uInt8Array], { type: mime });
  } catch (e) {
    console.error('Error converting dataUrl to Blob:', e);
    return null;
  }
}

/**
 * Normalizes any document file source (resolves raw base64, data URLs, remote URLs, blob URLs)
 */
export function getDocumentSource(doc) {
  if (!doc) return null;
  const raw = doc.fileData || doc.dataUrl || doc.url || doc.file_url || doc.src;
  if (!raw || typeof raw !== 'string') return null;

  // If raw string doesn't start with protocol or data:, but looks like base64
  if (!raw.startsWith('data:') && !raw.startsWith('http://') && !raw.startsWith('https://') && !raw.startsWith('/') && !raw.startsWith('blob:')) {
    const isPdf = doc.fileType === 'application/pdf' || raw.startsWith('JVBERi0');
    return `data:${isPdf ? 'application/pdf' : (doc.fileType || 'image/jpeg')};base64,${raw}`;
  }

  return raw;
}

/**
 * Returns a native Blob URL for a document (best for Safari/Chrome iframe embedding & downloads)
 */
export function getSafeDocumentBlobUrl(doc) {
  const source = getDocumentSource(doc);
  if (!source) return null;

  if (source.startsWith('data:')) {
    const isPdf = doc?.fileType === 'application/pdf' || source.startsWith('data:application/pdf');
    const blob = dataUrlToBlob(source, isPdf ? 'application/pdf' : (doc?.fileType || 'image/jpeg'));
    if (blob) {
      return URL.createObjectURL(blob);
    }
  }

  return source;
}

/**
 * Download a document file with custom filename (supports Base64, Blob URLs, Remote URLs)
 */
export function downloadDocument(doc) {
  const fileSource = getDocumentSource(doc);
  if (!doc || !fileSource) {
    alert(`⚠️ Nessun file o scansione presente per "${doc?.title || doc?.fileName || 'questo documento'}". Clicca su "Modifica Dati" o "Gestisci Cartella" per caricare il file PDF o l'immagine.`);
    return;
  }

  const isPdf = doc.fileType === 'application/pdf' || 
    (typeof fileSource === 'string' && (fileSource.startsWith('data:application/pdf') || fileSource.toLowerCase().includes('.pdf')));
  const fileName = doc.fileName || `${(doc.title || 'documento').replace(/\s+/g, '_')}.${isPdf ? 'pdf' : 'jpg'}`;

  if (typeof fileSource === 'string' && fileSource.startsWith('data:')) {
    const blob = dataUrlToBlob(fileSource, doc.fileType || (isPdf ? 'application/pdf' : 'image/jpeg'));
    if (blob) {
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
      return;
    }
  }

  const link = document.createElement('a');
  link.href = fileSource;
  link.download = fileName;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Open a document for viewing or printing (supports PDF native viewer, Images, and Print)
 */
export function openDocument(doc, autoPrint = false) {
  const fileSource = getDocumentSource(doc);
  if (!doc || !fileSource) {
    alert(`⚠️ Nessun file o scansione presente per "${doc?.title || doc?.fileName || 'questo documento'}". Clicca su "Modifica Dati" o "Gestisci Cartella" per caricare il file PDF o l'immagine.`);
    return;
  }

  const isPdf = doc.fileType === 'application/pdf' || 
    (typeof fileSource === 'string' && (fileSource.startsWith('data:application/pdf') || fileSource.toLowerCase().includes('.pdf')));

  // Convert Base64 data URL to native Blob URL
  let targetSource = fileSource;
  if (typeof fileSource === 'string' && fileSource.startsWith('data:')) {
    const blob = dataUrlToBlob(fileSource, isPdf ? 'application/pdf' : (doc.fileType || 'image/jpeg'));
    if (blob) {
      targetSource = URL.createObjectURL(blob);
    }
  }

  // AUTO-PRINT ACTION
  if (autoPrint) {
    const printWindow = window.open(targetSource, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        setTimeout(() => {
          try {
            printWindow.focus();
            printWindow.print();
          } catch (e) {
            console.warn('Auto-print error:', e);
          }
        }, 500);
      };
    }
    return;
  }

  // DIRECT VIEW: open Blob URL directly in new tab (never opens about:blank!)
  const win = window.open(targetSource, '_blank');
  if (!win) {
    // If popup was blocked, fallback
    window.location.href = targetSource;
  }
}

export function printDocumentDirectly(doc) {
  openDocument(doc, true);
}
