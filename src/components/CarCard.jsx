import React, { useState } from 'react';
import { 
  Heart, 
  ChevronLeft, 
  ChevronRight, 
  Edit3, 
  Eye, 
  Zap, 
  Calendar, 
  Hash, 
  Gauge, 
  Award,
  Maximize2,
  Trash2,
  MapPin
} from 'lucide-react';

export default function CarCard({ 
  car, 
  onToggleFavorite, 
  onSelectCar, 
  onEditCar,
  onDeleteCar,
  isSelected,
  onToggleSelect
}) {
  const [currentImgIdx, setCurrentImgIdx] = useState(0);

  // Determine image list (use images extracted or fallback to page render)
  const images = car.images && car.images.length > 0 ? car.images : [car.pageImage];

  const handlePrevImg = (e) => {
    e.stopPropagation();
    setCurrentImgIdx((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImg = (e) => {
    e.stopPropagation();
    setCurrentImgIdx((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div 
      onClick={() => onSelectCar(car)}
      className={`glass-card rounded-2xl overflow-hidden flex flex-col cursor-pointer group transition-all duration-300 relative border ${
        isSelected 
          ? 'border-amber-400 bg-amber-500/10 shadow-xl shadow-amber-500/20 ring-2 ring-amber-400/50' 
          : 'border-white/10 hover:border-amber-500/40'
      }`}
    >
      {/* Top Image Box */}
      <div className="relative aspect-[16/10] bg-slate-950 overflow-hidden group/img">
        <img
          src={images[currentImgIdx]}
          alt={`${car.brand} ${car.model}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            e.target.src = car.pageImage;
          }}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-80" />

        {/* Checkbox Tick Button (Top-Left) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(car.id);
          }}
          className={`absolute top-3 left-3 w-7 h-7 rounded-xl backdrop-blur-md flex items-center justify-center transition-all z-10 border ${
            isSelected
              ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md scale-110'
              : 'bg-slate-900/70 text-slate-400 border-white/20 hover:bg-slate-900 hover:text-white'
          }`}
          title={isSelected ? 'Deseleziona Vettura' : 'Seleziona Vettura'}
        >
          {isSelected ? (
            <span className="font-extrabold text-sm text-slate-950">✓</span>
          ) : (
            <span className="w-3.5 h-3.5 rounded border border-slate-400 block" />
          )}
        </button>

        {/* Favorite Button (Top-Right) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(car.id);
          }}
          className={`absolute top-3 right-3 p-2 rounded-xl backdrop-blur-md transition-all z-10 border ${
            car.isFavorite
              ? 'bg-rose-500/30 text-rose-400 border-rose-500/50 shadow-lg shadow-rose-500/20 scale-110'
              : 'bg-slate-900/60 text-slate-300 border-white/10 hover:bg-slate-900 hover:text-white'
          }`}
          title={car.isFavorite ? 'Rimuovi dai Preferiti' : 'Aggiungi ai Preferiti'}
        >
          <Heart className={`w-4 h-4 ${car.isFavorite ? 'fill-rose-400 text-rose-400' : ''}`} />
        </button>

        {/* Image Navigation Carousel Arrows */}
        {images.length > 1 && (
          <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 flex justify-between opacity-0 group-hover/img:opacity-100 transition-opacity z-10">
            <button
              onClick={handlePrevImg}
              className="p-1.5 rounded-full bg-slate-900/80 backdrop-blur-md text-white border border-white/20 hover:bg-amber-500 hover:text-slate-950 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextImg}
              className="p-1.5 rounded-full bg-slate-900/80 backdrop-blur-md text-white border border-white/20 hover:bg-amber-500 hover:text-slate-950 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Carousel Dots */}
        {images.length > 1 && (
          <div className="absolute bottom-2 inset-x-0 flex justify-center space-x-1.5 z-10">
            {images.map((_, i) => (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  i === currentImgIdx ? 'bg-amber-400 w-4' : 'bg-white/40'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Card Details Body */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
        
        <div>
          {/* Brand & Model */}
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 font-heading">
              {car.brand}
            </span>
            {car.immatricolazione && (
              <span className="text-xs text-slate-400 flex items-center font-medium">
                <Calendar className="w-3 h-3 mr-1 text-slate-500" />
                {car.immatricolazione}
              </span>
            )}
          </div>
          
          <h3 className="text-lg font-bold font-heading text-white line-clamp-1 group-hover:text-amber-300 transition-colors">
            {car.model || 'Modello Non Specificato'}
          </h3>
        </div>

        {/* Key Technical Specs Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
          
          {car.horsepower ? (
            <div className="flex items-center text-slate-300">
              <Zap className="w-3.5 h-3.5 mr-1.5 text-rose-400 shrink-0" />
              <span className="truncate font-semibold">{car.horsepower} CV</span>
            </div>
          ) : (
            <div className="flex items-center text-slate-500">
              <Zap className="w-3.5 h-3.5 mr-1.5 shrink-0 opacity-40" />
              <span>— CV</span>
            </div>
          )}

          {car.cilindrata ? (
            <div className="flex items-center text-slate-300">
              <Gauge className="w-3.5 h-3.5 mr-1.5 text-blue-400 shrink-0" />
              <span className="truncate font-semibold">{car.cilindrata} cc</span>
            </div>
          ) : (
            <div className="flex items-center text-slate-500">
              <Gauge className="w-3.5 h-3.5 mr-1.5 shrink-0 opacity-40" />
              <span>— cc</span>
            </div>
          )}

          {car.esemplari && (
            <div className="col-span-2 flex items-center text-slate-300 border-t border-slate-800/80 pt-1.5 mt-1">
              <Award className="w-3.5 h-3.5 mr-1.5 text-amber-400 shrink-0" />
              <span className="truncate text-slate-300">Esemplari: <strong className="text-white">{car.esemplari}</strong></span>
            </div>
          )}

        </div>

        {/* VIN / Chassis snippet */}
        {car.chassis && (
          <div className="text-[11px] font-mono text-slate-400 truncate bg-slate-950/40 px-2 py-1 rounded border border-slate-800/60">
            <span className="text-slate-500 mr-1">TELAIO:</span>
            {car.chassis}
          </div>
        )}

        {/* Physical Location Snippet */}
        {car.location && (
          <div className="text-[11px] font-medium text-amber-300 truncate bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 flex items-center space-x-1">
            <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="truncate">{car.location}</span>
          </div>
        )}

        {/* Bottom Card Footer Actions */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectCar(car);
            }}
            className="flex items-center space-x-1.5 text-xs text-amber-400 hover:text-amber-300 font-semibold group-hover:translate-x-0.5 transition-all"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Vedi Scheda</span>
          </button>

          <div className="flex items-center space-x-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditCar(car);
              }}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
              title="Modifica Dati Vettura"
            >
              <Edit3 className="w-4 h-4" />
            </button>

            {onDeleteCar && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Sei sicuro di voler eliminare la scheda ${car.brand} ${car.model}?`)) {
                    onDeleteCar(car.id);
                  }
                }}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                title="Elimina Scheda Vettura"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
