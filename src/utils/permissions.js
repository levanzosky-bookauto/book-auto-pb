// Client & Visitor Visibility and Permissions Management System
// Controls what non-admin visitors and clients can or cannot see and do in Book Auto PB

export const CLIENT_PERMISSIONS_STORAGE_KEY = 'book_auto_pb_client_permissions_v2';

export const DEFAULT_CLIENT_PERMISSIONS = {
  // Scadenze e Notifiche (Bollo, Assicurazione, Revisione, Tagliando)
  showExpirations: false, // Default: FALSE (Clienti e visitatori NON vedono le scadenze)

  // Dati Sensibili Vettura
  showChassis: false,     // Default: FALSE (Numero di telaio VIN riservato)
  showLocation: false,    // Default: FALSE (Ubicazione fisica garage/box riservata)
  showDocuments: false,   // Default: FALSE (Scansioni libretto e polizze riservate)
  showPrices: true,       // Default: TRUE (Prezzo di vendita visibile)

  // Funzionalità & Esportazioni
  allowPdfDownload: true,   // Default: TRUE (I clienti possono scaricare le schede PDF)
  allowGuestBrowsing: true  // Default: TRUE (I visitatori possono entrare come ospiti senza password)
};

export function getClientPermissions() {
  try {
    const saved = localStorage.getItem(CLIENT_PERMISSIONS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_CLIENT_PERMISSIONS, ...parsed };
    }
  } catch (e) {
    console.error('Error loading client permissions:', e);
  }
  return { ...DEFAULT_CLIENT_PERMISSIONS };
}

export function saveClientPermissions(permissions) {
  try {
    const merged = { ...DEFAULT_CLIENT_PERMISSIONS, ...permissions };
    localStorage.setItem(CLIENT_PERMISSIONS_STORAGE_KEY, JSON.stringify(merged));
    return merged;
  } catch (e) {
    console.error('Error saving client permissions:', e);
    return DEFAULT_CLIENT_PERMISSIONS;
  }
}

/**
 * Checks if the current user is an internal staff member (Super Admin or Gestore / Editor)
 * Staff members ALWAYS have full visibility and access regardless of client toggles!
 */
export function isStaffUser(currentUser) {
  if (!currentUser) return false;
  const role = currentUser.role || '';
  return role === 'super_admin' || role === 'editor';
}

/**
 * Checks if expirations and alerts are visible to the given user.
 * STRICT RULE: Clienti and visitatori must NEVER see scadenze and avvisi!
 * Only internal staff members (Super Admin & Gestore / Editor) have access.
 */
export function canViewExpirations(currentUser, permissions = DEFAULT_CLIENT_PERMISSIONS) {
  if (!currentUser) return false;
  return isStaffUser(currentUser);
}

/**
 * Checks if chassis (VIN) is visible to the given user
 */
export function canViewChassis(currentUser, permissions = DEFAULT_CLIENT_PERMISSIONS) {
  if (isStaffUser(currentUser)) return true;
  return Boolean(permissions?.showChassis);
}

/**
 * Checks if physical garage location is visible to the given user
 */
export function canViewLocation(currentUser, permissions = DEFAULT_CLIENT_PERMISSIONS) {
  if (isStaffUser(currentUser)) return true;
  return Boolean(permissions?.showLocation);
}

/**
 * Checks if official scanned documents (libretto, polizza) are visible
 */
export function canViewDocuments(currentUser, permissions = DEFAULT_CLIENT_PERMISSIONS) {
  if (isStaffUser(currentUser)) return true;
  return Boolean(permissions?.showDocuments);
}

/**
 * Checks if prices are visible
 */
export function canViewPrices(currentUser, permissions = DEFAULT_CLIENT_PERMISSIONS) {
  if (isStaffUser(currentUser)) return true;
  return Boolean(permissions?.showPrices);
}

/**
 * Checks if PDF download/print is allowed
 */
export function canExportPdf(currentUser, permissions = DEFAULT_CLIENT_PERMISSIONS) {
  if (isStaffUser(currentUser)) return true;
  return Boolean(permissions?.allowPdfDownload);
}
