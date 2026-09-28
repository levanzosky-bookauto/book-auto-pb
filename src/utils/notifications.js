// Helper utility to parse date strings and calculate expiration alerts (2 months, 1 month, 1 week, expired)

export function parseDateString(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const cleaned = dateStr.trim();
  if (!cleaned) return null;

  // Pattern 1: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = cleaned.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }

  // Pattern 2: YYYY-MM-DD
  const ymdMatch = cleaned.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }

  // Fallback to standard Date parse
  const parsed = new Date(cleaned);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function calculateDaysRemaining(targetDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);

  const diffMs = target.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Returns all active expiration alerts across cars array
 * Thresholds:
 * - Expired: days < 0
 * - 1 Week Alert: 0 <= days <= 7
 * - 1 Month Alert: 7 < days <= 30
 * - 2 Month Alert: 30 < days <= 60
 */
export function getVehicleExpirations(cars = []) {
  const alerts = [];

  const fieldsConfig = [
    { key: 'scadenzaBollo', label: 'Bollo Auto', iconType: 'bollo', desc: 'Tassa automobilistica' },
    { key: 'scadenzaAssicurazione', label: 'Assicurazione RC', iconType: 'insurance', desc: 'Polizza assicurativa veicolo' },
    { key: 'scadenzaRevisione', label: 'Revisione Ministeriale', iconType: 'revision', desc: 'Controllo d\'ispezione statale' },
    { key: 'prossimoTagliandoData', label: 'Prossimo Tagliando', iconType: 'tagliando', desc: 'Manutenzione programmata' }
  ];

  cars.forEach(car => {
    fieldsConfig.forEach(field => {
      const rawDateStr = car[field.key];
      if (!rawDateStr) return;

      const dateObj = parseDateString(rawDateStr);
      if (!dateObj) return;

      const days = calculateDaysRemaining(dateObj);

      // Only notify if within 60 days (2 months) or already expired
      if (days <= 60) {
        let alertLevel = 'info'; // 'expired' | 'urgent' | 'warning' | 'info'
        let badgeLabel = '';
        let priority = 4;

        if (days < 0) {
          alertLevel = 'expired';
          badgeLabel = `SCADUTO (${Math.abs(days)} gg fa)`;
          priority = 1;
        } else if (days <= 7) {
          alertLevel = 'urgent';
          badgeLabel = `1 SETTIMANA (${days} gg rimasti)`;
          priority = 2;
        } else if (days <= 30) {
          alertLevel = 'warning';
          badgeLabel = `1 MESE (${days} gg rimasti)`;
          priority = 3;
        } else {
          alertLevel = 'info';
          badgeLabel = `2 MESI (${days} gg rimasti)`;
          priority = 4;
        }

        alerts.push({
          id: `${car.id}_${field.key}`,
          carId: car.id,
          carBrand: car.brand,
          carModel: car.model,
          carTarga: car.targa || '',
          carImage: car.mainPhoto || car.pageImage || (car.images && car.images[0]) || '',
          carLogo: car.logoImg,
          typeKey: field.key,
          typeLabel: field.label,
          typeDesc: field.desc,
          iconType: field.iconType,
          dateStr: rawDateStr,
          daysRemaining: days,
          alertLevel,
          badgeLabel,
          priority,
          rawCar: car
        });
      }
    });
  });

  // Sort by priority (most urgent / expired first)
  return alerts.sort((a, b) => a.priority - b.priority || a.daysRemaining - b.daysRemaining);
}
