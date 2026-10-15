// Unified Persistent Storage (IndexedDB + Safe LocalStorage) & Document Optimizer for Book Auto PB
const DB_NAME = 'BookAutoPB_Storage';
const DB_VERSION = 1;
const STORE_NAME = 'cars_store';
const CARS_RECORD_KEY = 'all_cars';
const LOCAL_STORAGE_KEY = 'cars_data';

// Helper to open IndexedDB
function openDB() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      console.warn('IndexedDB open error:', request.error);
      resolve(null);
    };
  });
}

// Save cars array to IndexedDB (stores full data without quota restrictions)
export async function saveCarsToIndexedDB(cars) {
  try {
    const db = await openDB();
    if (!db) return false;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(cars, CARS_RECORD_KEY);
      req.onsuccess = () => resolve(true);
      req.onerror = () => {
        console.warn('IndexedDB put error:', req.error);
        resolve(false);
      };
    });
  } catch (err) {
    console.warn('IndexedDB write exception:', err);
    return false;
  }
}

// Get cars array from IndexedDB
export async function getCarsFromIndexedDB() {
  try {
    const db = await openDB();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(CARS_RECORD_KEY);
      req.onsuccess = () => {
        const val = req.result;
        resolve(Array.isArray(val) && val.length > 0 ? val : null);
      };
      req.onerror = () => {
        console.warn('IndexedDB get error:', req.error);
        resolve(null);
      };
    });
  } catch (err) {
    console.warn('IndexedDB read exception:', err);
    return null;
  }
}

// Strip heavy base64 fileData from documents for safe localStorage mirroring
function createLightweightCarsCopy(cars) {
  if (!Array.isArray(cars)) return cars;
  return cars.map(car => {
    if (!car || !Array.isArray(car.documents) || car.documents.length === 0) return car;
    return {
      ...car,
      documents: car.documents.map(doc => {
        if (!doc) return doc;
        // Keep metadata but omit huge fileData in localStorage (IndexedDB and Supabase hold the full file)
        const { fileData, ...docMeta } = doc;
        return {
          ...docMeta,
          hasStoredData: Boolean(fileData),
          fileDataLength: fileData ? fileData.length : 0
        };
      })
    };
  });
}

// Safe multi-tier save: writes full data to IndexedDB and mirrors safely to LocalStorage
export async function saveCarsToLocal(cars) {
  if (!Array.isArray(cars)) return;

  // 1. Always write full fidelity data to IndexedDB
  await saveCarsToIndexedDB(cars);

  // 2. Try writing full data to LocalStorage
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cars));
  } catch (err) {
    // If QuotaExceededError, write lightweight version (strip fileData) to prevent crashing
    console.warn('LocalStorage quota exceeded. Falling back to lightweight mirror. Full documents are in IndexedDB & Supabase.');
    try {
      const lightCars = createLightweightCarsCopy(cars);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(lightCars));
    } catch (lightErr) {
      console.warn('Could not save even light copy to localStorage:', lightErr);
    }
  }
}

// Safe multi-tier retrieve: checks IndexedDB first, falls back to LocalStorage
export async function getCarsFromLocal() {
  // 1. Try IndexedDB first (contains complete full documents)
  const idbCars = await getCarsFromIndexedDB();
  if (Array.isArray(idbCars) && idbCars.length > 0) {
    return idbCars;
  }

  // 2. Fall back to LocalStorage
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading from localStorage:', e);
  }

  return null;
}

// Smart document scan optimization:
// Automatically resizes huge phone camera photos (e.g. 12-48MP, 8MB) to crisp readable A4 (max 1800px, quality 0.82)
// This preserves 100% legibility for stamps, text, and numbers while cutting file size by 90-95% (~200KB)
export async function processScannedDocumentFile(file, carInfo = {}, category = 'libretto') {
  if (!file) return null;

  const originalName = file.name || 'documento';
  const isPdf = file.type === 'application/pdf' || originalName.toLowerCase().endsWith('.pdf');
  const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|bmp)$/i.test(originalName);

  let fileData = '';
  let fileType = isPdf ? 'application/pdf' : (file.type || 'image/jpeg');

  if (isImage) {
    // Compress and downscale large image scan via canvas
    fileData = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDimension = 1800; // Optimal for crisp A4 documents
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.82);
          resolve(compressed);
        };
        img.onerror = () => resolve(e.target.result);
        img.src = e.target.result;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  } else {
    // Read PDF or other document as base64 data URL
    fileData = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }

  if (!fileData) return null;

  // Format title & filename using the car's identity
  const { title, fileName } = generateCarDocumentName(carInfo, category, originalName, isPdf);

  return {
    id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    category,
    title,
    fileName,
    fileType,
    fileData,
    fileSizeKb: Math.round(fileData.length * 0.75 / 1024),
    uploadedAt: new Date().toISOString().slice(0, 10)
  };
}

// Generate standardized Document Title and File Name incorporating Car Brand, Model, and Targa
export function generateCarDocumentName(carInfo = {}, category = 'libretto', originalFileName = '', isPdf = false) {
  const brand = (carInfo.brand || '').trim();
  const model = (carInfo.model || '').trim();
  const carName = [brand, model].filter(Boolean).join(' ') || 'Vettura';
  const targa = (carInfo.targa || carInfo.immatricolazione || '').trim().toUpperCase();
  const carPrefix = targa ? `${carName} [${targa}]` : carName;

  let categoryLabel = 'Documento';
  if (category === 'libretto') categoryLabel = 'Libretto di Circolazione';
  else if (category === 'assicurazione') categoryLabel = 'Polizza Assicurativa';
  else if (category === 'bollo') categoryLabel = 'Ricevuta Bollo Pagato';
  else if (category === 'revisione') categoryLabel = 'Certificato Revisione';
  else if (category === 'tagliando') categoryLabel = 'Fattura Tagliando';
  else if (originalFileName) {
    categoryLabel = originalFileName.replace(/\.[^/.]+$/, '').trim() || 'Allegato';
  }

  const ext = isPdf ? 'pdf' : (originalFileName.split('.').pop() || 'jpg');
  const sanitizedPrefix = carPrefix.replace(/[/\\?%*:|"<>]/g, '_');
  const sanitizedLabel = categoryLabel.replace(/[/\\?%*:|"<>]/g, '_');

  const title = `${categoryLabel} — ${carPrefix}`;
  const fileName = `${sanitizedPrefix} - ${sanitizedLabel}.${ext}`;

  return { title, fileName, categoryLabel };
}
