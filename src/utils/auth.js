// Authentication & Multi-User Management system with 3 Role Categories & Realtime Cloud Sync
import { 
  fetchUsersFromSupabase, 
  syncUsersToSupabase, 
  fetchBackgroundsFromSupabase, 
  syncBackgroundsToSupabase 
} from './supabase';

const USERS_STORAGE_KEY = 'book_auto_pb_users_v2';
const BACKGROUNDS_STORAGE_KEY = 'book_auto_pb_bg_images_v1';

export const USER_ROLES = {
  SUPER_ADMIN: {
    id: 'super_admin',
    name: 'Super Admin (Proprietario)',
    desc: 'Accesso completo: gestione vetture, utenti, sfondi, backup e eliminazioni.',
    color: 'amber'
  },
  EDITOR: {
    id: 'editor',
    name: 'Gestore / Editor',
    desc: 'Può aggiungere e modificare vetture, foto e registro manutenzione.',
    color: 'emerald'
  },
  VIEWER: {
    id: 'viewer',
    name: 'Visualizzatore / Cliente',
    desc: 'Accesso in sola lettura al catalogo, schede vetture e stampa PDF.',
    color: 'sky'
  }
};

export const DEFAULT_BACKGROUNDS = [
  "./images/cars/car_1_page.jpg",
  "./images/cars/car_2_page.jpg",
  "./images/cars/car_3_page.jpg",
  "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1920&q=80",
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1920&q=80"
];

export const INITIAL_USERS = [
  {
    "id": "user_shirantha",
    "username": "shirantha",
    "password": "Maduka0822",
    "name": "Shirantha",
    "role": "super_admin",
    "createdAt": "2026-10-03T20:03:13.022Z"
  },
  {
    "id": "user_1791310116076",
    "username": "luciano",
    "password": "1234",
    "name": "Luciano",
    "role": "editor",
    "createdAt": "2026-10-06T18:08:36.076Z"
  },
  {
    "id": "user_visitatore",
    "username": "visitatore",
    "password": "1234",
    "name": "Visitatore",
    "role": "viewer",
    "createdAt": "2026-10-06T18:08:36.076Z"
  }
];

// Bidirectional merge: guarantees no user created locally on any device is ever lost
export function mergeUsers(localUsers = [], remoteUsers = []) {
  const map = new Map();

  // 1. Initial defaults
  INITIAL_USERS.forEach(u => {
    if (u && u.username) map.set(u.username.trim().toLowerCase(), u);
  });

  // 2. Remote users from Supabase Cloud
  if (Array.isArray(remoteUsers)) {
    remoteUsers.forEach(u => {
      if (u && u.username) {
        map.set(u.username.trim().toLowerCase(), u);
      }
    });
  }

  // 3. Local users from this browser (preserves any user created in Admin panel!)
  if (Array.isArray(localUsers)) {
    localUsers.forEach(u => {
      if (u && u.username) {
        const key = u.username.trim().toLowerCase();
        const existing = map.get(key);
        if (!existing) {
          map.set(key, u);
        } else {
          map.set(key, { ...existing, ...u });
        }
      }
    });
  }

  return Array.from(map.values());
}

export function getUsers() {
  const saved = localStorage.getItem(USERS_STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Merge to guarantee all baseline accounts exist alongside custom users
        return mergeUsers(parsed, []);
      }
    } catch (e) {
      console.error('Error parsing users storage:', e);
    }
  }
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_USERS));
  return INITIAL_USERS;
}

export function saveUsers(users) {
  if (!Array.isArray(users)) return;
  // 1. Save locally
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  // 2. Synchronize to Supabase Cloud in background
  syncUsersToSupabase(users).catch(err => {
    console.warn('Background syncUsersToSupabase error:', err);
  });
}

// Sync users between Supabase Cloud and local storage without deleting any user
export async function syncUsersWithCloud() {
  try {
    const localUsers = getUsers();
    const remoteUsers = await fetchUsersFromSupabase();

    // Bidirectional merge so that any user created locally or in cloud is preserved
    const merged = mergeUsers(localUsers, remoteUsers || []);

    // Save to local storage
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(merged));

    // Upload merged list to Supabase Cloud so all devices (phones, etc.) get it immediately
    await syncUsersToSupabase(merged);

    return merged;
  } catch (e) {
    console.warn('Failed syncing users with cloud:', e);
  }
  return getUsers();
}

