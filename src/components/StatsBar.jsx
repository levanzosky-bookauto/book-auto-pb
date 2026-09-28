import React from 'react';
import { Shield, Zap, Sparkles, Trophy, Award, Layers, MapPin } from 'lucide-react';

export default function StatsBar({ 
  cars, 
  brands, 
  selectedBrand, 
  setSelectedBrand,
  locations = [],
  selectedLocation = 'Tutti',
  setSelectedLocation,
  totalCarsCount,
  filteredCount
}) {
  return (
    <div className="space-y-3 mb-6">
      {/* Brand Horizontal Filter Chips */}
      <div className="relative">
        <div className="flex items-center space-x-2 overflow-x-auto px-2 py-2.5 -mx-2 no-scrollbar scroll-smooth">
          <button
            onClick={() => setSelectedBrand('Tutti')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 ${
              selectedBrand === 'Tutti'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20 scale-105'
                : 'bg-slate-900/80 text-slate-300 border-slate-700/80 hover:bg-slate-800 hover:text-white'
            }`}
          >
            Tutti i Marchi ({totalCarsCount})
          </button>
          
          {brands.map(brand => {
            const count = cars.filter(c => c.brand === brand).length;
            const isSelected = selectedBrand === brand;
            return (
              <button
                key={brand}
                onClick={() => setSelectedBrand(brand)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border shrink-0 flex items-center space-x-1.5 ${
                  isSelected
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-md shadow-amber-500/10 scale-105'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <span>{brand}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isSelected ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Location / Garage Horizontal Filter Chips (if locations exist) */}
      {locations.length > 0 && setSelectedLocation && (
        <div className="flex items-center space-x-2 overflow-x-auto px-2 py-2 -mx-2 no-scrollbar scroll-smooth border-t border-slate-800/60">
          <div className="flex items-center space-x-1 text-slate-400 text-xs font-bold shrink-0 pr-1">
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Garage:</span>
          </div>

          <button
            onClick={() => setSelectedLocation('Tutti')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border shrink-0 ${
              selectedLocation === 'Tutti'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                : 'bg-slate-900/50 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            Tutti i Garage
          </button>

          {locations.map(loc => {
            const count = cars.filter(c => c.location === loc).length;
            const isSelected = selectedLocation === loc;
            return (
              <button
                key={loc}
                onClick={() => setSelectedLocation(loc)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border shrink-0 flex items-center space-x-1.5 ${
                  isSelected
                    ? 'bg-amber-500/30 text-amber-200 border-amber-400 shadow-md scale-105'
                    : 'bg-slate-900/40 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <span>{loc}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isSelected ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

    </div>
  );
}
