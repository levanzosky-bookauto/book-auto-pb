import React from 'react';
import { Heart, Eye, Edit3, Calendar, Zap, Gauge, Award, Trash2, MapPin } from 'lucide-react';

export default function CarListView({ 
  cars, 
  onToggleFavorite, 
  onSelectCar, 
  onEditCar,
  onDeleteCar,
  selectedCarIds = [],
  onToggleSelect,
  onToggleSelectAll
}) {
  const allSelected = cars.length > 0 && cars.every(c => selectedCarIds.includes(c.id));

  return (
    <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900/90 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th className="py-3.5 px-4 w-10 text-center">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500/50 bg-slate-900 cursor-pointer"
                  title="Seleziona tutte"
                />
              </th>
              <th className="py-3.5 px-4">Vettura</th>
              <th className="py-3.5 px-4">Ubicazione / Garage</th>
              <th className="py-3.5 px-4">Immatricolazione</th>
              <th className="py-3.5 px-4">Telaio (VIN)</th>
              <th className="py-3.5 px-4 text-right">Potenza (CV)</th>
              <th className="py-3.5 px-4 text-right">Cilindrata</th>
              <th className="py-3.5 px-4">Esemplari</th>
              <th className="py-3.5 px-4 text-center">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 text-xs text-slate-200 font-medium">
            {cars.map((car) => {
              const mainImg = car.images && car.images.length > 0 ? car.images[0] : car.pageImage;
              const isSelected = selectedCarIds.includes(car.id);
              return (
                <tr 
                  key={car.id} 
                  onClick={() => onSelectCar(car)}
                  className={`transition-colors cursor-pointer group ${
                    isSelected ? 'bg-amber-500/10 hover:bg-amber-500/20' : 'hover:bg-slate-800/50'
                  }`}
                >
                  {/* Checkbox */}
                  <td className="py-3 px-4 text-center shrink-0" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(car.id)}
                      className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500/50 bg-slate-900 cursor-pointer"
                    />
                  </td>

                  {/* Vettura info with thumbnail */}
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-9 rounded-lg overflow-hidden bg-slate-950 border border-slate-800 shrink-0">
                        <img src={mainImg} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase text-amber-400 tracking-wider">
                          {car.brand}
                        </div>
                        <div className="font-bold text-sm text-white group-hover:text-amber-300 transition-colors">
                          {car.model}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Ubicazione / Garage */}
                  <td className="py-3 px-4 text-amber-300 font-semibold text-xs">
                    {car.location ? (
                      <span className="inline-flex items-center space-x-1 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                        <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>{car.location}</span>
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>

                  {/* Immatricolazione */}
                  <td className="py-3 px-4 text-slate-300">
                    {car.immatricolazione || '—'}
                  </td>

                  {/* Telaio */}
                  <td className="py-3 px-4 font-mono text-slate-400">
                    {car.chassis || '—'}
                  </td>

                  {/* Potenza */}
                  <td className="py-3 px-4 text-right font-bold text-white">
                    {car.horsepower ? `${car.horsepower} CV` : '—'}
                  </td>

                  {/* Cilindrata */}
                  <td className="py-3 px-4 text-right text-slate-300">
                    {car.cilindrata ? `${car.cilindrata} cc` : '—'}
                  </td>

                  {/* Esemplari */}
                  <td className="py-3 px-4 text-slate-300">
                    {car.esemplari || '—'}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center space-x-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onToggleFavorite(car.id)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          car.isFavorite ? 'text-rose-400 bg-rose-500/10' : 'text-slate-400 hover:text-white'
                        }`}
                        title="Preferito"
                      >
                        <Heart className={`w-4 h-4 ${car.isFavorite ? 'fill-rose-400' : ''}`} />
                      </button>

                      <button
                        onClick={() => onEditCar(car)}
                        className="p-1.5 text-slate-400 hover:text-amber-400 transition-colors"
                        title="Modifica"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onSelectCar(car)}
                        className="p-1.5 text-slate-400 hover:text-white transition-colors"
                        title="Vedi Dettagli"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {onDeleteCar && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Sei sicuro di voler eliminare la scheda ${car.brand} ${car.model}?`)) {
                              onDeleteCar(car.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
                          title="Elimina Scheda Vettura"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
