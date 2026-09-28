// Authentication & Multi-User Management system with 3 Role Categories

const USERS_STORAGE_KEY = 'book_auto_pb_users_v1';
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
  './images/cars/car_1_page.jpg',
  './images/cars/car_2_page.jpg',
  './images/cars/car_3_page.jpg',
  'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1920&q=80'
];

export const INITIAL_USERS = [
  {
    id: 'user_shirantha',
    username: 'shirantha',
    password: '1234',
    name: 'Shirantha',
    role: 'super_admin',
    createdAt: new Date().toISOString()
  },
  {
    id: 'user_editor',
    username: 'gestore',
    password: '1234',
    name: 'Gestore Garage',
    role: 'editor',
    createdAt: new Date().toISOString()
  },
  {
    id: 'user_viewer',
    username: 'cliente',
    password: '1234',
    name: 'Cliente VIP',
    role: 'viewer',
    createdAt: new Date().toISOString()
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
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

export function authenticateUser(username, password) {
  const users = getUsers();
  const cleanUser = (username || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();

  return users.find(
    u => u.username.toLowerCase() === cleanUser && u.password === cleanPass
  ) || null;
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
  localStorage.setItem(BACKGROUNDS_STORAGE_KEY, JSON.stringify(bgList));
}

const CURRENT_USER_KEY = 'book_auto_pb_current_user_v1';

export function getCurrentUser() {
  const saved = localStorage.getItem(CURRENT_USER_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Error parsing current user:', e);
    }
  }
  // Default to Shirantha (super_admin)
  const defaultUser = INITIAL_USERS[0];
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(defaultUser));
  return defaultUser;
}

export function setCurrentUser(user) {
  if (!user) {
    localStorage.removeItem(CURRENT_USER_KEY);
  } else {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  }
}

export function logoutUser() {
  localStorage.removeItem(CURRENT_USER_KEY);
}

