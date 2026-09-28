import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Map DB row to Car object format
export function mapRowToCar(row) {
  if (!row) return null;
  return {
    id: row.id,
    page: row.page,
    brand: row.brand,
    model: row.model,
    immatricolazione: row.immatricolazione,
    chassis: row.chassis,
    cilindrata: row.cilindrata,
    horsepower: row.horsepower,
    esemplari: row.esemplari,
    images: row.images || [],
    pageImage: row.pageimage || row.pageImage || '',
    isFavorite: Boolean(row.isfavorite ?? row.isFavorite),
    notes: row.notes || '',
    mainPhoto: row.mainphoto || row.mainPhoto || '',
    logoImg: row.logoimg || row.logoImg || '',
    carPhotos: row.carphotos || row.carPhotos || []
  };
}

// Map Car object to DB row format
export function mapCarToRow(car) {
  return {
    id: String(car.id),
    page: car.page || 0,
    brand: car.brand || '',
    model: car.model || '',
    immatricolazione: car.immatricolazione || '',
    chassis: car.chassis || '',
    cilindrata: car.cilindrata || '',
    horsepower: car.horsepower || '',
    esemplari: car.esemplari || '',
    images: car.images || [],
    pageimage: car.pageImage || '',
    isfavorite: Boolean(car.isFavorite),
    notes: car.notes || '',
    mainphoto: car.mainPhoto || '',
    logoimg: car.logoImg || '',
    carphotos: car.carPhotos || []
  };
}

// Fetch all cars from Supabase
export async function fetchCarsFromSupabase() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('cars')
      .select('*')
      .order('page', { ascending: true });

    if (error) {
      console.error('Supabase fetch error:', error);
      return null;
    }

    if (Array.isArray(data) && data.length > 0) {
      return data.map(mapRowToCar);
    }
    return null;
  } catch (e) {
    console.error('Supabase fetch exception:', e);
    return null;
  }
}

// Upsert all cars to Supabase
export async function syncCarsToSupabase(cars) {
  if (!supabase || !Array.isArray(cars) || cars.length === 0) return false;
  try {
    const rows = cars.map(mapCarToRow);
    const { error } = await supabase.from('cars').upsert(rows, { onConflict: 'id' });
    if (error) {
      console.error('Supabase sync error:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Supabase sync exception:', e);
    return false;
  }
}
