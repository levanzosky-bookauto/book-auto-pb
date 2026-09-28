import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, RotateCw, Crop, Check, X, Move, Maximize, RefreshCw } from 'lucide-react';

export default function ImageCropperModal({
  imageSrc,
  aspectRatio = 8.5 / 6.5, // Default 8.5cm x 6.5cm ratio for car photos
  title = "Modifica & Ritaglia Immagine",
  onCropSave,
  onClose
}) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedAspect, setSelectedAspect] = useState(aspectRatio || (8.5 / 6.5));
  const [bgMode, setBgMode] = useState('checkerboard'); // 'checkerboard' | 'light' | 'dark'

  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Compute crop box display size on canvas
  const getCropBoxDimensions = () => {
    const maxW = 540;
    const maxH = 410;
    
    let w = maxW;
    let h = w / selectedAspect;

    if (h > maxH) {
      h = maxH;
      w = h * selectedAspect;
    }
    return { width: Math.round(w), height: Math.round(h) };
  };

  const cropBox = getCropBoxDimensions();

  // Calculate zoom so 100% of image fits inside cropBox without clipping
  const handleFitToCropBox = () => {
    if (!imgRef.current) return;
    const img = imgRef.current;
    
    const isRotated = rotation % 180 !== 0;
    const effW = isRotated ? img.height : img.width;
    const effH = isRotated ? img.width : img.height;

    // Scale so 100% of the image fits inside cropBox with a 5% margin
    const scaleX = (cropBox.width * 0.92) / effW;
    const scaleY = (cropBox.height * 0.92) / effH;
    const idealZoom = Math.min(scaleX, scaleY);

    setZoom(Math.max(0.05, Math.min(idealZoom, 4)));
    setOffset({ x: 0, y: 0 });
  };

  // Load target image & auto fit
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      setImgLoaded(true);
      setOffset({ x: 0, y: 0 });
      setRotation(0);
      
      // Calculate fit zoom immediately on load
      const isSquareLogo = selectedAspect === 1;
      const scaleX = (cropBox.width * (isSquareLogo ? 0.92 : 1)) / img.width;
      const scaleY = (cropBox.height * (isSquareLogo ? 0.92 : 1)) / img.height;
      const initialZoom = Math.min(scaleX, scaleY);

      setZoom(Math.max(0.05, Math.min(initialZoom, 4)));
    };
    img.src = imageSrc;
  }, [imageSrc, selectedAspect]);

  // Render canvas preview
  useEffect(() => {
    if (!imgLoaded || !canvasRef.current || !imgRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imgRef.current;

    const width = canvas.width;
    const height = canvas.height;

    // Background fill mode (Checkerboard / Light / Dark)
    if (bgMode === 'light') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    } else if (bgMode === 'dark') {
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, width, height);
    } else {
      // High contrast checkerboard grid for dark/transparent logos
      const checkSize = 16;
      for (let y = 0; y < height; y += checkSize) {
        for (let x = 0; x < width; x += checkSize) {
          const isEven = (Math.floor(x / checkSize) + Math.floor(y / checkSize)) % 2 === 0;
          ctx.fillStyle = isEven ? '#e2e8f0' : '#cbd5e1';
          ctx.fillRect(x, y, checkSize, checkSize);
        }
      }
    }

    // Save context state
    ctx.save();

    // Center & transform
    ctx.translate(width / 2 + offset.x, height / 2 + offset.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    // Draw base image centered
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();

  }, [imgLoaded, zoom, rotation, offset, selectedAspect, bgMode]);

  // Mouse drag handlers
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch drag handlers for mobile / tablet
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - offset.x, y: touch.clientY - offset.y });
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setOffset({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Reset zoom & pan
  const handleReset = () => {
    handleFitToCropBox();
  };

  // Process & Export Cropped Canvas
  const handleSave = () => {
    if (!imgRef.current || !canvasRef.current) return;

    const img = imgRef.current;

    // High-resolution export canvas dimensions (exact 8.5cm x 6.5cm or 6cm x 6cm aspect ratio)
    const outWidth = selectedAspect === 1 ? 720 : 1020;
    const outHeight = Math.round(outWidth / selectedAspect);

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = outWidth;
    exportCanvas.height = outHeight;

    const ctx = exportCanvas.getContext('2d');

    // Fill white background for transparent images
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, outWidth, outHeight);

    // Compute scale ratio from crop box to export canvas
    const scaleToExport = outWidth / cropBox.width;

    ctx.save();
    // Center of export canvas
    ctx.translate(outWidth / 2, outHeight / 2);
    
    // Apply pan offset relative to crop box center
    ctx.translate(offset.x * scaleToExport, offset.y * scaleToExport);
    
    // Apply rotation
    ctx.rotate((rotation * Math.PI) / 180);
    
    // Apply zoom & scale
    ctx.scale(zoom * scaleToExport, zoom * scaleToExport);

    // Draw centered image
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();

    const croppedDataUrl = exportCanvas.toDataURL('image/jpeg', 0.94);
    onCropSave(croppedDataUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-md animate-fade-in">
      
      <div 
        className="glass-panel w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[95vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/90 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Crop className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-heading">{title}</h3>
              <p className="text-xs text-slate-400">
                Formato ritaglio: <strong className="text-amber-400">8,5 cm × 6,5 cm</strong> (o 6×6 cm per logo). Trascina e zuma l'immagine per posizionarla al meglio.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Interactive Cropper Canvas Workspace (Large 720x520 Viewport) */}
        <div className="relative flex-1 bg-slate-950 flex items-center justify-center overflow-hidden p-4 select-none min-h-[480px]">
          
          <canvas
            ref={canvasRef}
            width={720}
            height={520}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="cursor-grab active:cursor-grabbing max-w-full max-h-full rounded-2xl shadow-2xl border border-slate-800/80"
          />

          {/* Overlay Crop Mask Guide with Center Crosshair (+) */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div 
              className="relative border-2 border-dashed border-amber-400 shadow-[0_0_0_9999px_rgba(9,13,22,0.72)] rounded-xl flex items-center justify-center transition-all duration-200"
              style={{
                width: `${cropBox.width}px`,
                height: `${cropBox.height}px`
              }}
            >
              {/* Horizontal Center Line */}
              <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-amber-400/40 border-t border-dashed border-amber-400/60 -translate-y-1/2 pointer-events-none" />

              {/* Vertical Center Line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-amber-400/40 border-l border-dashed border-amber-400/60 -translate-x-1/2 pointer-events-none" />

              {/* Center Crosshair Target Ring & Dot */}
              <div className="w-7 h-7 rounded-full border border-amber-400/70 bg-amber-500/10 backdrop-blur-[2px] flex items-center justify-center shadow-lg pointer-events-none z-10">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
              </div>

              {/* Top-Right Format Indicator (Non-Obstructing Tag outside center) */}
              <div className="absolute top-2 right-2 px-2.5 py-1 bg-slate-950/85 backdrop-blur-md rounded-lg border border-amber-500/30 text-[10px] font-extrabold text-amber-400 tracking-wide pointer-events-none">
                {selectedAspect === 1 ? '6 × 6 cm (Logo)' : '8,5 × 6,5 cm (Stampa)'}
              </div>
            </div>
          </div>

        </div>

        {/* Toolbar Controls */}
        <div className="p-4 px-6 bg-slate-900/95 border-t border-white/10 space-y-4 shrink-0">
          
          {/* Zoom, Rotation & Aspect Ratio controls */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            
            {/* Zoom Slider */}
            <div className="flex items-center space-x-2 flex-1 min-w-[280px]">
              <span className="text-xs font-semibold text-slate-300">Zoom:</span>
              <button
                type="button"
                onClick={() => setZoom(prev => Math.max(0.05, prev - 0.1))}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-all"
                title="Riduci Zoom"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              
              <input
                type="range"
                min="0.05"
                max="4"
                step="0.01"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />

              <button
                type="button"
                onClick={() => setZoom(prev => Math.min(4, prev + 0.1))}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-all"
                title="Aumenta Zoom"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              
              <span className="text-xs font-mono text-amber-400 font-bold w-12 text-right">
                {Math.round(zoom * 100)}%
              </span>

              {/* Auto-fit Button */}
              <button
                type="button"
                onClick={handleFitToCropBox}
                className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-bold rounded-xl text-xs border border-amber-500/30 transition-all flex items-center space-x-1 shrink-0 active:scale-95 ml-2 shadow-md"
                title="Ridimensiona l'immagine per farla stare interamente nel riquadro 6x6 senza tagli ai lati"
              >
                <Maximize className="w-3.5 h-3.5" />
                <span>Adatta Tutto</span>
              </button>
            </div>

            {/* Rotation & Aspect Ratio Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setRotation(prev => (prev - 90 + 360) % 360)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1 border border-slate-700 transition-all"
                title="Ruota a Sinistra 90°"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setRotation(prev => (prev + 90) % 360)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1 border border-slate-700 transition-all"
                title="Ruota a Destra 90°"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              {/* Background Contrast Selector (Scacchi / Chiaro / Scuro) */}
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setBgMode('checkerboard')}
                  className={`px-2.5 py-1.5 rounded-lg font-bold transition-all ${
                    bgMode === 'checkerboard' 
                      ? 'bg-amber-500 text-slate-950 shadow-md' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Sfondo a scacchi per evidenziare loghi scuri e immagini trasparenti"
                >
                  🏁 Scacchi
                </button>
                <button
                  type="button"
                  onClick={() => setBgMode('light')}
                  className={`px-2.5 py-1.5 rounded-lg font-bold transition-all ${
                    bgMode === 'light' 
                      ? 'bg-amber-500 text-slate-950 shadow-md' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Sfondo bianco chiaro"
                >
                  ⚪ Chiaro
                </button>
                <button
                  type="button"
                  onClick={() => setBgMode('dark')}
                  className={`px-2.5 py-1.5 rounded-lg font-bold transition-all ${
                    bgMode === 'dark' 
                      ? 'bg-amber-500 text-slate-950 shadow-md' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Sfondo scuro"
                >
                  🖤 Scuro
                </button>
              </div>

              {/* Aspect Ratio Presets Selector */}
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedAspect(8.5 / 6.5)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    Math.abs(selectedAspect - (8.5 / 6.5)) < 0.05
                      ? 'bg-amber-500 text-slate-950 shadow-md' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  8,5 × 6,5 cm (Stampa)
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedAspect(1)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    selectedAspect === 1 
                      ? 'bg-amber-500 text-slate-950 shadow-md' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  6 × 6 cm (Logo)
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedAspect(4 / 3)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    Math.abs(selectedAspect - (4 / 3)) < 0.02
                      ? 'bg-amber-500 text-slate-950 shadow-md' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  4:3
                </button>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl text-xs font-semibold transition-all border border-slate-700"
              >
                Reset
              </button>
            </div>

          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all border border-slate-700"
            >
              Annulla
            </button>
            
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-95 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Salva Foto Ritagliata</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
