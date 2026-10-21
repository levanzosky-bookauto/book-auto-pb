import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import CartellaDocumentiModal from './components/CartellaDocumentiModal';
import { SlidersHorizontal, ArrowUpDown, Plus, RotateCcw, Car as CarIcon, Sparkles, CheckSquare, Printer, Square, Trash2, Bell } from 'lucide-react';
import { getLogoForBrand, getCustomBrandLogos, DEFAULT_BRAND_LOGOS, isValidBrandLogo } from './utils/brandLogos';
import { getVehicleExpirations } from './utils/notifications';
import { getCurrentUser, setCurrentUser as setCurrentUserInStorage, logoutUser, syncUsersWithCloud, syncBackgroundsWithCloud } from './utils/auth';
import { syncLocationsWithCloud } from './utils/locations';
import { checkAndTriggerAutomaticEmailAlerts, syncEmailConfigWithCloud } from './utils/emailAlerts';
import { fetchCarsFromSupabase, syncCarsToSupabase, upsertSingleCarToSupabase, fetchPermissionsFromSupabase, syncPermissionsToSupabase } from './utils/supabase';
import { saveCarsToLocal, getCarsFromLocal } from './utils/storage';
import { getClientPermissions, saveClientPermissions, isStaffUser, canViewExpirations } from './utils/permissions';
import { markCarAsPermanentlyDeleted, markCarsAsPermanentlyDeleted, filterOutDeletedCars, syncDeletedCarsWithCloud } from './utils/deletedCars';

const LOCAL_STORAGE_KEY = 'book_auto_pb_cars_v1';

