// Utility for managing Physical Locations (Collocazione Fisica Vetture) with Supabase Cloud Sync
import { fetchLocationsFromSupabase, syncLocationsToSupabase } from './supabase';

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
  if (!Array.isArray(locations)) return;
  localStorage.setItem(LOCATIONS_STORAGE_KEY, JSON.stringify(locations));
  syncLocationsToSupabase(locations).catch(err => {
    console.warn('Background syncLocationsToSupabase error:', err);
  });
}

export async function syncLocationsWithCloud() {
  try {
    const remote = await fetchLocationsFromSupabase();
    if (Array.isArray(remote) && remote.length > 0) {
      localStorage.setItem(LOCATIONS_STORAGE_KEY, JSON.stringify(remote));
      return remote;
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
