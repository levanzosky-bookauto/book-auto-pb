import React, { useState, useEffect, useMemo } from 'react';
import Navbar from './components/Navbar';
import StatsBar from './components/StatsBar';
import CarCard from './components/CarCard';
import CarListView from './components/CarListView';
import CarDetailModal from './components/CarDetailModal';
import AddEditCarModal from './components/AddEditCarModal';
import BackupModal from './components/BackupModal';
import PdfPrintReportModal from './components/PdfPrintReportModal';
import BrandLogosModal from './components/BrandLogosModal';
import ExpirationsModal from './components/ExpirationsModal';
import AdminModal from './components/AdminModal';
import AdminLoginPage from './components/AdminLoginPage';
import AutoEmailNotificationPopup from './components/AutoEmailNotificationPopup';
import { SlidersHorizontal, ArrowUpDown, Plus, RotateCcw, Car as CarIcon, Sparkles, CheckSquare, Printer, Square, Trash2, Bell } from 'lucide-react';
import { getLogoForBrand, getCustomBrandLogos, DEFAULT_BRAND_LOGOS } from './utils/brandLogos';
import { getVehicleExpirations } from './utils/notifications';
import { getCurrentUser, setCurrentUser as setCurrentUserInStorage, logoutUser } from './utils/auth';
import { checkAndTriggerAutomaticEmailAlerts } from './utils/emailAlerts';
import { fetchCarsFromSupabase, syncCarsToSupabase } from './utils/supabase';

const LOCAL_STORAGE_KEY = 'book_auto_pb_cars_v1';

