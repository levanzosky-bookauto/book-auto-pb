import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Map DB row to Car object format with full expiration and document details
export function mapRowToCar(row) {
  if (!row) return null;

  let extra = {};
  if (row.notes && typeof row.notes === 'string' && (row.notes.startsWith('{') || row.notes.startsWith('['))) {
    try {
      extra = JSON.parse(row.notes);
    } catch (e) {
      extra = { userNotes: row.notes };
    }
  } else {
    extra = { userNotes: row.notes || '' };
  }

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
    notes: extra.userNotes !== undefined ? extra.userNotes : (row.notes || ''),
    mainPhoto: row.mainphoto || row.mainPhoto || '',
    logoImg: row.logoimg || row.logoImg || '',
    carPhotos: row.carphotos || row.carPhotos || [],
    // Synchronized Expiration Dates & Specifications
    scadenzaBollo: extra.scadenzaBollo || '',
    scadenzaAssicurazione: extra.scadenzaAssicurazione || '',
    scadenzaRevisione: extra.scadenzaRevisione || '',
    prossimoTagliandoData: extra.prossimoTagliandoData || '',
    targa: extra.targa || '',
    location: extra.location || '',
    prezzo: extra.prezzo || '',
    prezzoAcquisto: extra.prezzoAcquisto || '',
    potenzaKw: extra.potenzaKw || '',
    peso: extra.peso || '',
    colore: extra.colore || '',
    interni: extra.interni || '',
    cambio: extra.cambio || '',
    trazione: extra.trazione || '',
    carburante: extra.carburante || '',
    consumo: extra.consumo || '',
    proprietariPrecedenti: extra.proprietariPrecedenti || '',
    noteManutenzione: extra.noteManutenzione || '',
    documents: Array.isArray(extra.documents) ? extra.documents : [],
    maintenanceHistory: Array.isArray(extra.maintenanceHistory) ? extra.maintenanceHistory : []
  };
}

// Map Car object to DB row format preserving all fields safely in notes JSON payload
export function mapCarToRow(car) {
  const extraPayload = {
    userNotes: car.notes || '',
    scadenzaBollo: car.scadenzaBollo || '',
    scadenzaAssicurazione: car.scadenzaAssicurazione || '',
    scadenzaRevisione: car.scadenzaRevisione || '',
    prossimoTagliandoData: car.prossimoTagliandoData || '',
    targa: car.targa || '',
    location: car.location || '',
    prezzo: car.prezzo || '',
    prezzoAcquisto: car.prezzoAcquisto || '',
    potenzaKw: car.potenzaKw || '',
    peso: car.peso || '',
    colore: car.colore || '',
    interni: car.interni || '',
    cambio: car.cambio || '',
    trazione: car.trazione || '',
    carburante: car.carburante || '',
    consumo: car.consumo || '',
    proprietariPrecedenti: car.proprietariPrecedenti || '',
    noteManutenzione: car.noteManutenzione || '',
    documents: Array.isArray(car.documents) ? car.documents : [],
    maintenanceHistory: Array.isArray(car.maintenanceHistory) ? car.maintenanceHistory : []
  };

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
    notes: JSON.stringify(extraPayload),
    mainphoto: car.mainPhoto || '',
    logoimg: car.logoImg || '',
    carphotos: car.carPhotos || []
  };
}

// Fetch all cars from Supabase with safe timeout (filtering out system configs)
export async function fetchCarsFromSupabase(timeoutMs = 8000) {
  if (!supabase) return null;
  try {
    const fetchPromise = supabase
      .from('cars')
      .select('*')
      .order('page', { ascending: true });

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Supabase fetch timed out')), timeoutMs)
    );

    const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

    if (error) {
      console.error('Supabase fetch error:', error);
      return null;
    }

    if (Array.isArray(data) && data.length > 0) {
      return data
        .filter(r => r && r.id && !String(r.id).startsWith('__'))
        .map(mapRowToCar);
    }
    return null;
  } catch (e) {
    console.warn('Supabase fetch exception or timeout:', e);
    return null;
  }
}

