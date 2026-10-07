// Utility for testing and automatic dispatch of Email Alerts for Car Expirations (Bollo, Assicurazione, Revisione, Tagliando)
import { getVehicleExpirations } from './notifications';

export function getAdminEmail() {
  const saved = localStorage.getItem('book_auto_pb_admin_email') || '';
  if (saved.toUpperCase().includes('SHIRANTHA11')) {
    localStorage.removeItem('book_auto_pb_admin_email');
    return '';
  }
  return saved.trim();
}

export function setAdminEmail(newEmail) {
  const cleanEmail = (newEmail || '').trim();
  const oldEmail = getAdminEmail();

  // Completely wipe old stored email
  localStorage.removeItem('book_auto_pb_admin_email');

  if (cleanEmail) {
    localStorage.setItem('book_auto_pb_admin_email', cleanEmail);
  }

  // If email address was changed or cleared, reset emailed milestone tracking log
  // so the old alert history is zeroed out and the new email recipient receives fresh alerts
  if (oldEmail !== cleanEmail) {
    localStorage.removeItem('book_auto_pb_emailed_milestones');
  }
}

export function isEmailAlertsEnabled() {
  return localStorage.getItem('book_auto_pb_email_alerts') !== 'false';
}

export function getSavedCars() {
  try {
    const saved = localStorage.getItem('book_auto_pb_cars_v1');
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
}

export function generateEmailReportText(carsInput = []) {
  const cars = (carsInput && carsInput.length > 0) ? carsInput : getSavedCars();
  const alerts = getVehicleExpirations(cars);
  const nowStr = new Date().toLocaleDateString('it-IT', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });

  let text = `==============================================\n`;
  text += `   BOOK AUTO PB — REPORT PROMEMORIA SCADENZE VETTURE\n`;
  text += `   Data Report: ${nowStr}\n`;
  text += `==============================================\n\n`;

  if (!alerts || alerts.length === 0) {
    text += `Tutte le vetture nel garage risultano in regola.\nNessuna scadenza imminente nei prossimi 60 giorni.\n\n`;
  } else {
    text += `Riepilogo Scadenze Attive (${alerts.length} avvisi):\n`;
    text += `----------------------------------------------\n\n`;

    alerts.forEach((alert, index) => {
      text += `${index + 1}. [AVVISO: ${alert.badgeLabel.toUpperCase()}] ${alert.carBrand} ${alert.carModel}\n`;
      text += `   - Scadenza: ${alert.typeLabel} (${alert.dateStr})\n`;
      text += `   - Targa: ${alert.carTarga || 'N/D'}\n`;
      text += `   - Ubicazione Garage: ${alert.rawCar.location || 'Garage Predefinito'}\n\n`;
    });
  }

  text += `----------------------------------------------\n`;
  text += `Inviato automaticamente da Book Auto PB Gestione & Catalogo Vetture.\n`;
  return text;
}

// Send via Mailto (launch system mail app)
export function sendTestEmailMailto(recipientEmail, cars = []) {
  const targetEmail = (recipientEmail || getAdminEmail()).trim();
  if (!targetEmail) {
    alert('Per favore inserisci prima il tuo indirizzo email nelle impostazioni Admin.');
    return false;
  }

  const subject = encodeURIComponent('[Book Auto PB] Promemoria Scadenze Vetture');
  const body = encodeURIComponent(generateEmailReportText(cars));
  
  const mailtoUrl = `mailto:${targetEmail}?subject=${subject}&body=${body}`;
  window.location.href = mailtoUrl;
  return true;
}

// Copy full formatted report text to clipboard
export function copyEmailReportToClipboard(recipientEmail, cars = []) {
  const reportText = generateEmailReportText(cars);
  const targetEmail = recipientEmail || getAdminEmail();
  const fullContent = `Destinatario: ${targetEmail}\nOggetto: [Book Auto PB] Promemoria Scadenze Vetture\n\n${reportText}`;
  
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(fullContent);
    return true;
  } else {
    const textArea = document.createElement('textarea');
    textArea.value = fullContent;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    return true;
  }
}

