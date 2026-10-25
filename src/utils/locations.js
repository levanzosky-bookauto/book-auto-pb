// Utility for managing Physical Locations (Ubicazioni Vetture / Garage) with Supabase Cloud Sync
import { fetchLocationsFromSupabase, syncLocationsToSupabase } from './supabase';

const LOCATIONS_STORAGE_KEY = 'book_auto_pb_locations_v1';

export const DEFAULT_LOCATIONS = [
  'Garage Principale',
  'Milano Portaromana 91',
  'Villa / Residenza',
  'Deposito / Caveau',
  'Officina / Restauro'
];

/**
 * Normalizes location string: trims whitespace and collapses multiple spaces
 */
export function normalizeLocation(loc) {
  if (!loc || typeof loc !== 'string') return '';
  return loc.trim().replace(/\s+/g, ' ');
}

/**
 * Deduplicates an array of location strings case-insensitively while preserving formatting
 */
export function dedupeLocations(list) {
  if (!Array.isArray(list)) return [];
  const map = new Map();
  list.forEach(item => {
    const norm = normalizeLocation(item);
    if (norm && !map.has(norm.toLowerCase())) {
      map.set(norm.toLowerCase(), norm);
    }
  });
  return Array.from(map.values());
}

export function getLocations() {
  const saved = localStorage.getItem(LOCATIONS_STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const deduped = dedupeLocations(parsed);
        return deduped.length > 0 ? deduped : DEFAULT_LOCATIONS;
      }
    } catch (e) {
      console.error('Error parsing locations storage:', e);
    }
  }
  localStorage.setItem(LOCATIONS_STORAGE_KEY, JSON.stringify(DEFAULT_LOCATIONS));
  return DEFAULT_LOCATIONS;
}

export function saveLocations(locations) {
  if (!Array.isArray(locations)) return;
  const deduped = dedupeLocations(locations);
  localStorage.setItem(LOCATIONS_STORAGE_KEY, JSON.stringify(deduped));
  syncLocationsToSupabase(deduped).catch(err => {
    console.warn('Background syncLocationsToSupabase error:', err);
  });
}

export async function syncLocationsWithCloud() {
  try {
    const remote = await fetchLocationsFromSupabase();
    if (Array.isArray(remote) && remote.length > 0) {
      const deduped = dedupeLocations(remote);
      localStorage.setItem(LOCATIONS_STORAGE_KEY, JSON.stringify(deduped));
      return deduped;
    } else {
      const current = getLocations();
      await syncLocationsToSupabase(current);
      return current;
    }
  } catch (e) {
    console.warn('Failed syncing locations with cloud:', e);
  }
  return getLocations();
}

export function addLocation(newLocation) {
  const clean = normalizeLocation(newLocation);
  if (!clean) return getLocations();
  const current = getLocations();
  const exists = current.some(l => l.toLowerCase() === clean.toLowerCase());
  if (!exists) {
    const updated = dedupeLocations([...current, clean]);
    saveLocations(updated);
    return updated;
  }
  return current;
}

export function removeLocation(locationToRemove) {
  const normTarget = normalizeLocation(locationToRemove).toLowerCase();
  const current = getLocations();
  const updated = current.filter(l => normalizeLocation(l).toLowerCase() !== normTarget);
  saveLocations(updated);
  return updated;
}

export function renameLocation(oldName, newName) {
  const cleanOld = normalizeLocation(oldName).toLowerCase();
  const cleanNew = normalizeLocation(newName);
  if (!cleanOld || !cleanNew) return getLocations();
  const current = getLocations();
  const updated = dedupeLocations(
    current.map(l => normalizeLocation(l).toLowerCase() === cleanOld ? cleanNew : l)
  );
  saveLocations(updated);
  return updated;
}
