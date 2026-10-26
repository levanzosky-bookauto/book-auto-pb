const CUSTOM_LOGOS_STORAGE_KEY = 'book_auto_pb_custom_brand_logos_v1';

// In-memory fallback cache so added brands are NEVER lost even if localStorage quota fails
let memoryLogosCache = null;

// Check if a given path is an authentic brand logo (and NOT a car photo)
export function isValidBrandLogo(logoPath) {
  if (!logoPath || typeof logoPath !== 'string') return false;
  const lower = logoPath.toLowerCase();
  // Filter out car photos mistakenly saved as logos
  if (
    lower.includes('/images/cars/') ||
    lower.includes('images/cars') ||
    lower.includes('/immagini/foto_') ||
    lower.includes('immagini/foto_') ||
    lower.includes('foto_') ||
    lower.includes('car_')
  ) {
    return false;
  }
  return true;
}

// Normalize brand names: strip diacritics, hyphens, extra whitespace
export function normalizeBrandName(name) {
  if (!name) return '';
  return name.trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // removes umlauts / accents
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Canonical aliases to resolve hyphenated, space, or accent variations to a single official brand
export const BRAND_ALIASES = {
  "alfa-romeo": "alfa romeo",
  "alfa_romeo": "alfa romeo",
  "aston-martin": "aston martin",
  "aston_martin": "aston martin",
  "citroën": "citroën",
  "citroen": "citroën",
  "land-rover": "land rover",
  "land_rover": "land rover",
  "rolls royce": "rolls-royce",
  "rolls_royce": "rolls-royce",
  "mercedes": "mercedes-benz",
  "mercedes benz": "mercedes-benz",
  "mercedes amg": "mercedes-amg"
};

// Returns a single canonical uppercase brand name for display and deduplication
export function getCanonicalBrandName(name) {
  if (!name || typeof name !== 'string') return '';
  const lower = name.trim().toLowerCase();
  const aliased = BRAND_ALIASES[lower] || lower;
  if (aliased === 'mercedes-benz') return 'MERCEDES-BENZ';
  if (aliased === 'mercedes-amg') return 'MERCEDES-AMG';
  if (aliased === 'rolls-royce') return 'ROLLS-ROYCE';
  if (aliased === 'citroen' || aliased === 'citroën') return 'CITROËN';
  return aliased.toUpperCase();
}

export const DEFAULT_BRAND_LOGOS = {
  "alfa romeo": "./images/logos/alfa_romeo.jpeg",
  "aston martin": "./images/logos/aston_martin.jpeg",
  "audi": "./images/logos/audi.jpeg",
  "bmw": "./images/logos/bmw.jpeg",
  "bentley": "./images/logos/bentley.jpeg",
  "bizzarrini": "./images/logos/bizzarrini.png",
  "bugatti": "./images/logos/bugatti.png",
  "citroen": "./images/logos/citroen.jpeg",
  "citroën": "./images/logos/citroen.jpeg",
  "ferrari": "./images/logos/ferrari.jpeg",
  "fiat": "./images/logos/fiat.jpeg",
  "ford": "./images/logos/ford.jpeg",
  "lamborghini": "./images/logos/lamborghini.jpeg",
  "lancia": "./images/logos/lancia.jpeg",
  "land rover": "./images/logos/land_rover.jpeg",
  "mercedes-benz": "./images/logos/mercedes_benz.jpeg",
  "mercedes-amg": "./images/logos/mercedes_amg.jpeg",
  "polaris": "./images/logos/polaris.png",
  "pontiac": "./images/logos/pontiac.png",
  "porsche": "./images/logos/porsche.jpeg",
  "renault": "./images/logos/renault.jpeg",
  "rolls-royce": "./images/logos/rolls_royce.jpeg",
  "rover": "./images/logos/rover.jpeg",
  "saab": "./images/logos/saab.jpeg",
  "toyota": "./images/logos/toyota.jpeg",
  "volkswagen": "./images/logos/volkswagen.jpeg"
};

// Compression helper for custom uploaded brand logos
export async function compressLogoImage(dataUrl, maxDimension = 300, quality = 0.8) {
  if (!dataUrl || !dataUrl.startsWith('data:image')) return dataUrl;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

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

      try {
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      } catch (err) {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// Helper to get custom brand logos from localStorage & memory cache
export function getCustomBrandLogos() {
  if (memoryLogosCache) return { ...memoryLogosCache };
  try {
    const saved = localStorage.getItem(CUSTOM_LOGOS_STORAGE_KEY);
    memoryLogosCache = saved ? JSON.parse(saved) : {};
    return { ...memoryLogosCache };
  } catch (e) {
    console.error('Error reading custom brand logos:', e);
    return memoryLogosCache || {};
  }
}

// Get logo for a brand name
export function getLogoForBrand(brandName, fallbackLogo = null) {
  if (fallbackLogo && isValidBrandLogo(fallbackLogo)) {
    return fallbackLogo;
  }
  if (!brandName) return null;

  const rawKey = brandName.trim().toLowerCase();
  const canonicalKey = getCanonicalBrandName(brandName).toLowerCase();
  const aliasedKey = BRAND_ALIASES[rawKey] || BRAND_ALIASES[canonicalKey] || rawKey;
  const normKey = normalizeBrandName(brandName);

  const customLogos = getCustomBrandLogos();
  if (customLogos[rawKey] && isValidBrandLogo(customLogos[rawKey])) return customLogos[rawKey];
  if (customLogos[canonicalKey] && isValidBrandLogo(customLogos[canonicalKey])) return customLogos[canonicalKey];
  if (customLogos[aliasedKey] && isValidBrandLogo(customLogos[aliasedKey])) return customLogos[aliasedKey];
  if (customLogos[normKey] && isValidBrandLogo(customLogos[normKey])) return customLogos[normKey];

  return (
    DEFAULT_BRAND_LOGOS[canonicalKey] ||
    DEFAULT_BRAND_LOGOS[rawKey] ||
    DEFAULT_BRAND_LOGOS[aliasedKey] ||
    DEFAULT_BRAND_LOGOS[normKey] ||
    null
  );
}

// Save or update custom brand logo
export function saveCustomBrandLogo(brandName, logoUrl) {
  if (!brandName || !logoUrl) return;
  const rawKey = brandName.trim().toLowerCase();
  const canonicalKey = getCanonicalBrandName(brandName).toLowerCase();
  const normKey = normalizeBrandName(brandName);

  const customLogos = getCustomBrandLogos();
  customLogos[canonicalKey] = logoUrl;
  if (rawKey !== canonicalKey) {
    customLogos[rawKey] = logoUrl;
  }
  if (normKey !== canonicalKey && normKey !== rawKey) {
    customLogos[normKey] = logoUrl;
  }
  memoryLogosCache = { ...customLogos };

  try {
    localStorage.setItem(CUSTOM_LOGOS_STORAGE_KEY, JSON.stringify(customLogos));
  } catch (e) {
    console.warn('LocalStorage save failed, keeping brand in memory:', e);
  }

  // If in local development, save physically to public/images/logos/<brand> and update public/data/cars.json
  if (typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '0.0.0.0'
  )) {
    fetch('/api/save-brand-logo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandName: canonicalKey, logoData: logoUrl })
    })
    .then(r => r.json())
    .then(res => {
      console.log('Brand logo permanently saved to disk in public/images/logos:', res);
    })
    .catch(err => console.warn('Could not save brand logo via local API:', err));
  }
}

// Remove custom logo override for a brand
export function resetCustomBrandLogo(brandName) {
  if (!brandName) return;
  const rawKey = brandName.trim().toLowerCase();
  const canonicalKey = getCanonicalBrandName(brandName).toLowerCase();
  const normKey = normalizeBrandName(brandName);

  const customLogos = getCustomBrandLogos();
  delete customLogos[rawKey];
  delete customLogos[canonicalKey];
  delete customLogos[normKey];
  delete customLogos[rawKey.replace(/-/g, ' ')];
  delete customLogos[rawKey.replace(/\s+/g, '-')];
  memoryLogosCache = { ...customLogos };

  try {
    localStorage.setItem(CUSTOM_LOGOS_STORAGE_KEY, JSON.stringify(customLogos));
  } catch (e) {
    console.warn('LocalStorage reset failed, updated memory:', e);
  }
}

// Rename custom brand key
export function renameCustomBrand(oldBrandName, newBrandName) {
  if (!oldBrandName || !newBrandName) return;
  const oldKey = oldBrandName.trim().toLowerCase();
  const newKey = newBrandName.trim().toLowerCase();
  const oldCanonical = getCanonicalBrandName(oldBrandName).toLowerCase();
  const newCanonical = getCanonicalBrandName(newBrandName).toLowerCase();

  const customLogos = getCustomBrandLogos();
  const existingLogo = customLogos[oldKey] || customLogos[oldCanonical] || DEFAULT_BRAND_LOGOS[oldKey] || DEFAULT_BRAND_LOGOS[oldCanonical] || null;

  delete customLogos[oldKey];
  delete customLogos[oldCanonical];
  if (existingLogo) {
    customLogos[newKey] = existingLogo;
    customLogos[newCanonical] = existingLogo;
  }
  memoryLogosCache = { ...customLogos };

  try {
    localStorage.setItem(CUSTOM_LOGOS_STORAGE_KEY, JSON.stringify(customLogos));
  } catch (e) {
    console.warn('LocalStorage rename failed:', e);
  }
}

const DELETED_BRANDS_STORAGE_KEY = 'book_auto_pb_deleted_brands_v1';
let memoryDeletedBrandsCache = null;

export function getDeletedBrands() {
  if (memoryDeletedBrandsCache) return new Set(memoryDeletedBrandsCache);
  try {
    const saved = localStorage.getItem(DELETED_BRANDS_STORAGE_KEY);
    memoryDeletedBrandsCache = saved ? JSON.parse(saved) : [];
  } catch (e) {
    memoryDeletedBrandsCache = [];
  }
  return new Set(memoryDeletedBrandsCache);
}

// Delete brand entry (removes logo and hides brand from registered list)
export function deleteCustomBrand(brandName) {
  if (!brandName) return;
  const rawKey = brandName.trim().toLowerCase();
  const canonicalKey = getCanonicalBrandName(brandName).toLowerCase();
  const normKey = normalizeBrandName(brandName);

  const customLogos = getCustomBrandLogos();
  delete customLogos[rawKey];
  delete customLogos[canonicalKey];
  delete customLogos[normKey];
  delete customLogos[rawKey.replace(/-/g, ' ')];
  delete customLogos[rawKey.replace(/\s+/g, '-')];
  memoryLogosCache = { ...customLogos };

  try {
    localStorage.setItem(CUSTOM_LOGOS_STORAGE_KEY, JSON.stringify(customLogos));
  } catch (e) {
    console.warn('LocalStorage delete failed:', e);
  }

  try {
    const deleted = getDeletedBrands();
    deleted.add(normKey);
    deleted.add(canonicalKey);
    deleted.add(rawKey);
    memoryDeletedBrandsCache = Array.from(deleted);
    localStorage.setItem(DELETED_BRANDS_STORAGE_KEY, JSON.stringify(memoryDeletedBrandsCache));
  } catch (e) {
    console.warn('LocalStorage deleted brands save failed:', e);
  }
}

export const compressBrandLogo = compressLogoImage;