// EmailJS / Webhook Auto Dispatcher Configuration
export function getEmailJSConfig() {
  return {
    provider: localStorage.getItem('book_auto_pb_email_provider') || 'formspree',
    serviceId: localStorage.getItem('book_auto_pb_emailjs_service_id') || '',
    templateId: localStorage.getItem('book_auto_pb_emailjs_template_id') || '',
    publicKey: localStorage.getItem('book_auto_pb_emailjs_public_key') || '',
    webhookUrl: localStorage.getItem('book_auto_pb_webhook_url') || ''
  };
}

export function saveEmailJSConfig({ provider, serviceId, templateId, publicKey, webhookUrl }) {
  if (provider !== undefined) localStorage.setItem('book_auto_pb_email_provider', provider);
  if (serviceId !== undefined) localStorage.setItem('book_auto_pb_emailjs_service_id', serviceId.trim());
  if (templateId !== undefined) localStorage.setItem('book_auto_pb_emailjs_template_id', templateId.trim());
  if (publicKey !== undefined) localStorage.setItem('book_auto_pb_emailjs_public_key', publicKey.trim());
  if (webhookUrl !== undefined) localStorage.setItem('book_auto_pb_webhook_url', webhookUrl.trim());
}

// Send background REST email via Formspree, EmailJS, or Webhook
export async function sendBackgroundEmailJS(recipientEmail, cars = []) {
  const config = getEmailJSConfig();
  const reportText = generateEmailReportText(cars);
  const targetEmail = (recipientEmail || getAdminEmail()).trim();
  const recipientList = targetEmail ? targetEmail.split(',').map(e => e.trim()).filter(Boolean) : [];

  // 1. FORMSPREE / WEBHOOK (Selected or configured)
  if (config.provider === 'formspree' || (config.webhookUrl && config.provider !== 'emailjs')) {
    if (!config.webhookUrl) {
      return { success: false, reason: 'Inserisci il tuo link Formspree.io nelle impostazioni.' };
    }

    try {
      const res = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          email: targetEmail || 'notifiche@bookautopb.com',
          _subject: '[Book Auto PB] Avviso Scadenze Vetture',
          message: reportText,
          to: recipientList,
          subject: '[Book Auto PB] Avviso Scadenze Vetture'
        })
      });
      if (res.ok) {
        return { success: true, method: 'formspree' };
      } else {
        const errJson = await res.json().catch(() => ({}));
        return { success: false, reason: 'Formspree ha restituito un avviso. Controlla il link formspree.io.' };
      }
    } catch (e) {
      console.warn('Formspree auto email failed:', e);
      return { success: false, reason: 'Errore di connessione a Formspree. Verifica la rete internet.' };
    }
  }

  // 2. EMAILJS (Selected)
  if (config.provider === 'emailjs' || (config.serviceId && config.templateId && config.publicKey)) {
    if (!targetEmail) return { success: false, reason: 'Nessun indirizzo email configurato nelle impostazioni.' };
    if (!config.serviceId || !config.templateId || !config.publicKey) {
      return { success: false, reason: 'Compila Service ID, Template ID e Public Key per usare EmailJS.' };
    }

    let sentCount = 0;
    let lastErr = '';

    for (const singleEmail of recipientList) {
      try {
        const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service_id: config.serviceId,
            template_id: config.templateId,
            user_id: config.publicKey,
            template_params: {
              to_email: singleEmail,
              email: singleEmail,
              to: singleEmail,
              recipient: singleEmail,
              message_body: reportText,
              message: reportText,
              content: reportText,
              subject: '[Book Auto PB] Promemoria Scadenze Vetture'
            }
          })
        });

        if (res.ok) {
          sentCount++;
        } else {
          const errText = await res.text();
          console.warn(`EmailJS send failed for ${singleEmail}:`, errText);
          lastErr = errText;
        }
      } catch (e) {
        console.warn(`EmailJS network error for ${singleEmail}:`, e);
        lastErr = e?.message || 'Errore di connessione';
      }
    }

    if (sentCount > 0) {
      return { success: true, method: 'emailjs', sentCount, total: recipientList.length };
    } else {
      let friendlyReason = lastErr || 'Verifica Service ID, Template ID e Public Key';
      if (lastErr.includes('template ID not found') || lastErr.includes('Template ID')) {
        friendlyReason = 'Template ID errato o non trovato su EmailJS. Controlla il codice Template ID nelle impostazioni Admin.';
      } else if (lastErr.includes('service ID not found') || lastErr.includes('Service ID')) {
        friendlyReason = 'Service ID errato o non trovato su EmailJS. Controlla il codice Service ID nelle impostazioni Admin.';
      } else if (lastErr.includes('user ID') || lastErr.includes('public key')) {
        friendlyReason = 'Public Key (User ID) errata su EmailJS. Controlla la Public Key nelle impostazioni Admin.';
      }
      return { success: false, reason: `Errore EmailJS: ${friendlyReason}` };
    }
  }

  // 3. Fallback: Mailto App
  return { success: false, reason: 'Seleziona un metodo di invio nelle impostazioni.' };
}