export default function App() {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Auth & User State
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());

  const handleLoginSuccess = (user) => {
    setCurrentUserInStorage(user);
    setCurrentUser(user);
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
  };
  
  // Selection State
  const [selectedCarIds, setSelectedCarIds] = useState([]);
  
  // Filters & State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('Tutti');
  const [selectedLocation, setSelectedLocation] = useState('Tutti');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [sortBy, setSortBy] = useState('page'); // 'page' | 'brand' | 'hp_desc' | 'year_desc'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  // Visual Effects & Expiration Alert Bar Toggles (saved in localStorage)
  const [showSideGlow, setShowSideGlow] = useState(() => {
    const saved = localStorage.getItem('book_auto_pb_side_glow');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [showExpirationBar, setShowExpirationBar] = useState(() => {
    const saved = localStorage.getItem('book_auto_pb_expiration_bar');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Active Modals
  const [selectedCar, setSelectedCar] = useState(null);
  const [carToEdit, setCarToEdit] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isPdfReportModalOpen, setIsPdfReportModalOpen] = useState(false);
  const [isBrandLogosModalOpen, setIsBrandLogosModalOpen] = useState(false);
  const [isExpirationsModalOpen, setIsExpirationsModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [autoEmailPopupAlerts, setAutoEmailPopupAlerts] = useState(null);

  // Automatic Email Expiration Check on Load / Cars Update
  useEffect(() => {
    if (!loading && cars && cars.length > 0) {
      const result = checkAndTriggerAutomaticEmailAlerts(cars);
      if (result && (result.autoTriggered || (result.alerts && result.alerts.length > 0))) {
        // Show auto-email notification toast/popup
        setAutoEmailPopupAlerts(result.alerts);
      }
    }
  }, [cars, loading]);

  // Helper to normalize image paths for multi-environment hosting
  const formatCarImages = (carList) => {
    if (!Array.isArray(carList)) return carList;
    const fixPath = (p) => {
      if (!p || typeof p !== 'string') return p;
      if (p.startsWith('/images/')) return '.' + p;
      return p;
    };

    return carList.map(car => ({
      ...car,
      mainPhoto: fixPath(car.mainPhoto),
      logoImg: fixPath(car.logoImg),
      pageImage: fixPath(car.pageImage),
      images: Array.isArray(car.images) ? car.images.map(fixPath) : [],
      carPhotos: Array.isArray(car.carPhotos) ? car.carPhotos.map(fixPath) : []
    }));
  };

  // Load Initial Data (Preserve local edits first, fallback to Supabase or /data/cars.json)
  useEffect(() => {
    async function loadInitialCars() {
      // 1. Check local storage first so user edits are NEVER reset or overwritten
      const savedLocal = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedLocal) {
        try {
          const parsed = JSON.parse(savedLocal);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const formatted = formatCarImages(parsed);
            setCars(formatted);
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(formatted));
            setLoading(false);
            return;
          }
        } catch (e) {
          console.error('Error parsing local storage:', e);
        }
      }

      // 2. Try Supabase if local storage is empty
      const supabaseCars = await fetchCarsFromSupabase();
      if (supabaseCars && supabaseCars.length > 0) {
        const formatted = formatCarImages(supabaseCars);
        setCars(formatted);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(formatted));
        setLoading(false);
        return;
      }

      // 3. Fallback to default cars.json
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}data/cars.json`);
        const defaultCars = await res.json();
        const formattedDefault = formatCarImages(defaultCars);
        setCars(formattedDefault);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(formattedDefault));
        setLoading(false);
      } catch (err) {
        console.error('Error loading default cars.json:', err);
        setLoading(false);
      }
    }

    loadInitialCars();
  }, []);

  // Save to state, localStorage, and sync to Supabase Cloud
  const saveCarsState = (newCars) => {
    setCars(newCars);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newCars));
    syncCarsToSupabase(newCars);
  };

  // Selection Toggle Handlers
  const handleToggleSelect = (carId) => {
    setSelectedCarIds(prev => 
      prev.includes(carId) ? prev.filter(id => id !== carId) : [...prev, carId]
    );
  };

  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredCars.map(c => c.id);
    const areAllSelected = allFilteredIds.every(id => selectedCarIds.includes(id));
    if (areAllSelected) {
      setSelectedCarIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      setSelectedCarIds(prev => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  const handleDeselectAll = () => {
    setSelectedCarIds([]);
  };

  // Selected Cars list
  const selectedCarsList = useMemo(() => {
    return cars.filter(c => selectedCarIds.includes(c.id));
  }, [cars, selectedCarIds]);

  // Toggle Favorite
  const handleToggleFavorite = (carId) => {
    const updated = cars.map(c => 
      c.id === carId ? { ...c, isFavorite: !c.isFavorite } : c
    );
    saveCarsState(updated);
    if (selectedCar && selectedCar.id === carId) {
      setSelectedCar(prev => ({ ...prev, isFavorite: !prev.isFavorite }));
    }
  };

  // Save New or Modified Car
  const handleSaveCar = (carData) => {
    // Ensure newly created cars sort to the top
    if (!carToEdit) {
      carData.page = 0; // page 0 sorts before page 2
    }
    
    const existingIndex = cars.findIndex(c => c.id === carData.id);
    let updated = [];
    if (existingIndex >= 0) {
      updated = [...cars];
      updated[existingIndex] = carData;
    } else {
      updated = [carData, ...cars];
    }
    
    saveCarsState(updated);
    
    // Clear filters so user immediately sees the newly added car
    setSelectedBrand('Tutti');
    setSearchQuery('');
    setOnlyFavorites(false);
    
    setIsAddModalOpen(false);
    setCarToEdit(null);
  };

  // Delete Single Car
  const handleDeleteCar = (carId) => {
    const updated = cars.filter(c => c.id !== carId);
    saveCarsState(updated);
    setSelectedCarIds(prev => prev.filter(id => id !== carId));
  };

  // Update Car Photos order (reordering & setting cover photo)
  const handleUpdateCarImages = (carId, newImages) => {
    const updated = cars.map(c => {
      if (c.id === carId) {
        return {
          ...c,
          images: newImages,
          carPhotos: newImages,
          mainPhoto: newImages.length > 0 ? newImages[0] : c.mainPhoto,
          pageImage: newImages.length > 0 ? newImages[0] : c.pageImage
        };
      }
      return c;
    });
    saveCarsState(updated);
    if (selectedCar && selectedCar.id === carId) {
      setSelectedCar(prev => ({
        ...prev,
        images: newImages,
        carPhotos: newImages,
        mainPhoto: newImages.length > 0 ? newImages[0] : prev.mainPhoto,
        pageImage: newImages.length > 0 ? newImages[0] : prev.pageImage
      }));
    }
  };

  // Open PDF Print Report Modal for a specific car
  const handleOpenPrintPdfForCar = (car) => {
    setSelectedCarIds([car.id]);
    setIsPdfReportModalOpen(true);
  };

  // Sync updated brand logos across all cars
  const handleLogosUpdated = () => {
    const updated = cars.map(car => ({
      ...car,
      logoImg: getLogoForBrand(car.brand) || car.logoImg
    }));
    saveCarsState(updated);
    if (selectedCar) {
      setSelectedCar(prev => prev ? ({
        ...prev,
        logoImg: getLogoForBrand(prev.brand) || prev.logoImg
      }) : null);
    }
  };

  // Bulk Delete Selected Cars
  const handleDeleteSelectedCars = () => {
    if (selectedCarIds.length === 0) return;
    if (window.confirm(`Sei sicuro di voler eliminare le ${selectedCarIds.length} schede selezionate?`)) {
      const updated = cars.filter(c => !selectedCarIds.includes(c.id));
      saveCarsState(updated);
      setSelectedCarIds([]);
    }
  };

  // Reset to original PDF dataset
  const handleResetData = () => {
    fetch(`${import.meta.env.BASE_URL}data/cars.json`)
      .then(res => res.json())
      .then(data => {
        setCars(data);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
        setSelectedBrand('Tutti');
        setSearchQuery('');
        setOnlyFavorites(false);
        setSelectedCarIds([]);
      });
  };

  // Extract list of all unique brands sorted alphabetically
  const brands = useMemo(() => {
    const customLogos = getCustomBrandLogos();
    const set = new Set([
      ...cars.map(c => c.brand).filter(Boolean),
      ...Object.keys(DEFAULT_BRAND_LOGOS).map(b => b.toUpperCase()),
      ...Object.keys(customLogos).map(b => b.toUpperCase())
    ]);
    return Array.from(set).sort();
  }, [cars]);

  // Extract list of all unique locations present in cars
  const locations = useMemo(() => {
    const set = new Set(cars.map(c => c.location).filter(Boolean));
    return Array.from(set).sort();
  }, [cars]);

  // Filter & Sort Logic
  const filteredCars = useMemo(() => {
    return cars.filter(car => {
      // Search query filter (Brand, Model, Chassis, Year, Location, Targa)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchBrand = (car.brand || '').toLowerCase().includes(q);
        const matchModel = (car.model || '').toLowerCase().includes(q);
        const matchChassis = (car.chassis || '').toLowerCase().includes(q);
        const matchYear = (car.immatricolazione || '').toLowerCase().includes(q);
        const matchLocation = (car.location || '').toLowerCase().includes(q);
        const matchPlate = (car.targa || '').toLowerCase().includes(q);
        if (!matchBrand && !matchModel && !matchChassis && !matchYear && !matchLocation && !matchPlate) {
          return false;
        }
      }

      // Brand filter
      if (selectedBrand !== 'Tutti' && car.brand !== selectedBrand) {
        return false;
      }

      // Location filter
      if (selectedLocation !== 'Tutti' && car.location !== selectedLocation) {
        return false;
      }

      // Favorite filter
      if (onlyFavorites && !car.isFavorite) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'brand') {
        return a.brand.localeCompare(b.brand) || a.model.localeCompare(b.model);
      }
      if (sortBy === 'hp_desc') {
        const getHp = c => parseInt((c.horsepower || '').match(/\d+/)?.[0] || '0', 10);
        return getHp(b) - getHp(a);
      }
      if (sortBy === 'year_desc') {
        const getYear = c => parseInt((c.immatricolazione || '').match(/\d{4}/)?.[0] || '0', 10);
        return getYear(b) - getYear(a);
      }
      // Default: sort newly added cars (page 0 or non-number) FIRST
      const getPage = c => (typeof c.page === 'number' ? c.page : 0);
      return getPage(a) - getPage(b);
    });
  }, [cars, searchQuery, selectedBrand, onlyFavorites, sortBy]);

  const favoritesCount = useMemo(() => cars.filter(c => c.isFavorite).length, [cars]);

  // Compute Expiration Alerts (Bollo, Assicurazione, Revisione, Tagliando)
  const expirationsAlerts = useMemo(() => getVehicleExpirations(cars), [cars]);
  const hasUrgentExpirations = useMemo(() => 
    expirationsAlerts.some(a => a.alertLevel === 'expired' || a.alertLevel === 'urgent'), 
    [expirationsAlerts]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080d1a] flex flex-col items-center justify-center space-y-4">
        <div className="w-16 h-16 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
        <p className="text-amber-400 font-heading font-bold text-lg tracking-wider">Caricamento Book Auto PB...</p>
      </div>
    );
  }

  // If user is not logged in, display the initial Admin Login Page with slideshow background
  if (!currentUser) {
    return <AdminLoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen flex flex-col pb-16 relative">
      
      {/* Soft Ambient Side Glow Lights (Azure / Cyan / Blue breathing aura on viewport left and right edges) */}
      {showSideGlow && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
          {/* Left Side Azure Aura */}
          <div className="absolute top-1/4 -left-36 w-96 h-[700px] bg-gradient-to-r from-cyan-500/25 via-blue-600/15 to-transparent rounded-full blur-3xl animate-side-aura" />
          
          {/* Right Side Blue/Indigo Aura */}
          <div className="absolute top-1/3 -right-36 w-96 h-[700px] bg-gradient-to-l from-blue-600/25 via-indigo-600/15 to-transparent rounded-full blur-3xl animate-side-aura" style={{ animationDelay: '2s' }} />
        </div>
      )}

      {/* Header & Navbar */}
      <Navbar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedBrand={selectedBrand}
        setSelectedBrand={setSelectedBrand}
        brands={brands}
        carsCount={cars.length}
        favoritesCount={favoritesCount}
        selectedCount={selectedCarIds.length}
        expirationsCount={expirationsAlerts.length}
        hasUrgentExpirations={hasUrgentExpirations}
        onOpenExpirationsModal={() => setIsExpirationsModalOpen(true)}
        onOpenAdminModal={() => setIsAdminModalOpen(true)}
        onOpenAddModal={() => { setCarToEdit(null); setIsAddModalOpen(true); }}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        onResetData={handleResetData}
        onOpenPdfReportModal={() => setIsPdfReportModalOpen(true)}
        onOpenBrandLogosModal={() => setIsBrandLogosModalOpen(true)}
        onlyFavorites={onlyFavorites}
        setOnlyFavorites={setOnlyFavorites}
        viewMode={viewMode}
        setViewMode={setViewMode}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Top Expiration Notification Banner (Animated Progress Color Gradient) */}
      {showExpirationBar && expirationsAlerts.length > 0 && (
        <div className="relative z-10 animate-alert-glow border-b border-amber-500/40 px-4 py-2.5 text-xs text-amber-100 shadow-lg">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <Bell className={`w-4 h-4 shrink-0 ${hasUrgentExpirations ? 'text-rose-300 animate-bounce' : 'text-amber-300'}`} />
              <span>
                <strong className="text-amber-200 font-extrabold">{expirationsAlerts.length} {expirationsAlerts.length === 1 ? 'scadenza' : 'scadenze'}</strong> (Bollo, Assicurazione, Revisione, Tagliando) nei prossimi 2 mesi.
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsExpirationsModalOpen(true)}
                className="px-3.5 py-1 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-extrabold text-[11px] rounded-lg shadow-md transition-all active:scale-95 shrink-0 border border-amber-300/40"
              >
                Controlla Scadenze ({expirationsAlerts.length})
              </button>
              <button
                onClick={() => setIsAdminModalOpen(true)}
                className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-[11px] rounded-lg border border-amber-500/40 shadow transition-all shrink-0"
              >
                ⚙️ Admin & Email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 flex-1 w-full">
        
        {/* Brand & Location Filter Chips */}
        <StatsBar
          cars={cars}
          brands={brands}
          selectedBrand={selectedBrand}
          setSelectedBrand={setSelectedBrand}
          locations={locations}
          selectedLocation={selectedLocation}
          setSelectedLocation={setSelectedLocation}
          totalCarsCount={cars.length}
          filteredCount={filteredCars.length}
        />

        {/* Toolbar Header (Sort, Selection Actions & Counter) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
          
          <div className="flex items-center space-x-3 flex-wrap gap-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-slate-200">
                Risultati Trovati:
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/20">
                {filteredCars.length} vetture
              </span>
            </div>

            {/* Selection Counter & Quick Bulk Selection Actions */}
            <div className="flex items-center space-x-2 pl-3 border-l border-slate-800 flex-wrap gap-y-2">
              <button
                onClick={handleSelectAllFiltered}
                className="flex items-center space-x-1.5 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold transition-all"
              >
                <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                <span>Seleziona Tutte</span>
              </button>

              {selectedCarIds.length > 0 && (
                <>
                  <button
                    onClick={handleDeselectAll}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-xl text-xs font-semibold"
                  >
                    Deseleziona ({selectedCarIds.length})
                  </button>

                  <button
                    onClick={() => setIsPdfReportModalOpen(true)}
                    className="flex items-center space-x-1.5 px-3.5 py-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs shadow-md shadow-amber-500/20 transition-all active:scale-95"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Stampa / PDF ({selectedCarIds.length})</span>
                  </button>

                  <button
                    onClick={handleDeleteSelectedCars}
                    className="flex items-center space-x-1.5 px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-semibold transition-all"
                    title="Elimina schede selezionate"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Elimina ({selectedCarIds.length})</span>
                  </button>
                </>
              )}
            </div>

          </div>

          {/* Sort Control */}
          <div className="flex items-center space-x-2 text-xs">
            <ArrowUpDown className="w-4 h-4 text-slate-400" />
            <span className="text-slate-400 font-medium">Ordina per:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            >
              <option value="page">Ordine Predefinito</option>
              <option value="brand">Marca (A-Z)</option>
              <option value="hp_desc">Potenza (CV Decrescente)</option>
              <option value="year_desc">Anno (Più Recente)</option>
            </select>
          </div>
        </div>

        {/* Grid or List Content */}
        {filteredCars.length === 0 ? (
          <div className="glass-panel rounded-3xl p-12 text-center max-w-md mx-auto my-12 space-y-4">
            <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-amber-400">
              <CarIcon className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold font-heading text-white">Nessuna Vettura Trovata</h3>
            <p className="text-xs text-slate-400">
              Nessun risultato corrisponde ai filtri impostati. Prova a modificare la ricerca o ripristinare i filtri.
            </p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedBrand('Tutti'); setOnlyFavorites(false); }}
              className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs"
            >
              Mostra Tutte le Vetture
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredCars.map((car) => (
              <CarCard
                key={car.id}
                car={car}
                isSelected={selectedCarIds.includes(car.id)}
                onToggleSelect={handleToggleSelect}
                onToggleFavorite={handleToggleFavorite}
                onSelectCar={setSelectedCar}
                onEditCar={(c) => { setCarToEdit(c); setIsAddModalOpen(true); }}
                onDeleteCar={handleDeleteCar}
              />
            ))}
          </div>
        ) : (
          <CarListView
            cars={filteredCars}
            selectedCarIds={selectedCarIds}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleSelectAllFiltered}
            onToggleFavorite={handleToggleFavorite}
            onSelectCar={setSelectedCar}
            onEditCar={(c) => { setCarToEdit(c); setIsAddModalOpen(true); }}
            onDeleteCar={handleDeleteCar}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-800/80 py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-heading font-bold text-amber-400">BOOK AUTO PB</span>
            <span>— Catalogo & Garage Vetture</span>
          </div>
          <p>© 2026 Book Auto PB. Ottimizzato per iPhone, iPad, Mac & Localhost.</p>
        </div>
      </footer>

      {/* Modals */}
      {selectedCar && (
        <CarDetailModal
          car={selectedCar}
          onClose={() => setSelectedCar(null)}
          onToggleFavorite={handleToggleFavorite}
          onEditCar={(c) => {
            setSelectedCar(null);
            setCarToEdit(c);
            setIsAddModalOpen(true);
          }}
          onDeleteCar={handleDeleteCar}
          onUpdateCarPhotos={handleUpdateCarImages}
          onOpenPrintPdf={handleOpenPrintPdfForCar}
        />
      )}

      {isAddModalOpen && (
        <AddEditCarModal
          carToEdit={carToEdit}
          onClose={() => { setIsAddModalOpen(false); setCarToEdit(null); }}
          onSaveCar={handleSaveCar}
          existingBrands={brands}
        />
      )}

      {isBackupModalOpen && (
        <BackupModal
          cars={cars}
          onClose={() => setIsBackupModalOpen(false)}
          onImportData={(newCars) => saveCarsState(newCars)}
          onResetData={handleResetData}
        />
      )}

      {isPdfReportModalOpen && (
        <PdfPrintReportModal
          selectedCars={selectedCarsList}
          onClose={() => setIsPdfReportModalOpen(false)}
        />
      )}

      {isBrandLogosModalOpen && (
        <BrandLogosModal
          existingBrands={brands}
          onClose={() => setIsBrandLogosModalOpen(false)}
          onLogosUpdated={handleLogosUpdated}
        />
      )}

      {isExpirationsModalOpen && (
        <ExpirationsModal
          alerts={expirationsAlerts}
          onClose={() => setIsExpirationsModalOpen(false)}
          onEditCar={(carToEditObj) => {
            setCarToEdit(carToEditObj);
            setIsAddModalOpen(true);
          }}
        />
      )}

      {isAdminModalOpen && (
        <AdminModal
          onClose={() => setIsAdminModalOpen(false)}
          onOpenAddModal={() => { setCarToEdit(null); setIsAddModalOpen(true); }}
          onOpenBrandLogosModal={() => setIsBrandLogosModalOpen(true)}
          onOpenBackupModal={() => setIsBackupModalOpen(true)}
          onResetData={handleResetData}
          showSideGlow={showSideGlow}
          setShowSideGlow={(val) => {
            setShowSideGlow(val);
            localStorage.setItem('book_auto_pb_side_glow', JSON.stringify(val));
          }}
          showExpirationBar={showExpirationBar}
          setShowExpirationBar={(val) => {
            setShowExpirationBar(val);
            localStorage.setItem('book_auto_pb_expiration_bar', JSON.stringify(val));
          }}
        />
      )}

      {autoEmailPopupAlerts && (
        <AutoEmailNotificationPopup
          alerts={autoEmailPopupAlerts}
          onClose={() => setAutoEmailPopupAlerts(null)}
          onOpenAdminModal={() => setIsAdminModalOpen(true)}
        />
      )}

    </div>
  );
}
