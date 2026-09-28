const CUSTOM_LOGOS_STORAGE_KEY = 'book_auto_pb_custom_brand_logos_v1';

export const DEFAULT_BRAND_LOGOS = {
  'alfa romeo': '/images/cars/car_2_img_4.jpeg',
  'aston martin': '/images/cars/car_3_img_5.jpeg',
  'audi': '/images/cars/car_4_img_1.jpeg',
  'bmw': '/images/cars/car_9_img_1.jpeg',
  'bentley': '/images/cars/car_7_img_5.jpeg',
  'bizzarrini': '/images/cars/car_8_img_1.png',
  'bugatti': '/images/cars/car_10_img_1.png',
  'citroën': '/images/cars/car_11_img_1.jpeg',
  'ferrari': '/images/cars/car_12_img_1.jpeg',
  'fiat': '/images/cars/car_23_img_1.png',
  'ford': '/images/cars/car_24_img_7.png',
  'lamborghini': '/images/cars/car_25_img_6.png',
  'lancia': '/images/cars/car_26_img_1.png',
  'land rover': '/images/cars/car_29_img_2.jpeg',
  'mercedes-amg': '/images/cars/car_30_img_1.jpeg',
  'mercedes-benz': '/images/cars/car_31_img_1.jpeg',
  'polaris': '/images/cars/car_33_img_1.jpeg',
  'pontiac': '/images/cars/car_34_img_1.jpeg',
  'porsche': '/images/cars/car_35_img_1.jpeg',
  'renault': '/images/cars/car_48_img_5.png',
  'rolls-royce': '/images/cars/car_49_img_4.jpeg',
  'rover': '/images/cars/car_50_img_5.jpeg',
  'saab': '/images/cars/car_51_img_5.jpeg',
  'toyota': '/images/cars/car_52_img_1.jpeg',
  'volkswagen': '/images/cars/car_53_img_1.jpeg'
};

// Helper to get custom brand logos from localStorage
export function getCustomBrandLogos() {
  try {
    const saved = localStorage.getItem(CUSTOM_LOGOS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch (e) {
    console.error('Error reading custom brand logos from localStorage:', e);
    return {};
  }
}

// Get logo for a brand name (checks custom saved logos first, then defaults)
export function getLogoForBrand(brandName) {
  if (!brandName) return null;
  const key = brandName.trim().toLowerCase();
  
  const customLogos = getCustomBrandLogos();
  if (customLogos[key]) {
    return customLogos[key];
  }
  
  return DEFAULT_BRAND_LOGOS[key] || null;
}

// Save or update custom brand logo in database/localStorage
export function saveCustomBrandLogo(brandName, logoUrl) {
  if (!brandName || !logoUrl) return;
  const key = brandName.trim().toLowerCase();
  
  const customLogos = getCustomBrandLogos();
  customLogos[key] = logoUrl;
  
  try {
    localStorage.setItem(CUSTOM_LOGOS_STORAGE_KEY, JSON.stringify(customLogos));
  } catch (e) {
    console.error('Error saving custom brand logo to localStorage:', e);
  }
}

// Remove custom logo override for a brand (resets to default)
export function resetCustomBrandLogo(brandName) {
  if (!brandName) return;
  const key = brandName.trim().toLowerCase();
  
  const customLogos = getCustomBrandLogos();
  delete customLogos[key];
  
  try {
    localStorage.setItem(CUSTOM_LOGOS_STORAGE_KEY, JSON.stringify(customLogos));
  } catch (e) {
    console.error('Error resetting custom brand logo in localStorage:', e);
  }
}

// Rename custom brand key
export function renameCustomBrand(oldBrandName, newBrandName) {
  if (!oldBrandName || !newBrandName) return;
  const oldKey = oldBrandName.trim().toLowerCase();
  const newKey = newBrandName.trim().toLowerCase();

  const customLogos = getCustomBrandLogos();
  const existingLogo = customLogos[oldKey] || DEFAULT_BRAND_LOGOS[oldKey] || null;

  delete customLogos[oldKey];
  if (existingLogo) {
    customLogos[newKey] = existingLogo;
  }

  try {
    localStorage.setItem(CUSTOM_LOGOS_STORAGE_KEY, JSON.stringify(customLogos));
  } catch (e) {
    console.error('Error renaming custom brand in localStorage:', e);
  }
}

// Delete custom brand entry
export function deleteCustomBrand(brandName) {
  if (!brandName) return;
  const key = brandName.trim().toLowerCase();

  const customLogos = getCustomBrandLogos();
  delete customLogos[key];

  try {
    localStorage.setItem(CUSTOM_LOGOS_STORAGE_KEY, JSON.stringify(customLogos));
  } catch (e) {
    console.error('Error deleting custom brand in localStorage:', e);
  }
}