/**
 * 3 Discrete Milestone Email Trigger System:
 * - Milestone 1: 60 giorni prima (2 mesi)
 * - Milestone 2: 30 giorni prima (1 mese)
 * - Milestone 3: 7 giorni prima (1 settimana) & Scaduto
 * 
 * Tracks emailed milestones in localStorage so that each alert triggers exactly 1 email
 * per milestone, avoiding daily duplicate spam while guaranteeing the operator gets notified 3 times per deadline!
 */
export function checkAndTriggerAutomaticEmailAlerts(cars = [], force = false) {
  if (!isEmailAlertsEnabled()) return null;
  const targetEmail = getAdminEmail();
  if (!targetEmail) return null;

  const alerts = getVehicleExpirations(cars);
  if (!alerts || alerts.length === 0) return null;

  // Load previously emailed milestone keys from localStorage
  let emailedMilestones = {};
  try {
    const saved = localStorage.getItem('book_auto_pb_emailed_milestones');
    if (saved) emailedMilestones = JSON.parse(saved);
  } catch (e) {
    emailedMilestones = {};
  }

  // Find alerts that have crossed a NEW milestone not yet emailed
  const newMilestoneAlerts = alerts.filter(alert => {
    // Unique key for this specific vehicle + field + alert level + date
    const milestoneKey = `${alert.id}_${alert.alertLevel}_${alert.dateStr}`;
    return force || !emailedMilestones[milestoneKey];
  });

  if (newMilestoneAlerts.length === 0) {
    return { alreadySentMilestone: true, alerts };
  }

  // Mark new milestones as emailed
  newMilestoneAlerts.forEach(alert => {
    const milestoneKey = `${alert.id}_${alert.alertLevel}_${alert.dateStr}`;
    emailedMilestones[milestoneKey] = new Date().toISOString();
  });
  localStorage.setItem('book_auto_pb_emailed_milestones', JSON.stringify(emailedMilestones));

  // Trigger Browser Desktop Notification if allowed
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification('🚨 Book Auto PB — Avviso Scadenza Vettura!', {
      body: `Nuova scadenza rilevata (${newMilestoneAlerts[0].carBrand} ${newMilestoneAlerts[0].carModel} - ${newMilestoneAlerts[0].typeLabel}). Email inviata a ${targetEmail}.`,
      icon: '/favicon.ico'
    });
  } else if (typeof Notification !== 'undefined' && Notification.permission !== 'denied') {
    Notification.requestPermission();
  }

  // Try background REST email sending
  sendBackgroundEmailJS(targetEmail, cars).then(res => {
    if (!res.success) {
      console.log('Automated background email prompt fallback required.');
    }
  });

  return { autoTriggered: true, alerts: newMilestoneAlerts, targetEmail };
}
