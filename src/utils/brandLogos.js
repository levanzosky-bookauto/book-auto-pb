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

export const DEFAULT_BRAND_LOGOS = {
  "alfa romeo": "./images/logos/alfa_romeo.jpeg",
  "alfa-romeo": "./images/logos/alfa_romeo.jpeg",
  "aston martin": "./images/logos/aston_martin.jpeg",
  "aston-martin": "./images/logos/aston_martin.jpeg",
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
  "land-rover": "./images/logos/land_rover.jpeg",
  "mercedes": "./images/logos/mercedes_benz.jpeg",
  "mercedes-benz": "./images/logos/mercedes_benz.jpeg",
  "mercedes benz": "./images/logos/mercedes_benz.jpeg",
  "mercedes-amg": "./images/logos/mercedes_amg.jpeg",
  "mercedes amg": "./images/logos/mercedes_amg.jpeg",
  "polaris": "./images/logos/polaris.png",
  "pontiac": "./images/logos/pontiac.png",
  "porsche": "./images/logos/porsche.jpeg",
  "renault": "./images/logos/renault.jpeg",
  "rolls-royce": "./images/logos/rolls_royce.jpeg",
  "rolls royce": "./images/logos/rolls_royce.jpeg",
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
  const normKey = normalizeBrandName(brandName);

  const customLogos = getCustomBrandLogos();
  if (customLogos[rawKey] && isValidBrandLogo(customLogos[rawKey])) {
    return customLogos[rawKey];
  }
  if (customLogos[normKey] && isValidBrandLogo(customLogos[normKey])) {
    return customLogos[normKey];
  }

  return DEFAULT_BRAND_LOGOS[rawKey] || DEFAULT_BRAND_LOGOS[normKey] || null;
}

// Save or update custom brand logo
export function saveCustomBrandLogo(brandName, logoUrl) {
  if (!brandName || !logoUrl) return;
  const rawKey = brandName.trim().toLowerCase();
  const normKey = normalizeBrandName(brandName);

  const customLogos = getCustomBrandLogos();
  customLogos[rawKey] = logoUrl;
  customLogos[normKey] = logoUrl;
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
      body: JSON.stringify({ brandName, logoData: logoUrl })
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
  const normKey = normalizeBrandName(brandName);

  const customLogos = getCustomBrandLogos();
  delete customLogos[rawKey];
  delete customLogos[normKey];
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
  const oldNorm = normalizeBrandName(oldBrandName);
  const newNorm = normalizeBrandName(newBrandName);

  const customLogos = getCustomBrandLogos();
  const existingLogo = customLogos[oldKey] || customLogos[oldNorm] || DEFAULT_BRAND_LOGOS[oldKey] || null;

  delete customLogos[oldKey];
  delete customLogos[oldNorm];
  if (existingLogo) {
    customLogos[newKey] = existingLogo;
    customLogos[newNorm] = existingLogo;
  }
  memoryLogosCache = { ...customLogos };

  try {
    localStorage.setItem(CUSTOM_LOGOS_STORAGE_KEY, JSON.stringify(customLogos));
  } catch (e) {
    console.warn('LocalStorage rename failed:', e);
  }
}

// Delete custom brand entry
export function deleteCustomBrand(brandName) {
  if (!brandName) return;
  const rawKey = brandName.trim().toLowerCase();
  const normKey = normalizeBrandName(brandName);

  const customLogos = getCustomBrandLogos();
  delete customLogos[rawKey];
  delete customLogos[normKey];
  memoryLogosCache = { ...customLogos };

  try {
    localStorage.setItem(CUSTOM_LOGOS_STORAGE_KEY, JSON.stringify(customLogos));
  } catch (e) {
    console.warn('LocalStorage delete failed:', e);
  }
}

export const compressBrandLogo = compressLogoImage;
