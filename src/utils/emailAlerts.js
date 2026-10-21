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

import { fetchEmailConfigFromSupabase, syncEmailConfigToSupabase } from './supabase';

// Normalize any Formspree URL or raw ID into a full clean URL
export function normalizeFormspreeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let trimmed = rawUrl.trim();
  if (!trimmed) return '';

  // If user pasted just the ID e.g. "xaeqeqzl"
  if (/^[a-zA-Z0-9_-]{6,16}$/.test(trimmed)) {
    return `https://formspree.io/f/${trimmed}`;
  }

  // If user pasted without protocol e.g. "formspree.io/f/xaeqeqzl"
  if (trimmed.startsWith('formspree.io/f/')) {
    return `https://${trimmed}`;
  }

  // Remove trailing slashes
  trimmed = trimmed.replace(/\/+$/, '');

  return trimmed;
}

// Validate whether a URL is a valid Formspree endpoint
export function validateFormspreeUrl(url) {
  if (!url) return { valid: false, reason: 'Nessun link Formspree inserito nelle impostazioni.' };
  const clean = normalizeFormspreeUrl(url);

  // If user just typed https://formspree.io without /f/ID
  if (clean === 'https://formspree.io' || clean === 'https://formspree.io/') {
    return { 
      valid: false, 
      reason: 'Hai inserito solo "https://formspree.io". Devi inserire il link completo con il codice del tuo form (es. https://formspree.io/f/xxxxxx).' 
    };
  }

  if (!/^https:\/\/formspree\.io\/f\/[a-zA-Z0-9_-]+$/i.test(clean)) {
    return { 
      valid: false, 
      reason: 'Il link deve avere il formato https://formspree.io/f/codice-del-tuo-modulo' 
    };
  }

  return { valid: true, url: clean };
}

export const DEFAULT_FORMSPREE_URL = 'https://formspree.io/f/xaeqeqzl';

// EmailJS / Webhook Auto Dispatcher Configuration
export function getEmailJSConfig() {
  const rawUrl = localStorage.getItem('book_auto_pb_webhook_url') || DEFAULT_FORMSPREE_URL;
  return {
    provider: localStorage.getItem('book_auto_pb_email_provider') || 'formspree',
    serviceId: localStorage.getItem('book_auto_pb_emailjs_service_id') || '',
    templateId: localStorage.getItem('book_auto_pb_emailjs_template_id') || '',
    publicKey: localStorage.getItem('book_auto_pb_emailjs_public_key') || '',
    webhookUrl: normalizeFormspreeUrl(rawUrl) || DEFAULT_FORMSPREE_URL
  };
}

export function saveEmailJSConfig({ provider, serviceId, templateId, publicKey, webhookUrl }) {
  if (provider !== undefined) localStorage.setItem('book_auto_pb_email_provider', provider);
  if (serviceId !== undefined) localStorage.setItem('book_auto_pb_emailjs_service_id', serviceId.trim());
  if (templateId !== undefined) localStorage.setItem('book_auto_pb_emailjs_template_id', templateId.trim());
  if (publicKey !== undefined) localStorage.setItem('book_auto_pb_emailjs_public_key', publicKey.trim());
  if (webhookUrl !== undefined) localStorage.setItem('book_auto_pb_webhook_url', normalizeFormspreeUrl(webhookUrl));
}

// Sync Email Config with Supabase Cloud so all devices share the same notification settings
export async function syncEmailConfigWithCloud() {
  try {
    const cloud = await fetchEmailConfigFromSupabase();
    if (cloud && typeof cloud === 'object') {
      if (cloud.provider) localStorage.setItem('book_auto_pb_email_provider', cloud.provider);
      if (cloud.adminEmail) localStorage.setItem('book_auto_pb_admin_email', cloud.adminEmail);
      if (cloud.webhookUrl) localStorage.setItem('book_auto_pb_webhook_url', normalizeFormspreeUrl(cloud.webhookUrl));
      if (cloud.emailAlertsEnabled !== undefined) {
        localStorage.setItem('book_auto_pb_email_alerts', String(cloud.emailAlertsEnabled));
      }
      if (cloud.serviceId) localStorage.setItem('book_auto_pb_emailjs_service_id', cloud.serviceId);
      if (cloud.templateId) localStorage.setItem('book_auto_pb_emailjs_template_id', cloud.templateId);
      if (cloud.publicKey) localStorage.setItem('book_auto_pb_emailjs_public_key', cloud.publicKey);
      return cloud;
    }
  } catch (e) {
    console.error('Error syncing email config with cloud:', e);
  }
  return null;
}

