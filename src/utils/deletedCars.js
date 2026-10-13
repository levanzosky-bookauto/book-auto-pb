// System for tracking permanently deleted vehicles (Tombstones)
// Ensures that deleted cars are NEVER restored by baseline cars.json, cache, or cloud sync

import { 
  deleteCarFromSupabase, 
  deleteCarsFromSupabase, 
  fetchDeletedCarIdsFromSupabase, 
  syncDeletedCarIdsToSupabase 
} from './supabase';

export const DELETED_CARS_STORAGE_KEY = 'book_auto_pb_deleted_cars_v1';

// Known deleted vehicle IDs that must never reappear (including FIAT Tipo 61)
const INITIAL_PERMANENTLY_DELETED = ['car_new_1791701751933'];

/**
 * Get all permanently deleted car IDs from localStorage
 */
export function getDeletedCarIds() {
  try {
    const saved = localStorage.getItem(DELETED_CARS_STORAGE_KEY);
    const list = saved ? JSON.parse(saved) : [];
    const combined = Array.from(new Set([...INITIAL_PERMANENTLY_DELETED, ...(Array.isArray(list) ? list : [])]));
    return combined.map(String);
  } catch (e) {
    console.error('Error loading deleted car IDs:', e);
    return [...INITIAL_PERMANENTLY_DELETED];
  }
}

/**
 * Save deleted car IDs to localStorage
 */
export function saveDeletedCarIds(ids) {
  try {
    const clean = Array.from(new Set([...INITIAL_PERMANENTLY_DELETED, ...ids.map(String)]));
    localStorage.setItem(DELETED_CARS_STORAGE_KEY, JSON.stringify(clean));
    return clean;
  } catch (e) {
    console.error('Error saving deleted car IDs:', e);
    return ids;
  }
}

/**
 * Permanently delete a single car across local storage and Supabase Cloud
 */
export async function markCarAsPermanentlyDeleted(carId) {
  if (!carId) return;
  const current = getDeletedCarIds();
  const updated = Array.from(new Set([...current, String(carId)]));
  saveDeletedCarIds(updated);

  // Permanently delete the row in Supabase
  await deleteCarFromSupabase(carId);

  // Sync tombstone list to Supabase so other devices also know it is deleted
  await syncDeletedCarIdsToSupabase(updated);

  return updated;
}

/**
 * Permanently delete multiple cars across local storage and Supabase Cloud
 */
export async function markCarsAsPermanentlyDeleted(carIds) {
  if (!Array.isArray(carIds) || carIds.length === 0) return;
  const current = getDeletedCarIds();
  const strIds = carIds.map(String);
  const updated = Array.from(new Set([...current, ...strIds]));
  saveDeletedCarIds(updated);

  // Permanently delete rows in Supabase
  await deleteCarsFromSupabase(strIds);

  // Sync tombstone list to Supabase
  await syncDeletedCarIdsToSupabase(updated);

  return updated;
}

/**
 * Check if a car has been deleted
 */
export function isCarDeleted(car, deletedIds = null) {
  if (!car) return false;
  const list = deletedIds || getDeletedCarIds();
  const carIdStr = String(car.id || '');
  
  // Explicit ID check
  if (list.includes(carIdStr)) return true;

  // Specific guard for FIAT Tipo 61
  const brand = String(car.brand || '').trim().toUpperCase();
  const model = String(car.model || '').trim().toUpperCase();
  if (brand === 'FIAT' && model.includes('TIPO 61')) {
    return true;
  }

  return false;
}

/**
 * Filter an array of cars, removing all permanently deleted vehicles
 */
export function filterOutDeletedCars(carsList, deletedIds = null) {
  if (!Array.isArray(carsList)) return [];
  const list = deletedIds || getDeletedCarIds();
  return carsList.filter(car => !isCarDeleted(car, list));
}

/**
 * Synchronize deleted car IDs with Supabase Cloud
 */
export async function syncDeletedCarsWithCloud() {
  try {
    const local = getDeletedCarIds();
    const cloud = await fetchDeletedCarIdsFromSupabase();
    const merged = Array.from(new Set([...local, ...(Array.isArray(cloud) ? cloud : [])]));
    saveDeletedCarIds(merged);
    await syncDeletedCarIdsToSupabase(merged);
    return merged;
  } catch (e) {
    console.error('Error syncing deleted cars with cloud:', e);
    return getDeletedCarIds();
  }
}