// Upsert all cars to Supabase (excluding system configs)
export async function syncCarsToSupabase(cars) {
  if (!supabase || !Array.isArray(cars) || cars.length === 0) return false;
  try {
    const rows = cars
      .filter(c => c && c.id && !String(c.id).startsWith('__'))
      .map(mapCarToRow);
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

// Fetch Client & Visitor Permissions from Supabase Cloud
export async function fetchPermissionsFromSupabase(timeoutMs = 6000) {
  if (!supabase) return null;
  try {
    const fetchPromise = supabase
      .from('cars')
      .select('notes')
      .eq('id', '__app_permissions__')
      .maybeSingle();

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Supabase permissions timed out')), timeoutMs)
    );

    const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);
    if (error || !data || !data.notes) return null;

    try {
      const parsed = JSON.parse(data.notes);
      return parsed;
    } catch (parseErr) {
      return null;
    }
  } catch (e) {
    console.warn('Error fetching permissions from Supabase:', e);
    return null;
  }
}

// Upsert Client & Visitor Permissions to Supabase Cloud
export async function syncPermissionsToSupabase(permissions) {
  if (!supabase || !permissions) return false;
  try {
    const payload = {
      id: '__app_permissions__',
      brand: 'SYSTEM',
      model: 'CLIENT_PERMISSIONS',
      notes: JSON.stringify(permissions)
    };
    const { error } = await supabase.from('cars').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.error('Supabase sync permissions error:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Supabase sync permissions exception:', e);
    return false;
  }
}

// Permanently delete a car from Supabase Cloud
export async function deleteCarFromSupabase(carId) {
  if (!supabase || !carId) return false;
  try {
    const { error } = await supabase
      .from('cars')
      .delete()
      .eq('id', String(carId));
    if (error) {
      console.error('Supabase deleteCar error:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Supabase deleteCar exception:', e);
    return false;
  }
}

// Permanently delete multiple cars from Supabase Cloud
export async function deleteCarsFromSupabase(carIds) {
  if (!supabase || !Array.isArray(carIds) || carIds.length === 0) return false;
  try {
    const { error } = await supabase
      .from('cars')
      .delete()
      .in('id', carIds.map(String));
    if (error) {
      console.error('Supabase deleteCars error:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Supabase deleteCars exception:', e);
    return false;
  }
}

// Fetch Deleted Car IDs (Tombstones) from Supabase Cloud
export async function fetchDeletedCarIdsFromSupabase(timeoutMs = 6000) {
  if (!supabase) return [];
  try {
    const fetchPromise = supabase
      .from('cars')
      .select('notes')
      .eq('id', '__deleted_cars__')
      .maybeSingle();

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Supabase deleted_cars timed out')), timeoutMs)
    );

    const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);
    if (error || !data || !data.notes) return [];

    try {
      const parsed = JSON.parse(data.notes);
      return Array.isArray(parsed) ? parsed : [];
    } catch (parseErr) {
      return [];
    }
  } catch (e) {
    return [];
  }
}

// Sync Deleted Car IDs (Tombstones) to Supabase Cloud
export async function syncDeletedCarIdsToSupabase(deletedIds) {
  if (!supabase || !Array.isArray(deletedIds)) return false;
  try {
    const payload = {
      id: '__deleted_cars__',
      brand: 'SYSTEM',
      model: 'DELETED_CARS_TOMBSTONES',
      notes: JSON.stringify(deletedIds)
    };
    const { error } = await supabase.from('cars').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.error('Supabase sync deleted_cars error:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Supabase sync deleted_cars exception:', e);
    return false;
  }
}

// Fetch Email Configuration from Supabase Cloud
export async function fetchEmailConfigFromSupabase(timeoutMs = 6000) {
  if (!supabase) return null;
  try {
    const fetchPromise = supabase
      .from('cars')
      .select('notes')
      .eq('id', '__email_config__')
      .maybeSingle();

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Supabase email_config timed out')), timeoutMs)
    );

    const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);
    if (error || !data || !data.notes) return null;

    try {
      const parsed = JSON.parse(data.notes);
      return (parsed && typeof parsed === 'object') ? parsed : null;
    } catch (parseErr) {
      return null;
    }
  } catch (e) {
    return null;
  }
}

// Sync Email Configuration to Supabase Cloud
export async function syncEmailConfigToSupabase(config) {
  if (!supabase || !config || typeof config !== 'object') return false;
  try {
    const payload = {
      id: '__email_config__',
      brand: 'SYSTEM',
      model: 'EMAIL_CONFIG',
      notes: JSON.stringify(config)
    };
    const { error } = await supabase.from('cars').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.error('Supabase sync email_config error:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Supabase sync email_config exception:', e);
    return false;
  }
}