// Save all email settings to both localStorage and Supabase Cloud
export async function saveAllEmailSettingsToCloud({ provider, adminEmail, emailAlertsEnabled, webhookUrl, serviceId, templateId, publicKey }) {
  const cleanUrl = normalizeFormspreeUrl(webhookUrl || '');
  const cleanEmail = (adminEmail || '').trim();

  // 1. Save to local storage
  if (provider !== undefined) localStorage.setItem('book_auto_pb_email_provider', provider);
  if (cleanEmail !== undefined) localStorage.setItem('book_auto_pb_admin_email', cleanEmail);
  if (emailAlertsEnabled !== undefined) localStorage.setItem('book_auto_pb_email_alerts', String(emailAlertsEnabled));
  if (webhookUrl !== undefined) localStorage.setItem('book_auto_pb_webhook_url', cleanUrl);
  if (serviceId !== undefined) localStorage.setItem('book_auto_pb_emailjs_service_id', (serviceId || '').trim());
  if (templateId !== undefined) localStorage.setItem('book_auto_pb_emailjs_template_id', (templateId || '').trim());
  if (publicKey !== undefined) localStorage.setItem('book_auto_pb_emailjs_public_key', (publicKey || '').trim());

  // 2. Sync to Supabase Cloud
  const payload = {
    provider: provider || 'formspree',
    adminEmail: cleanEmail,
    emailAlertsEnabled: Boolean(emailAlertsEnabled),
    webhookUrl: cleanUrl,
    serviceId: (serviceId || '').trim(),
    templateId: (templateId || '').trim(),
    publicKey: (publicKey || '').trim(),
    updatedAt: new Date().toISOString()
  };
  await syncEmailConfigToSupabase(payload);
  return payload;
}

