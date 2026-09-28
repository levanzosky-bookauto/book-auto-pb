// Utility for viewing, downloading, and printing uploaded car PDF documents and scanned files

export function downloadDocument(doc) {
  if (!doc || !doc.fileData) return;
  const link = document.createElement('a');
  link.href = doc.fileData;
  link.download = doc.fileName || `${(doc.title || 'documento').replace(/\s+/g, '_')}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function openDocument(doc, autoPrint = false) {
  if (!doc || !doc.fileData) return;

  const win = window.open('', '_blank');
  if (!win) {
    alert('Impossibile aprire la finestra del documento. Abilita i popup nel browser.');
    return;
  }

  const isPdf = doc.fileType === 'application/pdf' || (doc.fileData && doc.fileData.startsWith('data:application/pdf'));
  const title = doc.title || doc.fileName || 'Documento Vettura';
  const fileName = doc.fileName || 'documento.pdf';

  win.document.write(`
    <!DOCTYPE html>
    <html lang="it">
      <head>
        <meta charset="UTF-8" />
        <title>${title} — Book Auto PB</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { 
            background: #090d16; 
            color: #f8fafc; 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
            display: flex; 
            flex-direction: column; 
            height: 100vh; 
            overflow: hidden; 
          }
          .toolbar { 
            display: flex; 
            align-items: center; 
            justify-content: space-between; 
            padding: 12px 24px; 
            background: #0f172a; 
            border-bottom: 1px solid #1e293b; 
            box-shadow: 0 4px 12px rgba(0,0,0,0.4); 
            z-index: 10; 
          }
          .title-area { display: flex; align-items: center; gap: 12px; }
          .icon { font-size: 20px; }
          .title { font-weight: 800; font-size: 16px; color: #f59e0b; letter-spacing: -0.01em; }
          .subtitle { font-size: 12px; color: #94a3b8; margin-top: 2px; }
          .actions { display: flex; align-items: center; gap: 10px; }
          .btn { 
            background: #1e293b; 
            color: #f8fafc; 
            border: 1px solid #334155; 
            padding: 8px 16px; 
            border-radius: 10px; 
            cursor: pointer; 
            font-weight: 700; 
            font-size: 13px; 
            text-decoration: none; 
            display: inline-flex; 
            align-items: center; 
            gap: 6px; 
            transition: all 0.2s ease; 
          }
          .btn:hover { background: #334155; color: #ffffff; }
          .btn-print { 
            background: linear-gradient(135deg, #f59e0b, #d97706); 
            color: #090d16; 
            border: none; 
            box-shadow: 0 4px 12px rgba(245,158,11,0.25); 
          }
          .btn-print:hover { background: linear-gradient(135deg, #fbbf24, #f59e0b); }
          .content-container { 
            flex: 1; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            padding: 20px; 
            background: #020617; 
            overflow: auto; 
          }
          iframe, img { 
            max-width: 100%; 
            max-height: 100%; 
            border: none; 
            border-radius: 12px; 
            box-shadow: 0 20px 40px rgba(0,0,0,0.8); 
          }
          iframe { width: 100%; height: 100%; background: #ffffff; }

          @page {
            size: auto;
            margin: 0;
          }

          @media print {
            html, body {
              background: #ffffff !important;
              color: #000000 !important;
              height: 100% !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: visible !important;
            }
            .toolbar {
              display: none !important;
            }
            .content-container {
              padding: 0 !important;
              margin: 0 !important;
              background: #ffffff !important;
              height: 100vh !important;
              width: 100vw !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              overflow: hidden !important;
            }
            img {
              max-width: 100% !important;
              max-height: 100vh !important;
              object-fit: contain !important;
              border-radius: 0 !important;
              box-shadow: none !important;
            }
            iframe {
              width: 100vw !important;
              height: 100vh !important;
              border: none !important;
              box-shadow: none !important;
              border-radius: 0 !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="toolbar">
          <div class="title-area">
            <span class="icon">📄</span>
            <div>
              <div class="title">${title}</div>
              <div class="subtitle">Allegato Scansionato (${fileName})</div>
            </div>
          </div>
          <div class="actions">
            <button class="btn btn-print" onclick="window.print()">🖨️ Stampa Documento</button>
            <a class="btn" href="${doc.fileData}" download="${fileName}">⬇️ Scarica File</a>
          </div>
        </div>
        <div class="content-container">
          ${isPdf 
            ? `<iframe src="${doc.fileData}#toolbar=1" type="application/pdf"></iframe>` 
            : `<img src="${doc.fileData}" alt="${title}" />`
          }
        </div>
        <script>
          ${autoPrint ? 'window.onload = function() { setTimeout(function() { window.print(); }, 300); };' : ''}
        </script>
      </body>
    </html>
  `);
  win.document.close();
}

export function printDocumentDirectly(doc) {
  openDocument(doc, true);
}
