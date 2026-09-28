// Utility for managing Physical Locations (Collocazione Fisica Vetture)

const LOCATIONS_STORAGE_KEY = 'book_auto_pb_locations_v1';

export const DEFAULT_LOCATIONS = [
  'Garage Principale',
  'Garage Milano',
  'Villa / Residenza',
  'Deposito / Caveau',
  'Officina / Restauro'
];

export function getLocations() {
  const saved = localStorage.getItem(LOCATIONS_STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {
      console.error('Error parsing locations storage:', e);
    }
  }
  localStorage.setItem(LOCATIONS_STORAGE_KEY, JSON.stringify(DEFAULT_LOCATIONS));
  return DEFAULT_LOCATIONS;
}

export function saveLocations(locations) {
  localStorage.setItem(LOCATIONS_STORAGE_KEY, JSON.stringify(locations));
}

export function addLocation(newLocation) {
  const clean = (newLocation || '').trim();
  if (!clean) return getLocations();
  const current = getLocations();
  if (!current.includes(clean)) {
    const updated = [...current, clean];
    saveLocations(updated);
    return updated;
  }
  return current;
}

export function removeLocation(locationToRemove) {
  const current = getLocations();
  const updated = current.filter(l => l !== locationToRemove);
  saveLocations(updated);
  return updated;
}

export function renameLocation(oldName, newName) {
  const cleanOld = (oldName || '').trim();
  const cleanNew = (newName || '').trim();
  if (!cleanOld || !cleanNew) return getLocations();
  const current = getLocations();
  const updated = current.map(l => l === cleanOld ? cleanNew : l);
  saveLocations(updated);
  return updated;
}