/**
 * Mobile-friendly authentication matching:
 * - Trims hidden spaces from mobile keyboards
 * - Case-insensitive username check
 * - Exact password match + tolerant case-insensitive fallback (e.g. mobile auto-capitalized password)
 * - Flexible visitor/cliente support
 */
export function authenticateUserWithList(username, password, usersList) {
  if (!Array.isArray(usersList)) return null;
  const cleanUser = (username || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();

  if (!cleanUser || !cleanPass) return null;

  // 1. Exact match (exact password, case-insensitive username)
  const exact = usersList.find(
    u => u.username.toLowerCase() === cleanUser && u.password === cleanPass
  );
  if (exact) return exact;

  // 2. Mobile-friendly fallback: mobile keyboard auto-capitalized first character
  const caseInsensitive = usersList.find(
    u => u.username.toLowerCase() === cleanUser && u.password.toLowerCase() === cleanPass.toLowerCase()
  );
  if (caseInsensitive) return caseInsensitive;

  // 3. Flexible fallback for visitor/cliente accounts
  if (cleanUser === 'visitatore' || cleanUser === 'cliente' || cleanUser === 'guest') {
    const visitorUser = usersList.find(u => u.username.toLowerCase() === cleanUser || u.role === 'viewer');
    if (visitorUser) {
      if (cleanPass === '1234' || cleanPass === 'visitatore' || cleanPass === 'cliente' || cleanPass === visitorUser.password.toLowerCase()) {
        return visitorUser;
      }
    }
  }

  return null;
}

export function authenticateUser(username, password) {
  const users = getUsers();
  return authenticateUserWithList(username, password, users);
}

// Asynchronous authentication: checks local storage first, then checks Cloud if not found
export async function authenticateUserAsync(username, password) {
  // 1. Fast local check
  const localMatch = authenticateUser(username, password);
  if (localMatch) return localMatch;

  // 2. Fallback: refresh latest users from Supabase Cloud
  try {
    const cloudUsers = await syncUsersWithCloud();
    if (Array.isArray(cloudUsers)) {
      const cloudMatch = authenticateUserWithList(username, password, cloudUsers);
      if (cloudMatch) return cloudMatch;
    }
  } catch (e) {
    console.warn('authenticateUserAsync cloud fetch error:', e);
  }

  return null;
}

export function getBackgroundImages() {
  const saved = localStorage.getItem(BACKGROUNDS_STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {
      console.error('Error parsing background storage:', e);
    }
  }
  localStorage.setItem(BACKGROUNDS_STORAGE_KEY, JSON.stringify(DEFAULT_BACKGROUNDS));
  return DEFAULT_BACKGROUNDS;
}

export function saveBackgroundImages(bgList) {
  if (!Array.isArray(bgList)) return;
  localStorage.setItem(BACKGROUNDS_STORAGE_KEY, JSON.stringify(bgList));
  syncBackgroundsToSupabase(bgList).catch(err => {
    console.warn('Background syncBackgroundsToSupabase error:', err);
  });
}

export async function syncBackgroundsWithCloud() {
  try {
    const remote = await fetchBackgroundsFromSupabase();
    if (Array.isArray(remote) && remote.length > 0) {
      localStorage.setItem(BACKGROUNDS_STORAGE_KEY, JSON.stringify(remote));
      return remote;
    } else {
      const current = getBackgroundImages();
      await syncBackgroundsToSupabase(current);
      return current;
    }
  } catch (e) {
    console.warn('Failed syncing backgrounds with cloud:', e);
  }
  return getBackgroundImages();
}

const CURRENT_USER_KEY = 'book_auto_pb_current_user_v1';

export function getCurrentUser() {
  // Clear any legacy persistent login stored in localStorage
  localStorage.removeItem(CURRENT_USER_KEY);

  const saved = sessionStorage.getItem(CURRENT_USER_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Error parsing current user session:', e);
    }
  }
  return null;
}

export function setCurrentUser(user) {
  localStorage.removeItem(CURRENT_USER_KEY);
  if (!user) {
    sessionStorage.removeItem(CURRENT_USER_KEY);
  } else {
    sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  }
}

export function logoutUser() {
  localStorage.removeItem(CURRENT_USER_KEY);
  sessionStorage.removeItem(CURRENT_USER_KEY);
}
