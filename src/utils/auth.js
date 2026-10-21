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
  "./images/bg_1.jpg",
  "./images/bg_2.jpg",
  "./images/bg_3.jpg",
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
  }
];

export function getUsers() {
  const saved = localStorage.getItem(USERS_STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
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

// Sync users between Supabase Cloud and local storage
export async function syncUsersWithCloud() {
  try {
    const remoteUsers = await fetchUsersFromSupabase();
    if (Array.isArray(remoteUsers) && remoteUsers.length > 0) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(remoteUsers));
      return remoteUsers;
    } else {
      // Cloud was empty: seed cloud with current users
      const current = getUsers();
      await syncUsersToSupabase(current);
      return current;
    }
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

const CURRENT_USER_KEY = 'book_auto_pb_current_user_v2';
const LEGACY_USER_KEY = 'book_auto_pb_current_user_v1';

// Immediately purge any stale auto-saved admin sessions from previous versions
try {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(LEGACY_USER_KEY);
    sessionStorage.removeItem(LEGACY_USER_KEY);
  }
} catch (e) {}

export function getCurrentUser() {
  try {
    const saved = sessionStorage.getItem(CURRENT_USER_KEY) || localStorage.getItem(CURRENT_USER_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.username) return parsed;
    }
  } catch (e) {
    console.error('Error parsing current user session:', e);
  }

  // Never auto-login in localhost or anywhere else! Always require valid credentials.
  return null;
}

export function setCurrentUser(user, rememberMe = false) {
  if (!user) {
    try {
      localStorage.removeItem(CURRENT_USER_KEY);
      sessionStorage.removeItem(CURRENT_USER_KEY);
      localStorage.removeItem(LEGACY_USER_KEY);
      sessionStorage.removeItem(LEGACY_USER_KEY);
    } catch (e) {}
  } else {
    try {
      sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
      if (rememberMe) {
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(CURRENT_USER_KEY);
      }
    } catch(e) {}
  }
}

export function logoutUser() {
  try {
    localStorage.removeItem(CURRENT_USER_KEY);
    sessionStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem(LEGACY_USER_KEY);
    sessionStorage.removeItem(LEGACY_USER_KEY);
  } catch (e) {}
}

// -------------------------------------------------------------
// CREDENTIAL RECOVERY & MASTER PIN (OPTION 2 + OPTION 3)
// -------------------------------------------------------------

export const DEFAULT_MASTER_PIN = '8822';
const MASTER_PIN_STORAGE_KEY = 'book_auto_pb_master_pin_v1';

/**
 * Returns current master security PIN (Option 3 emergency unlock)
 */
export function getMasterRecoveryPin() {
  try {
    const saved = localStorage.getItem(MASTER_PIN_STORAGE_KEY);
    if (saved && saved.trim()) return saved.trim();
  } catch (e) {}
  return DEFAULT_MASTER_PIN;
}

/**
 * Sets new master security PIN (saved by Super Admin in settings)
 */
export function setMasterRecoveryPin(newPin) {
  const clean = (newPin || '').trim();
  if (clean) {
    localStorage.setItem(MASTER_PIN_STORAGE_KEY, clean);
    return clean;
  }
  return DEFAULT_MASTER_PIN;
}

/**
 * Validates whether entered PIN matches the master recovery PIN
 */
export function verifyMasterPin(inputPin) {
  const clean = (inputPin || '').trim();
  return clean === getMasterRecoveryPin();
}

/**
 * Finds user for recovery by username, email, or admin email
 */
export function findUserForRecovery(identifier) {
  if (!identifier) return null;
  const clean = identifier.trim().toLowerCase();
  const users = getUsers();
  let adminEmail = '';
  try {
    adminEmail = (localStorage.getItem('book_auto_pb_admin_email') || '').trim().toLowerCase();
  } catch (e) {}

  // 1. Direct username match
  let match = users.find(u => (u.username || '').toLowerCase() === clean);
  if (match) return match;

  // 2. Direct user email match
  match = users.find(u => u.email && u.email.toLowerCase() === clean);
  if (match) return match;

  // 3. Admin email match -> resolves to super_admin account
  if (adminEmail && clean === adminEmail) {
    match = users.find(u => u.role === 'super_admin');
    if (match) return match;
  }

  return null;
}

/**
 * Updates a user's password directly (used after OTP or Master PIN verification)
 */
export function updateUserPassword(userIdentifier, newPassword) {
  if (!userIdentifier || !newPassword) {
    return { success: false, reason: 'Dati incompleti per aggiornare la password.' };
  }
  const cleanPass = newPassword.trim();
  const cleanId = userIdentifier.trim().toLowerCase();
  const users = getUsers();

  const idx = users.findIndex(u =>
    u.id === userIdentifier ||
    (u.username || '').toLowerCase() === cleanId ||
    (u.email && u.email.toLowerCase() === cleanId)
  );

  if (idx === -1) {
    return { success: false, reason: 'Utente non trovato nel sistema.' };
  }

  users[idx] = {
    ...users[idx],
    password: cleanPass,
    updatedAt: new Date().toISOString()
  };

  saveUsers(users);
  return { success: true, user: users[idx] };
}