// Send background REST email via Formspree, EmailJS, or Webhook
export async function sendBackgroundEmailJS(recipientEmail, cars = [], forcedProvider = null, configOverrides = {}) {
  const savedConfig = getEmailJSConfig();
  const config = {
    ...savedConfig,
    ...configOverrides,
    provider: forcedProvider || configOverrides?.provider || savedConfig.provider
  };
  const reportText = generateEmailReportText(cars);
  const targetEmail = (recipientEmail || getAdminEmail()).trim();
  const recipientList = targetEmail ? targetEmail.split(',').map(e => e.trim()).filter(Boolean) : [];

  // 0. MAILTO (System Native Mail Client)
  if (config.provider === 'mailto') {
    if (!targetEmail) return { success: false, reason: 'Nessun indirizzo email configurato per la prova.' };
    const ok = sendTestEmailMailto(targetEmail, cars);
    return { success: ok, method: 'mailto' };
  }

  // 1. FORMSPREE / WEBHOOK
  if (config.provider === 'formspree') {
    const urlToUse = config.webhookUrl || DEFAULT_FORMSPREE_URL;
    const validation = validateFormspreeUrl(urlToUse);
    if (!validation.valid) {
      return { success: false, reason: validation.reason };
    }

    try {
      const res = await fetch(validation.url, {
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
        let reason = 'Formspree ha restituito un avviso.';
        if (errJson.error) {
          reason = `Formspree: ${errJson.error}`;
        } else if (Array.isArray(errJson.errors) && errJson.errors.length > 0) {
          reason = `Formspree: ${errJson.errors.map(e => e.message).join(', ')}`;
        }
        return { success: false, reason };
      }
    } catch (e) {
      console.warn('Formspree auto email failed:', e);
      return { success: false, reason: 'Errore di connessione a Formspree. Verifica la rete internet.' };
    }
  }

  // 2. EMAILJS
  if (config.provider === 'emailjs') {
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
  const config = getEmailJSConfig();
  const targetEmail = getAdminEmail();

  // If provider is Formspree, verify the endpoint is valid (targetEmail is optional since Formspree routes to form owner)
  if (config.provider === 'formspree') {
    const urlToUse = config.webhookUrl || DEFAULT_FORMSPREE_URL;
    const validation = validateFormspreeUrl(urlToUse);
    if (!validation.valid) return null;
  } else if (!targetEmail) {
    // For other providers (EmailJS, Mailto), targetEmail is strictly needed
    return null;
  }

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
    const destLabel = targetEmail ? ` a ${targetEmail}` : ' alla tua casella';
    new Notification('🚨 Book Auto PB — Avviso Scadenza Vettura!', {
      body: `Nuova scadenza rilevata (${newMilestoneAlerts[0].carBrand} ${newMilestoneAlerts[0].carModel} - ${newMilestoneAlerts[0].typeLabel}). Email inviata${destLabel}.`,
      icon: '/favicon.ico'
    });
  } else if (typeof Notification !== 'undefined' && Notification.permission !== 'denied') {
    Notification.requestPermission();
  }

  // Try background REST email sending
  sendBackgroundEmailJS(targetEmail, cars).then(res => {
    if (!res.success) {
      console.log('Automated background email prompt fallback required:', res?.reason);
    }
  });

  return { autoTriggered: true, alerts: newMilestoneAlerts, targetEmail };
}

/**
 * Send a 6-digit verification code OTP for credential recovery (Option 2)
 */
export async function sendPasswordRecoveryEmail(recipientEmail, userName, otpCode, loginUsername = '') {
  const targetEmail = (recipientEmail || getAdminEmail()).trim();
  if (!targetEmail) {
    return { success: false, reason: 'Nessun indirizzo email configurato per questo account.' };
  }

  const savedConfig = getEmailJSConfig();
  const subject = `[Book Auto PB] Codice di Recupero Credenziali: ${otpCode}`;
  const messageBody = `Ciao ${userName || 'Utente'},\n\n` +
    `Hai richiesto il recupero delle credenziali per l'accesso a Book Auto PB.\n\n` +
    (loginUsername ? `👤 Il tuo Nome Utente registrato è: ${loginUsername}\n\n` : '') +
    `👉 IL TUO CODICE DI SICUREZZA TEMPORANEO È:\n` +
    `   ${otpCode}\n\n` +
    `Inserisci questo codice a 6 cifre nella finestra di recupero per reimpostare la tua password.\n` +
    `Questo codice è valido per 15 minuti.\n\n` +
    `Se non sei stato tu a richiedere il recupero, puoi ignorare questo messaggio: le tue credenziali attuali rimarranno invariate.\n\n` +
    `Distinti saluti,\nBook Auto PB Management`;

  // 1. FORMSPREE
  if (savedConfig.provider === 'formspree') {
    const urlToUse = savedConfig.webhookUrl || DEFAULT_FORMSPREE_URL;
    const validation = validateFormspreeUrl(urlToUse);
    if (validation.valid) {
      try {
        const res = await fetch(validation.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            email: targetEmail,
            to: targetEmail,
            _subject: subject,
            subject: subject,
            message: messageBody,
            otpCode: otpCode,
            username: loginUsername
          })
        });
        if (res.ok) {
          return { success: true, method: 'formspree', targetEmail };
        }
      } catch (e) {
        console.warn('Formspree recovery email error:', e);
      }
    }
  }

  // 2. EMAILJS
  if (savedConfig.provider === 'emailjs' && savedConfig.serviceId && savedConfig.templateId && savedConfig.publicKey) {
    try {
      const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: savedConfig.serviceId,
          template_id: savedConfig.templateId,
          user_id: savedConfig.publicKey,
          template_params: {
            to_email: targetEmail,
            email: targetEmail,
            to: targetEmail,
            recipient: targetEmail,
            message_body: messageBody,
            message: messageBody,
            content: messageBody,
            subject: subject
          }
        })
      });
      if (res.ok) {
        return { success: true, method: 'emailjs', targetEmail };
      }
    } catch (e) {
      console.warn('EmailJS recovery email error:', e);
    }
  }

  // 3. Fallback: Mailto
  try {
    const mailtoUrl = `mailto:${encodeURIComponent(targetEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(messageBody)}`;
    window.location.href = mailtoUrl;
    return { success: true, method: 'mailto', targetEmail };
  } catch (e) {
    return { success: false, reason: 'Impossibile inviare email automatica.' };
  }
}
