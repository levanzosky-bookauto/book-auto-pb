import { processScannedDocumentFile, generateCarDocumentName, saveCarsToLocal } from './storage';
import { upsertSingleCarToSupabase } from './supabase';

// Recognized automotive brands for intelligent brand/model parsing
const KNOWN_BRANDS = [
  'Alfa Romeo', 'Aston Martin', 'Audi', 'Bentley', 'Bizzarrini', 'BMW', 'Bugatti', 
  'Citroën', 'Citroen', 'Ferrari', 'FIAT', 'Fiat', 'Ford', 'Lamborghini', 'Lancia', 
  'Land Rover', 'Maserati', 'Mercedes-AMG', 'Mercedes-Benz', 'Mercedes', 'Polaris', 
  'Pontiac', 'Porsche', 'Renault', 'Rolls-Royce', 'Rolls Royce', 'Rover', 'SAAB', 
  'Saab', 'Toyota', 'Volkswagen', 'VW'
];

/**
 * Clean and normalize a string for comparison
 */
function cleanStr(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .replace(/[_\-–—./\\]+/g, ' ')
    .replace(/[^a-z0-9 ]/gi, '')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Intelligent matching of a folder name to an existing car in the fleet
 */
export function matchCarByFolderName(folderName, cars = []) {
  if (!folderName || !Array.isArray(cars) || cars.length === 0) return null;

  const cleanFolder = cleanStr(folderName);
  if (!cleanFolder) return null;

  // 1. Exact match on combined Brand + Model
  for (const car of cars) {
    const combined = cleanStr(`${car.brand} ${car.model}`);
    if (combined === cleanFolder) return car;
  }

  // 2. Folder contains both Brand and Model
  for (const car of cars) {
    const b = cleanStr(car.brand);
    const m = cleanStr(car.model);
    if (b && m && cleanFolder.includes(b) && cleanFolder.includes(m)) {
      return car;
    }
  }

  // 3. Folder matches Model (if distinct enough, >= 3 chars)
  for (const car of cars) {
    const m = cleanStr(car.model);
    if (m && m.length >= 3 && (cleanFolder === m || cleanFolder.endsWith(' ' + m))) {
      return car;
    }
  }

  // 4. Folder contains car plate (targa)
  for (const car of cars) {
    const targa = cleanStr(car.targa || car.immatricolazione);
    if (targa && targa.length >= 5 && cleanFolder.includes(targa)) {
      return car;
    }
  }

  // 5. Inverted containment (car name contains folder name or vice versa)
  for (const car of cars) {
    const combined = cleanStr(`${car.brand} ${car.model}`);
    if (combined.includes(cleanFolder) || cleanFolder.includes(combined)) {
      return car;
    }
  }

  return null;
}

/**
 * Create and configure a new car object from the folder name
 */
export function createCarFromFolderName(folderName, existingCars = []) {
  const trimmed = (folderName || '').trim();
  let brand = 'Altro';
  let model = trimmed;

  // Check known brands
  for (const kb of KNOWN_BRANDS) {
    const cleanKb = cleanStr(kb);
    const cleanFn = cleanStr(trimmed);
    if (cleanFn.startsWith(cleanKb)) {
      brand = kb;
      // Extract model after brand
      const remaining = trimmed.substring(kb.length).trim().replace(/^[-–—_ ]+/, '');
      model = remaining || 'Modello Speciale';
      break;
    }
  }

  const maxPage = existingCars.reduce((max, c) => Math.max(max, Number(c.page) || 0), 0);
  const newId = `car_folder_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

  return {
    id: newId,
    page: maxPage + 1,
    brand: brand,
    model: model,
    immatricolazione: '',
    chassis: '',
    cilindrata: '',
    horsepower: '',
    esemplari: '',
    images: [],
    pageImage: '',
    mainPhoto: '',
    logoImg: '',
    carPhotos: [],
    isFavorite: false,
    notes: `Vettura configurata automaticamente dalla cartella scansioni "${trimmed}"`,
    documents: []
  };
}

/**
 * Detect document category from file name
 */
export function detectCategoryFromFileName(fileName = '') {
  const f = cleanStr(fileName);

  if (f.includes('librett') || f.includes('circolaz') || f.includes('carta')) {
    return 'libretto';
  }
  if (f.includes('assicuraz') || f.includes('polizz') || f.includes('rca') || f.includes('contratto')) {
    return 'assicurazione';
  }
  if (f.includes('bollo') || f.includes('tassa') || f.includes('f24') || f.includes('ricevuta')) {
    return 'bollo';
  }
  if (f.includes('revis') || f.includes('collaudo') || f.includes('mctc')) {
    return 'revisione';
  }
  if (f.includes('tagliand') || f.includes('service') || f.includes('fattura') || f.includes('manutenz')) {
    return 'tagliando';
  }

  return 'altro';
}

/**
 * Process and import a list of files coming from a folder upload (webkitdirectory)
 * Matches the folder name with the car name, processes the document,
 * replaces old document versions to save memory, and syncs everywhere.
 */
export async function importFolderFiles(fileList, currentCars = [], onProgress = null) {
  const files = Array.from(fileList || []);
  if (files.length === 0) {
    return { updatedCars: currentCars, stats: { totalProcessed: 0, carsUpdated: 0, newCarsCreated: 0, skipped: 0 } };
  }

  // Filter valid documents
  const validFiles = files.filter(f => {
    const name = f.name || '';
    if (name.startsWith('.') || name === 'Thumbs.db' || name === 'desktop.ini') return false;
    const isImage = f.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|heic|bmp|tiff)$/i.test(name);
    const isPdf = f.type === 'application/pdf' || /\.pdf$/i.test(name);
    return isImage || isPdf;
  });

  if (validFiles.length === 0) {
    return { updatedCars: currentCars, stats: { totalProcessed: 0, carsUpdated: 0, newCarsCreated: 0, skipped: files.length } };
  }

  let carsMap = new Map((currentCars || []).map(c => [String(c.id), { ...c, documents: [...(Array.isArray(c.documents) ? c.documents : [])] }]));
  let carsUpdatedSet = new Set();
  let newCarsCreatedCount = 0;
  let totalProcessed = 0;

  for (let i = 0; i < validFiles.length; i++) {
    const file = validFiles[i];
    const relPath = file.webkitRelativePath || file.name;
    const parts = relPath.split('/').filter(Boolean);

    // Folder name is the immediate parent directory of the file (or first directory if structure is ROOT/CAR/FILE)
    let carFolderName = '';
    if (parts.length >= 3) {
      // e.g. DOCUMENTI SCANSIONATI / Ferrari F 40 / Libretto.pdf -> parts[1] is 'Ferrari F 40'
      carFolderName = parts[1];
    } else if (parts.length === 2) {
      // e.g. Ferrari F 40 / Libretto.pdf -> parts[0] is 'Ferrari F 40'
      carFolderName = parts[0];
    } else {
      // Flat file without folder: try to deduce from file name
      carFolderName = file.name.replace(/\.[^/.]+$/, '');
    }

    // Match or create the car
    let targetCar = matchCarByFolderName(carFolderName, Array.from(carsMap.values()));
    if (!targetCar) {
      // Automatically configure new car from folder name
      targetCar = createCarFromFolderName(carFolderName, Array.from(carsMap.values()));
      carsMap.set(String(targetCar.id), targetCar);
      newCarsCreatedCount++;
    }

    if (onProgress) {
      onProgress({
        current: i + 1,
        total: validFiles.length,
        fileName: file.name,
        carName: `${targetCar.brand} ${targetCar.model}`
      });
    }

    // Determine category
    const category = detectCategoryFromFileName(file.name);

    // Process document scan (compression & A4 crisp resizing)
    const processed = await processScannedDocumentFile(file, targetCar, category);
    if (processed) {
      const newDoc = {
        id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        category: category,
        title: processed.title,
        fileName: processed.fileName,
        fileType: processed.fileType,
        fileData: processed.fileData,
        dataUrl: processed.fileData,
        date: new Date().toISOString().slice(0, 10),
        notes: `Importato da cartella "${carFolderName}" il ${new Date().toLocaleDateString('it-IT')}`
      };

      // Auto-replace previous version of the same category for this car
      const currentDocs = targetCar.documents || [];
      const filteredDocs = currentDocs.filter(d => d.category !== category);
      targetCar.documents = [newDoc, ...filteredDocs];

      carsMap.set(String(targetCar.id), targetCar);
      carsUpdatedSet.add(String(targetCar.id));
      totalProcessed++;
    }
  }

  const finalUpdatedCars = Array.from(carsMap.values());

  // Save to IndexedDB & LocalStorage
  await saveCarsToLocal(finalUpdatedCars);

  // Sync updated cars to Supabase Cloud
  for (const carId of carsUpdatedSet) {
    const updatedCar = carsMap.get(carId);
    if (updatedCar) {
      try {
        await upsertSingleCarToSupabase(updatedCar);
      } catch (e) {
        console.warn('Cloud sync error for car', updatedCar.id, e);
      }
    }
  }

  return {
    updatedCars: finalUpdatedCars,
    stats: {
      totalProcessed,
      carsUpdated: carsUpdatedSet.size,
      newCarsCreated: newCarsCreatedCount,
      skipped: files.length - validFiles.length
    }
  };
}