export default function App() {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Auth & User State
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const [clientPermissions, setClientPermissions] = useState(() => getClientPermissions());

  const handleLoginSuccess = (user, rememberMe = false) => {
    hasShownEmailAlertRef.current = false;
    try {
      sessionStorage.removeItem('book_auto_pb_email_popup_dismissed');
    } catch (e) {}
    setCurrentUserInStorage(user, rememberMe);
    setCurrentUser(user);
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem('book_auto_pb_email_popup_dismissed');
    } catch (e) {}
    hasShownEmailAlertRef.current = false;
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
  const [isCartellaDocumentiOpen, setIsCartellaDocumentiOpen] = useState(false);
  const [autoEmailPopupAlerts, setAutoEmailPopupAlerts] = useState(null);
  const hasShownEmailAlertRef = useRef(false);

  // Automatic Email Expiration Check on Load / Login (Staff Only: Super Admin & Editor)
  useEffect(() => {
    if (!loading && cars && cars.length > 0 && isStaffUser(currentUser)) {
      // 1. ALWAYS execute background email milestone check
      const result = checkAndTriggerAutomaticEmailAlerts(cars);

      // 2. Only show the on-screen visual popup if not previously dismissed in this browser session
      const isDismissed = sessionStorage.getItem('book_auto_pb_email_popup_dismissed') === 'true';
      if (!isDismissed && !hasShownEmailAlertRef.current) {
        if (result && (result.autoTriggered || (result.alerts && result.alerts.length > 0))) {
          hasShownEmailAlertRef.current = true;
          setAutoEmailPopupAlerts(result.alerts);
        }
      }
    }
  }, [cars, loading, currentUser]);

  // Periodic background check every 30 minutes while app is running
  useEffect(() => {
    if (loading || !cars || cars.length === 0 || !isStaffUser(currentUser)) return;
    const interval = setInterval(() => {
      checkAndTriggerAutomaticEmailAlerts(cars);
    }, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [cars, loading, currentUser]);

  const handleCloseEmailPopup = () => {
    try {
      sessionStorage.setItem('book_auto_pb_email_popup_dismissed', 'true');
    } catch (e) {}
    hasShownEmailAlertRef.current = true;
    setAutoEmailPopupAlerts(null);
  };

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

  // Load Initial Data with Real-Time Cloud Sync (Supabase + LocalStorage + baseline cars.json)
  useEffect(() => {
    async function loadInitialCars() {
      // 0. Sync deleted cars, email config, users, locations and backgrounds with Supabase Cloud
      await Promise.allSettled([
        syncDeletedCarsWithCloud(),
        syncEmailConfigWithCloud(),
        syncUsersWithCloud(),
        syncLocationsWithCloud(),
        syncBackgroundsWithCloud()
      ]);

      // 1. Check if this device has local edits / expirations (IndexedDB + safe localStorage)
      const savedLocalCars = await getCarsFromLocal();
      let localCars = null;
      if (Array.isArray(savedLocalCars) && savedLocalCars.length > 0) {
        localCars = formatCarImages(filterOutDeletedCars(savedLocalCars));
      }

      // Fetch baseline cars.json (always guaranteed to have catalog & baseline expirations)
      let baselineCars = [];
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}data/cars.json?t=${Date.now()}`);
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json)) baselineCars = formatCarImages(filterOutDeletedCars(json));
        }
      } catch (err) {
        console.warn('Error loading baseline cars.json:', err);
      }

      // Helper to merge baseline expirations, images and documents if missing or broken in a car list
      const mergeWithBaseline = (carList) => {
        if (!Array.isArray(carList) || baselineCars.length === 0) return filterOutDeletedCars(carList);
        const filtered = filterOutDeletedCars(carList);
        const merged = filtered.map(c => {
          const base = baselineCars.find(b => String(b.id) === String(c.id));
          if (!base) return c;
          const currentDocs = Array.isArray(c.documents) ? c.documents : [];
          const baseDocs = Array.isArray(base.documents) ? base.documents : [];
          const mergedDocs = currentDocs.length > 0 ? currentDocs : baseDocs;

          // Always ensure valid images: fallback to base if local images are empty or missing
          const hasLocalImages = Array.isArray(c.images) && c.images.length > 0 && c.images.some(img => typeof img === 'string' && img.trim().length > 0);
          const validImages = hasLocalImages ? c.images : (base.images || []);
          const validMain = c.mainPhoto || base.mainPhoto || (validImages[0] || '');
          const validLogo = (isValidBrandLogo(c.logoImg) ? c.logoImg : null) ||
                            (isValidBrandLogo(base.logoImg) ? base.logoImg : null) ||
                            getLogoForBrand(c.brand) || '';

          return {
            ...c,
            images: validImages,
            carPhotos: (Array.isArray(c.carPhotos) && c.carPhotos.length > 0) ? c.carPhotos : validImages,
            mainPhoto: validMain,
            pageImage: c.pageImage || base.pageImage || validMain,
            logoImg: validLogo,
            scadenzaBollo: c.scadenzaBollo || base.scadenzaBollo || '',
            scadenzaAssicurazione: c.scadenzaAssicurazione || base.scadenzaAssicurazione || '',
            scadenzaRevisione: c.scadenzaRevisione || base.scadenzaRevisione || '',
            prossimoTagliandoData: c.prossimoTagliandoData || base.prossimoTagliandoData || '',
            documents: mergedDocs
          };
        });

        // Also include any new cars from baselineCars (e.g. FIAT 500s) that might be missing in local storage
        const existingIds = new Set(filtered.map(c => String(c.id)));
        const missingFromLocal = baselineCars.filter(b => !existingIds.has(String(b.id)));
        return [...missingFromLocal, ...merged];
      };

      // Check if running in local development / test mode
      const isLocalhost = typeof window !== 'undefined' && (
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname === '0.0.0.0'
      );

      // In local mode, public/data/cars.json & local storage are the absolute authority.
      // We NEVER allow remote Supabase to overwrite local test edits or reset data!
      if (isLocalhost) {
        let mergedLocal = baselineCars;
        if (localCars && localCars.length > 0) {
          mergedLocal = mergeWithBaseline(localCars);
        }
        if (mergedLocal && mergedLocal.length > 0) {
          setCars(mergedLocal);
          saveCarsToLocal(mergedLocal);
          // Persist directly to public/data/cars.json on disk
          fetch('/api/sync-cars-json', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cars: mergedLocal })
          }).catch(() => {});
          setLoading(false);
          return;
        }
      }

      // Fetch latest client permissions from Supabase Cloud
      fetchPermissionsFromSupabase().then(remotePerms => {
        if (remotePerms) {
          saveClientPermissions(remotePerms);
          setClientPermissions(remotePerms);
        }
      }).catch(err => console.warn('Permissions initial fetch:', err));

      // 2. Fetch latest shared cars from Supabase Cloud (Central truth)
      const supabaseCars = await fetchCarsFromSupabase();
      if (supabaseCars && supabaseCars.length > 0) {
        const activeSupabase = filterOutDeletedCars(supabaseCars);
        let formattedSupabase = formatCarImages(activeSupabase);
        formattedSupabase = mergeWithBaseline(formattedSupabase);

        // Merge any local documents that haven't synced to Supabase yet
        if (localCars && localCars.length > 0) {
          formattedSupabase = formattedSupabase.map(sc => {
            const lc = localCars.find(l => String(l.id) === String(sc.id));
            if (!lc) return sc;
            const scDocs = Array.isArray(sc.documents) ? sc.documents : [];
            const lcDocs = Array.isArray(lc.documents) ? lc.documents : [];
            if (lcDocs.length > 0 && scDocs.length === 0) {
              return { ...sc, documents: lcDocs };
            } else if (lcDocs.length > 0 && scDocs.length > 0) {
              const map = new Map();
              scDocs.forEach(d => { if (d && d.id) map.set(d.id, d); });
              lcDocs.forEach(d => {
                if (d && d.id) {
                  const existing = map.get(d.id);
                  if (existing) {
                    const localHasData = Boolean(d.fileData || d.dataUrl || d.url);
                    map.set(d.id, {
                      ...existing,
                      ...d,
                      fileData: localHasData ? (d.fileData || d.dataUrl) : (existing.fileData || existing.dataUrl),
                      dataUrl: localHasData ? (d.dataUrl || d.fileData) : (existing.dataUrl || existing.fileData),
                      url: localHasData ? (d.url || d.fileData) : (existing.url || existing.fileData)
                    });
                  } else {
                    map.set(d.id, d);
                  }
                }
              });
              return { ...sc, documents: Array.from(map.values()) };
            }
            return sc;
          });
        }

        // Check if this device has expiration dates that haven't reached Supabase yet (e.g. Admin device)
        if (localCars && localCars.length > 0) {
          const localHasExpirations = localCars.some(c => c.scadenzaBollo || c.scadenzaAssicurazione || c.scadenzaRevisione || c.prossimoTagliandoData);
          const supabaseHasExpirations = formattedSupabase.some(c => c.scadenzaBollo || c.scadenzaAssicurazione || c.scadenzaRevisione || c.prossimoTagliandoData);

          if (localHasExpirations && !supabaseHasExpirations) {
            console.log('🚀 Pushing local expirations to Supabase Cloud so all users see them...');
            setCars(localCars);
            saveCarsToLocal(localCars);
            syncCarsToSupabase(localCars);
            setLoading(false);
            return;
          }
        }

        // Supabase has the shared truth! Update state and local storage
        setCars(formattedSupabase);
        saveCarsToLocal(formattedSupabase);
        setLoading(false);
        return;
      }

      // If Supabase is empty or offline, use localCars with baseline merge
      if (localCars && localCars.length > 0) {
        const mergedLocal = mergeWithBaseline(localCars);
        setCars(mergedLocal);
        saveCarsToLocal(mergedLocal);
        setLoading(false);
        return;
      }

      // 3. Fallback to default baselineCars
      if (baselineCars && baselineCars.length > 0) {
        setCars(baselineCars);
        saveCarsToLocal(baselineCars);
        syncCarsToSupabase(baselineCars);
        setLoading(false);
        return;
      }

      setLoading(false);
    }

    loadInitialCars();
  }, []);

  // Periodic background check against Supabase (every 30s) so changes made on Mac appear on phone automatically
  useEffect(() => {
    // In local development / testing, DO NOT poll remote Supabase to prevent overwriting local test work!
    if (typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '0.0.0.0'
    )) {
      return;
    }

    const interval = setInterval(async () => {
      const freshSupabase = await fetchCarsFromSupabase();
      if (freshSupabase && freshSupabase.length > 0) {
        const activeSupabase = filterOutDeletedCars(freshSupabase);
        const formatted = formatCarImages(activeSupabase);
        setCars(prev => {
          // Merge prev documents into freshSupabase so remote poll never clears newly attached docs
          const mergedWithDocs = formatted.map(sc => {
            const prevCar = (prev || []).find(p => String(p.id) === String(sc.id));
            if (!prevCar) return sc;
            const prevDocs = Array.isArray(prevCar.documents) ? prevCar.documents : [];
            const scDocs = Array.isArray(sc.documents) ? sc.documents : [];
            if (prevDocs.length > 0 && scDocs.length === 0) {
              return { ...sc, documents: prevDocs };
            } else if (prevDocs.length > 0 && scDocs.length > 0) {
              const map = new Map();
              scDocs.forEach(d => { if (d && d.id) map.set(d.id, d); });
              prevDocs.forEach(d => { if (d && d.id) map.set(d.id, d); });
              return { ...sc, documents: Array.from(map.values()) };
            }
            return sc;
          });

          // Compare JSON string to prevent unnecessary re-renders
          if (JSON.stringify(prev) !== JSON.stringify(mergedWithDocs)) {
            saveCarsToLocal(mergedWithDocs);
            return mergedWithDocs;
          }
          return prev;
        });
      }

      // Also check if permissions have been changed remotely by Admin
      fetchPermissionsFromSupabase().then(freshPerms => {
        if (freshPerms) {
          setClientPermissions(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(freshPerms)) {
              saveClientPermissions(freshPerms);
              return freshPerms;
            }
            return prev;
          });
        }
      }).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Manual Cloud Data Refresh Handler
  const handleRefreshCloudData = async () => {
    setIsSyncing(true);
    try {
      await syncDeletedCarsWithCloud();
      const freshSupabase = await fetchCarsFromSupabase();
      if (freshSupabase && freshSupabase.length > 0) {
        const activeSupabase = filterOutDeletedCars(freshSupabase);
        const formatted = formatCarImages(activeSupabase);
        setCars(formatted);
        saveCarsToLocal(formatted);
      } else {
        const res = await fetch(`${import.meta.env.BASE_URL}data/cars.json?t=${Date.now()}`);
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json)) {
            const activeCars = filterOutDeletedCars(json);
            const formatted = formatCarImages(activeCars);
            setCars(formatted);
            saveCarsToLocal(formatted);
          }
        }
      }

      // Refresh permissions
      const freshPerms = await fetchPermissionsFromSupabase();
      if (freshPerms) {
        saveClientPermissions(freshPerms);
        setClientPermissions(freshPerms);
      }
    } catch (err) {
      console.error('Manual refresh error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Save to state, local storage (IndexedDB + safe localStorage), and sync to Supabase Cloud
  const saveCarsState = (newCars) => {
    setCars(newCars);
    saveCarsToLocal(newCars);
    syncCarsToSupabase(newCars);

    // In local development / test mode, immediately flush changes to public/data/cars.json on disk!
    if (typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '0.0.0.0'
    )) {
      fetch('/api/sync-cars-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cars: newCars })
      }).catch(e => console.warn('Sync cars.json in local mode:', e));
    }
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
  const handleSaveCar = async (carData) => {
    // Ensure newly created cars sort to the top
    if (!carToEdit) {
      carData.page = 0; // page 0 sorts before page 2
    }
    
    let finalCar = { ...carData };

    // If on localhost, save car & photos into DOCUMENTI SCANSIONATI/<carFolder>/immagini/ and update cars.json on disk
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      try {
        const res = await fetch('/api/save-car', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ car: carData })
        });
        if (res.ok) {
          const result = await res.json();
          if (result && result.car) {
            finalCar = result.car;
          }
        }
      } catch (err) {
        console.warn('Could not save car to local disk:', err);
      }
    }
    
    const existingIndex = cars.findIndex(c => String(c.id) === String(finalCar.id));
    let updated = [];
    if (existingIndex >= 0) {
      updated = [...cars];
      updated[existingIndex] = finalCar;
    } else {
      updated = [finalCar, ...cars];
    }
    
    saveCarsState(updated);
    upsertSingleCarToSupabase(finalCar);
    
    // Clear filters so user immediately sees the newly added car
    setSelectedBrand('Tutti');
    setSearchQuery('');
    setOnlyFavorites(false);
    
    setIsAddModalOpen(false);
    setCarToEdit(null);
  };

  // Delete Single Car Permanently across Local & Supabase Cloud
  const handleDeleteCar = async (carId) => {
    const targetCar = cars.find(c => String(c.id) === String(carId));
    const carFolder = targetCar ? `${targetCar.brand} ${targetCar.model}`.trim() : null;

    // 1. Mark permanently deleted (local storage tombstone + delete from Supabase row + sync tombstone)
    await markCarAsPermanentlyDeleted(carId);

    // If in localhost, delete from public/data/cars.json on disk too AND delete entire folder (docs + immagini)!
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      fetch('/api/delete-car', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carId, carFolder })
      }).catch(err => console.warn('Could not delete car and folder from disk:', err));
    }

    // 2. Filter state & local storage
    const updated = cars.filter(c => String(c.id) !== String(carId));
    setCars(updated);
    saveCarsToLocal(updated);
    setSelectedCarIds(prev => prev.filter(id => String(id) !== String(carId)));
    if (selectedCar && String(selectedCar.id) === String(carId)) {
      setSelectedCar(null);
    }
  };

  // Update Car Photos order & deletion
  const handleUpdateCarImages = (carId, newImages, deletedImage = null) => {
    const targetCar = cars.find(c => String(c.id) === String(carId));
    const carFolder = targetCar ? `${targetCar.brand} ${targetCar.model}`.trim() : '';

    const updated = cars.map(c => {
      if (String(c.id) === String(carId)) {
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
    if (selectedCar && String(selectedCar.id) === String(carId)) {
      setSelectedCar(prev => ({
        ...prev,
        images: newImages,
        carPhotos: newImages,
        mainPhoto: newImages.length > 0 ? newImages[0] : prev.mainPhoto,
        pageImage: newImages.length > 0 ? newImages[0] : prev.pageImage
      }));
    }

    // If an image was deleted and we're on localhost, delete it from disk and cars.json
    if (deletedImage && typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      fetch('/api/delete-car-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carId,
          carFolder,
          imagePath: deletedImage
        })
      }).catch(err => console.warn('Could not delete car image on disk:', err));
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
      logoImg: getLogoForBrand(car.brand) || (isValidBrandLogo(car.logoImg) ? car.logoImg : '')
    }));
    saveCarsState(updated);
    if (selectedCar) {
      setSelectedCar(prev => prev ? ({
        ...prev,
        logoImg: getLogoForBrand(prev.brand) || (isValidBrandLogo(prev.logoImg) ? prev.logoImg : '')
      }) : null);
    }
  };

  // Bulk Delete Selected Cars Permanently across Local & Supabase Cloud
  const handleDeleteSelectedCars = async () => {
    if (selectedCarIds.length === 0) return;
    if (window.confirm(`Sei sicuro di voler eliminare DEFINITIVAMENTE le ${selectedCarIds.length} schede selezionate?`)) {
      const idsToDelete = [...selectedCarIds];
      setSelectedCarIds([]);

      // 1. Mark permanently deleted across local storage & Supabase Cloud
      await markCarsAsPermanentlyDeleted(idsToDelete);

      // 2. Filter state & local storage
      const updated = cars.filter(c => !idsToDelete.map(String).includes(String(c.id)));
      setCars(updated);
      saveCarsToLocal(updated);
      if (selectedCar && idsToDelete.map(String).includes(String(selectedCar.id))) {
        setSelectedCar(null);
      }

      // 3. Delete physical folders from disk if on localhost
      if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        idsToDelete.forEach(id => {
          const targetCar = cars.find(c => String(c.id) === String(id));
          const carFolder = targetCar ? `${targetCar.brand} ${targetCar.model}`.trim() : null;
          fetch('/api/delete-car', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ carId: id, carFolder })
          }).catch(err => console.warn('Could not delete car and folder from disk:', err));
        });
      }
    }
  };

  // Reset to original PDF dataset (preserving permanently deleted vehicles)
  const handleResetData = () => {
    fetch(`${import.meta.env.BASE_URL}data/cars.json?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        const active = filterOutDeletedCars(data);
        setCars(active);
        saveCarsToLocal(active);
        setSelectedBrand('Tutti');
        setSearchQuery('');
        setOnlyFavorites(false);
        setSelectedCarIds([]);
      });
  };

  // Extract list of all unique brands present in cars, case-insensitively deduplicated & sorted
  const brands = useMemo(() => {
    const brandMap = new Map();
    cars.forEach(c => {
      if (!c.brand || !c.brand.trim()) return;
      const key = c.brand.trim().toLowerCase();
      if (!brandMap.has(key)) {
        brandMap.set(key, c.brand.trim());
      }
    });
    return Array.from(brandMap.values()).sort((a, b) => a.localeCompare(b));
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
      if (selectedBrand !== 'Tutti' && (car.brand || '').trim().toLowerCase() !== selectedBrand.trim().toLowerCase()) {
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

  // Total Saved Documents Count
  const totalDocumentsCount = useMemo(() => 
    cars.reduce((acc, c) => acc + (Array.isArray(c.documents) ? c.documents.length : 0), 0),
    [cars]
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
    return (
      <AdminLoginPage 
        onLoginSuccess={handleLoginSuccess} 
        clientPermissions={clientPermissions} 
      />
    );
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
        clientPermissions={clientPermissions}
        onLogout={handleLogout}
        onRefreshCloudData={handleRefreshCloudData}
        isSyncing={isSyncing}
        onOpenCartellaDocumenti={() => setIsCartellaDocumentiOpen(true)}
        totalDocumentsCount={totalDocumentsCount}
      />

      {/* Top Expiration Notification Banner (Shown ONLY if allowed for clients, or always for staff) */}
      {canViewExpirations(currentUser, clientPermissions) && showExpirationBar && expirationsAlerts.length > 0 && (
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
                currentUser={currentUser}
                clientPermissions={clientPermissions}
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
            currentUser={currentUser}
            clientPermissions={clientPermissions}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-800/80 py-8 text-center text-xs text-slate-500">
        <p>© 2026 Book Auto PB</p>
      </footer>

      {/* Modals */}
      {selectedCar && (
        <CarDetailModal
          car={cars.find(c => String(c.id) === String(selectedCar.id)) || selectedCar}
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
          onOpenCartellaDocumenti={() => {
            setSelectedCar(null);
            setIsCartellaDocumentiOpen(true);
          }}
          onSaveCar={handleSaveCar}
          onUpdateCars={saveCarsState}
          currentUser={currentUser}
          clientPermissions={clientPermissions}
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
          currentUser={currentUser}
          clientPermissions={clientPermissions}
        />
      )}

      {isBrandLogosModalOpen && (
        <BrandLogosModal
          existingBrands={brands}
          onClose={() => setIsBrandLogosModalOpen(false)}
          onLogosUpdated={handleLogosUpdated}
        />
      )}

      {isExpirationsModalOpen && isStaffUser(currentUser) && (
        <ExpirationsModal
          alerts={expirationsAlerts}
          onClose={() => setIsExpirationsModalOpen(false)}
          onEditCar={(carToEditObj) => {
            setCarToEdit(carToEditObj);
            setIsAddModalOpen(true);
          }}
        />
      )}

      {isAdminModalOpen && isStaffUser(currentUser) && (
        <AdminModal
          cars={cars}
          onClose={() => setIsAdminModalOpen(false)}
          onOpenAddModal={() => { setCarToEdit(null); setIsAddModalOpen(true); }}
          onOpenBrandLogosModal={() => setIsBrandLogosModalOpen(true)}
          onOpenBackupModal={() => setIsBackupModalOpen(true)}
          onResetData={handleResetData}
          onUpdateCars={saveCarsState}
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
          clientPermissions={clientPermissions}
          onPermissionsUpdated={(updated) => {
            setClientPermissions(updated);
            saveClientPermissions(updated);
            syncPermissionsToSupabase(updated);
          }}
        />
      )}

      {/* Cartella & Archivio Documenti Vetture Modal */}
      {isCartellaDocumentiOpen && (
        <CartellaDocumentiModal
          isOpen={isCartellaDocumentiOpen}
          onClose={() => setIsCartellaDocumentiOpen(false)}
          cars={cars}
          onUpdateCars={saveCarsState}
          currentUser={currentUser}
        />
      )}

      {autoEmailPopupAlerts && isStaffUser(currentUser) && (
        <AutoEmailNotificationPopup
          alerts={autoEmailPopupAlerts}
          onClose={handleCloseEmailPopup}
          onOpenAdminModal={() => setIsAdminModalOpen(true)}
          currentUser={currentUser}
        />
      )}

    </div>
  );
}
