import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  Lock, 
  Mail, 
  Plus, 
  Download, 
  Shield, 
  CheckCircle2, 
  Car,
  KeyRound,
  FileSpreadsheet,
  Settings,
  Users,
  UserPlus,
  Trash2,
  Edit3,
  ImageIcon,
  Upload,
  MapPin,
  Sparkles,
  Bell,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  getUsers, 
  saveUsers, 
  USER_ROLES, 
  getBackgroundImages, 
  saveBackgroundImages,
  getCurrentUser,
  setCurrentUser
} from '../utils/auth';
import { getLocations, addLocation, removeLocation } from '../utils/locations';
import { 
  getAdminEmail,
  setAdminEmail,
  sendTestEmailMailto, 
  copyEmailReportToClipboard, 
  generateEmailReportText,
  getEmailJSConfig,
  saveEmailJSConfig,
  sendBackgroundEmailJS,
  normalizeFormspreeUrl,
  validateFormspreeUrl,
  saveAllEmailSettingsToCloud
} from '../utils/emailAlerts';
import { getClientPermissions, saveClientPermissions, DEFAULT_CLIENT_PERMISSIONS } from '../utils/permissions';
import { syncPermissionsToSupabase } from '../utils/supabase';
import { Send, Copy, FileText } from 'lucide-react';

export default function AdminModal({ 
  cars = [],
  onClose, 
  onOpenAddModal, 
  onOpenBrandLogosModal, 
  onOpenBackupModal, 
  onResetData,
  showSideGlow,
  setShowSideGlow,
  showExpirationBar,
  setShowExpirationBar,
  clientPermissions,
  onPermissionsUpdated
}) {
  const [activeTab, setActiveTab] = useState('tools'); // 'tools' | 'permissions' | 'users' | 'backgrounds' | 'locations'

  // Client Permissions State
  const [permissions, setPermissions] = useState(() => clientPermissions || getClientPermissions());
  const [permsMsg, setPermsMsg] = useState('');

  const handleTogglePerm = (key, val) => {
    const updated = { ...permissions, [key]: val };
    setPermissions(updated);
    saveClientPermissions(updated);
    syncPermissionsToSupabase(updated);
    if (onPermissionsUpdated) onPermissionsUpdated(updated);
    setPermsMsg('Impostazione visibilità aggiornata e sincronizzata nel Cloud!');
    setTimeout(() => setPermsMsg(''), 2500);
  };

  const handleSavePerms = () => {
    saveClientPermissions(permissions);
    syncPermissionsToSupabase(permissions);
    if (onPermissionsUpdated) onPermissionsUpdated(permissions);
    setPermsMsg('✅ Tutte le preferenze di visibilità sono state salvate e sincronizzate nel Cloud Supabase per tutti i visitatori!');
    setTimeout(() => setPermsMsg(''), 4000);
  };

  const handleResetPerms = () => {
    setPermissions(DEFAULT_CLIENT_PERMISSIONS);
    saveClientPermissions(DEFAULT_CLIENT_PERMISSIONS);
    syncPermissionsToSupabase(DEFAULT_CLIENT_PERMISSIONS);
    if (onPermissionsUpdated) onPermissionsUpdated(DEFAULT_CLIENT_PERMISSIONS);
    setPermsMsg('Valori predefiniti ripristinati e sincronizzati nel Cloud!');
    setTimeout(() => setPermsMsg(''), 3000);
  };

  // Users State
  const [users, setUsersList] = useState([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('editor');
  const [userMsg, setUserMsg] = useState('');

  // Edit User State
  const [editingUserId, setEditingUserId] = useState(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('editor');

  const handleStartEditUser = (user) => {
    setEditingUserId(user.id);
    setEditUsername(user.username);
    setEditPassword(user.password);
    setEditName(user.name);
    setEditRole(user.role);
  };

  const handleSaveEditUser = (userId) => {
    setUserMsg('');
    if (!editUsername.trim() || !editPassword.trim() || !editName.trim()) {
      setUserMsg('Completa tutti i campi prima di salvare le modifiche.');
      return;
    }

    const cleanUsername = editUsername.trim().toLowerCase();
    const conflict = users.find(u => u.id !== userId && u.username.toLowerCase() === cleanUsername);
    if (conflict) {
      setUserMsg('Errore: Questo nome utente è già utilizzato da un altro account!');
      return;
    }

    const updated = users.map(u => {
      if (u.id === userId) {
        const updatedUser = {
          ...u,
          username: cleanUsername,
          password: editPassword.trim(),
          name: editName.trim(),
          role: editRole
        };

        const activeUser = getCurrentUser();
        if (activeUser && (activeUser.id === u.id || activeUser.username.toLowerCase() === u.username.toLowerCase())) {
          setCurrentUser(updatedUser);
        }

        return updatedUser;
      }
      return u;
    });

    setUsersList(updated);
    saveUsers(updated);
    setEditingUserId(null);
    setUserMsg('Credenziali e dati utente aggiornati con successo!');
    setTimeout(() => setUserMsg(''), 3000);
  };

  // Backgrounds State
  const [backgrounds, setBackgroundsList] = useState([]);
  const [newBgUrl, setNewBgUrl] = useState('');
  const [bgMsg, setBgMsg] = useState('');

  // Locations State
  const [locationsList, setLocationsList] = useState([]);
  const [newLocationName, setNewLocationName] = useState('');
  const [locationMsg, setLocationMsg] = useState('');

  // Email Settings State
  const [adminEmail, setAdminEmailState] = useState(() => getAdminEmail());
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(() => {
    return localStorage.getItem('book_auto_pb_email_alerts') !== 'false';
  });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [testEmailMsg, setTestEmailMsg] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [showPreviewReport, setShowPreviewReport] = useState(false);

  // Advanced Background Auto-Send EmailJS & Webhook State
  const [emailProvider, setEmailProvider] = useState(() => {
    try { return getEmailJSConfig()?.provider || 'formspree'; } catch (e) { return 'formspree'; }
  });
  const [emailjsServiceId, setEmailjsServiceId] = useState(() => {
    try { return getEmailJSConfig()?.serviceId || ''; } catch (e) { return ''; }
  });
  const [emailjsTemplateId, setEmailjsTemplateId] = useState(() => {
    try { return getEmailJSConfig()?.templateId || ''; } catch (e) { return ''; }
  });
  const [emailjsPublicKey, setEmailjsPublicKey] = useState(() => {
    try { return getEmailJSConfig()?.publicKey || ''; } catch (e) { return ''; }
  });
  const [webhookUrl, setWebhookUrl] = useState(() => {
    try { return getEmailJSConfig()?.webhookUrl || ''; } catch (e) { return ''; }
  });
  const [showAdvancedEmailJS, setShowAdvancedEmailJS] = useState(false);

  const handleRunTestEmail = async (providerOverride = null) => {
    const targetProvider = providerOverride || emailProvider;
    setIsSendingTest(true);
    setTestEmailMsg('Invio email di prova in corso...');

    if (targetProvider === 'mailto') {
      setIsSendingTest(false);
      const ok = sendTestEmailMailto(adminEmail, cars);
      if (ok) {
        setTestEmailMsg('✉️ Apertura App Mail di sistema in corso con il report scadenze...');
      } else {
        setTestEmailMsg('⚠️ Inserisci prima un indirizzo email destinatario.');
      }
      setTimeout(() => setTestEmailMsg(''), 6000);
      return;
    }

    const configOverrides = {
      provider: targetProvider,
      webhookUrl: webhookUrl,
      serviceId: emailjsServiceId,
      templateId: emailjsTemplateId,
      publicKey: emailjsPublicKey
    };

    const res = await sendBackgroundEmailJS(adminEmail, cars, targetProvider, configOverrides);
    setIsSendingTest(false);

    if (res && res.success) {
      const providerLabel = targetProvider === 'formspree' ? 'Formspree.io' : 'EmailJS';
      setTestEmailMsg(`🟢 Prova riuscita! Email inviata con successo via ${providerLabel} a: ${adminEmail || 'tua casella'}. Controlla la posta!`);
    } else {
      setTestEmailMsg(`⚠️ ${res?.reason || 'Impossibile inviare email. Verifica i dati inseriti.'}`);
    }
    setTimeout(() => setTestEmailMsg(''), 8000);
  };

  useEffect(() => {
    setUsersList(getUsers());
    setBackgroundsList(getBackgroundImages());
    setLocationsList(getLocations());
  }, []);

  // Add Location
  const handleAddLocationSubmit = (e) => {
    e.preventDefault();
    setLocationMsg('');
    if (!newLocationName.trim()) return;

    const updated = addLocation(newLocationName.trim());
    setLocationsList(updated);
    setNewLocationName('');
    setLocationMsg('Nuova collocazione / garage aggiunta con successo!');
    setTimeout(() => setLocationMsg(''), 3000);
  };

  // Remove Location
  const handleDeleteLocation = (locName) => {
    if (window.confirm(`Sei sicuro di voler rimuovere "${locName}" dalle opzioni delle ubicazioni?`)) {
      const updated = removeLocation(locName);
      setLocationsList(updated);
    }
  };

  // Add User
  const handleAddUser = (e) => {
    e.preventDefault();
    setUserMsg('');

    if (!newUsername.trim() || !newPassword.trim() || !newName.trim()) {
      setUserMsg('Completa tutti i campi per creare il nuovo utente.');
      return;
    }

    const cleanUsername = newUsername.trim().toLowerCase();
    if (users.some(u => u.username.toLowerCase() === cleanUsername)) {
      setUserMsg('Errore: Questo nome utente esiste già!');
      return;
    }

    const newUser = {
      id: `user_${Date.now()}`,
      username: cleanUsername,
      password: newPassword.trim(),
      name: newName.trim(),
      role: newRole,
      createdAt: new Date().toISOString()
    };

    const updated = [...users, newUser];
    setUsersList(updated);
    saveUsers(updated);

    setNewUsername('');
    setNewPassword('');
    setNewName('');
    setNewRole('editor');
    setUserMsg('Nuovo utente aggiunto con successo!');
    setTimeout(() => setUserMsg(''), 3000);
  };

  // Delete User
  const handleDeleteUser = (userId) => {
    if (users.length <= 1) {
      alert('Non puoi eliminare l\'unico utente rimasto!');
      return;
    }
    const target = users.find(u => u.id === userId);
    if (target && target.username.toLowerCase() === 'shirantha') {
      alert('Impossibile eliminare l\'utente principale Shirantha (Super Admin)!');
      return;
    }

    if (window.confirm('Sei sicuro di voler eliminare questo utente?')) {
      const updated = users.filter(u => u.id !== userId);
      setUsersList(updated);
      saveUsers(updated);
    }
  };

  // Add Background Image
  const handleAddBackground = (e) => {
    e.preventDefault();
    if (!newBgUrl.trim()) return;

    const updated = [...backgrounds, newBgUrl.trim()];
    setBackgroundsList(updated);
    saveBackgroundImages(updated);
    setNewBgUrl('');
    setBgMsg('Nuova foto sfondo aggiunta!');
    setTimeout(() => setBgMsg(''), 3000);
  };

  // Upload File Background Image
  const handleBgFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const base64Url = uploadEvent.target.result;
        const updated = [...backgrounds, base64Url];
        setBackgroundsList(updated);
        saveBackgroundImages(updated);
        setBgMsg('Foto caricata e impostata negli sfondi!');
        setTimeout(() => setBgMsg(''), 3000);
      };
      reader.readAsDataURL(file);
    }
  };

  // Delete Background Image
  const handleDeleteBackground = (index) => {
    if (backgrounds.length <= 1) {
      alert('Devi mantenere almeno una foto di sfondo!');
      return;
    }
    const updated = backgrounds.filter((_, i) => i !== index);
    setBackgroundsList(updated);
    saveBackgroundImages(updated);
  };

  // Save Email Settings across Local & Supabase Cloud
  const handleSaveEmailSettings = async (e, forcedProvider = null) => {
    if (e && e.preventDefault) e.preventDefault();
    const targetProvider = forcedProvider || emailProvider;
    await saveAllEmailSettingsToCloud({
      provider: targetProvider,
      adminEmail: adminEmail,
      emailAlertsEnabled: emailAlertsEnabled,
      webhookUrl: webhookUrl,
      serviceId: emailjsServiceId,
      templateId: emailjsTemplateId,
      publicKey: emailjsPublicKey
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div 
        className="glass-panel w-full max-w-2xl rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-white/10 my-auto flex flex-col max-h-[96vh] sm:max-h-[90vh] bg-slate-900 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/10 bg-slate-900/90 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 sm:p-2.5 bg-amber-500/10 text-amber-400 rounded-xl sm:rounded-2xl border border-amber-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-heading text-white">
                Pannello Amministrazione & Riservato
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Gestione illimitata utenti, sfondi login, backup e notifiche
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-400 rounded-xl border border-slate-700 transition-all shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 5-Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/80 text-xs font-bold shrink-0 overflow-x-auto no-scrollbar flex-nowrap">
          <button
            type="button"
            onClick={() => setActiveTab('tools')}
            className={`shrink-0 whitespace-nowrap sm:flex-1 py-3 px-3.5 sm:px-4 flex items-center justify-center space-x-2 border-b-2 transition-all ${
              activeTab === 'tools'
                ? 'border-amber-400 text-amber-400 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-4 h-4 shrink-0" />
            <span>Strumenti & Email</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('permissions')}
            className={`shrink-0 whitespace-nowrap sm:flex-1 py-3 px-3.5 sm:px-4 flex items-center justify-center space-x-2 border-b-2 transition-all ${
              activeTab === 'permissions'
                ? 'border-amber-400 text-amber-400 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-4 h-4 shrink-0 text-cyan-400" />
            <span>Permessi Clienti</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`shrink-0 whitespace-nowrap sm:flex-1 py-3 px-3.5 sm:px-4 flex items-center justify-center space-x-2 border-b-2 transition-all ${
              activeTab === 'users'
                ? 'border-amber-400 text-amber-400 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Gestione Utenti ({users.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('backgrounds')}
            className={`shrink-0 whitespace-nowrap sm:flex-1 py-3 px-3.5 sm:px-4 flex items-center justify-center space-x-2 border-b-2 transition-all ${
              activeTab === 'backgrounds'
                ? 'border-amber-400 text-amber-400 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ImageIcon className="w-4 h-4 shrink-0" />
            <span>Sfondi ({backgrounds.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('locations')}
            className={`shrink-0 whitespace-nowrap sm:flex-1 py-3 px-3.5 sm:px-4 flex items-center justify-center space-x-2 border-b-2 transition-all ${
              activeTab === 'locations'
                ? 'border-amber-400 text-amber-400 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MapPin className="w-4 h-4 shrink-0" />
            <span>Ubicazioni ({locationsList.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6 flex-1 text-xs">
          
          {/* TAB 1: STRUMENTI & NOTIFICHE EMAIL */}
          {activeTab === 'tools' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* Quick Admin Actions */}
              <div className="space-y-3">
                <h4 className="font-bold text-amber-400 uppercase tracking-wider text-[11px] flex items-center">
                  <Settings className="w-3.5 h-3.5 mr-1.5" />
                  <span>Strumenti Amministrativi Veloci</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    onClick={() => { onClose(); onOpenAddModal(); }}
                    className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 rounded-xl text-left flex items-center space-x-3 transition-all"
                  >
                    <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                      <Plus className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block font-bold text-slate-100">Nuova Vettura</span>
                      <span className="text-[10px] text-slate-400">Inserisci auto con foto e dati</span>
                    </div>
                  </button>

                  <button
                    onClick={() => { onClose(); onOpenBrandLogosModal(); }}
                    className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 rounded-xl text-left flex items-center space-x-3 transition-all"
                  >
                    <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block font-bold text-slate-100">Loghi Marchi</span>
                      <span className="text-[10px] text-slate-400">Gestisci i loghi salvati</span>
                    </div>
                  </button>

                  <button
                    onClick={() => { onClose(); onOpenBackupModal(); }}
                    className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 rounded-xl text-left flex items-center space-x-3 transition-all"
                  >
                    <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                      <Download className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block font-bold text-slate-100">Backup & Esporta</span>
                      <span className="text-[10px] text-slate-400">Salva o ripristina file JSON</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Email Notifications Setup & Discrete Test Section */}
              <div className="bg-slate-950/95 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-100 text-sm">Configurazione Notifiche & Invio Email</h4>
                      <p className="text-slate-400 text-[11px]">
                        Scegli una delle 3 soluzioni: in basso si aprirà solo la configurazione e il pulsante di prova dedicato.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3 Metodi di Invio Selector Cards (Cerchiati dall'utente) */}
                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-bold text-xs uppercase tracking-wider">
                    Metodo di Invio Desiderato (Clicca per aprire la categoria):
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Card 1: Formspree.io */}
                    <button
                      type="button"
                      onClick={() => {
                        setEmailProvider('formspree');
                        setTestEmailMsg('');
                      }}
                      className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                        emailProvider === 'formspree'
                          ? 'bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-400 text-amber-300 shadow-lg shadow-amber-500/10 ring-2 ring-amber-400/50'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-850'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <div className="flex items-center space-x-2">
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            emailProvider === 'formspree' ? 'border-amber-400 bg-amber-400' : 'border-slate-600'
                          }`}>
                            {emailProvider === 'formspree' && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                          </div>
                          <span className="font-bold text-xs text-slate-100">Formspree.io</span>
                        </div>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Consigliato
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 pl-6">
                        1 Solo Link endpoint • Invio automatico silenzioso
                      </p>
                    </button>

                    {/* Card 2: EmailJS */}
                    <button
                      type="button"
                      onClick={() => {
                        setEmailProvider('emailjs');
                        setTestEmailMsg('');
                      }}
                      className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                        emailProvider === 'emailjs'
                          ? 'bg-gradient-to-br from-indigo-500/20 to-indigo-600/10 border-indigo-400 text-indigo-300 shadow-lg shadow-indigo-500/10 ring-2 ring-indigo-400/50'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-850'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <div className="flex items-center space-x-2">
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            emailProvider === 'emailjs' ? 'border-indigo-400 bg-indigo-400' : 'border-slate-600'
                          }`}>
                            {emailProvider === 'emailjs' && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                          </div>
                          <span className="font-bold text-xs text-slate-100">EmailJS</span>
                        </div>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          API Key
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 pl-6">
                        3 Chiavi API avanzate • Invio REST diretto
                      </p>
                    </button>

                    {/* Card 3: App Mail */}
                    <button
                      type="button"
                      onClick={() => {
                        setEmailProvider('mailto');
                        setTestEmailMsg('');
                      }}
                      className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                        emailProvider === 'mailto'
                          ? 'bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border-cyan-400 text-cyan-300 shadow-lg shadow-cyan-500/10 ring-2 ring-cyan-400/50'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-850'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <div className="flex items-center space-x-2">
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            emailProvider === 'mailto' ? 'border-cyan-400 bg-cyan-400' : 'border-slate-600'
                          }`}>
                            {emailProvider === 'mailto' && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                          </div>
                          <span className="font-bold text-xs text-slate-100">App Mail</span>
                        </div>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          Locale
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 pl-6">
                        Apre la tua app Mail / Outlook del Mac o telefono
                      </p>
                    </button>
                  </div>
                </div>

                {/* CATEGORIA 1: FORMSPREE.IO DEDICATA */}
                {emailProvider === 'formspree' && (
                  <div className="p-4 rounded-2xl bg-gradient-to-b from-amber-500/10 to-slate-900/90 border border-amber-500/30 space-y-3.5 animate-fade-in shadow-xl">
                    <div className="flex items-center justify-between border-b border-amber-500/20 pb-2.5">
                      <div className="flex items-center space-x-2">
                        <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="font-bold text-xs text-amber-200">
                            Categoria Selezionata: Formspree.io (Invio Automatico Silenzioso)
                          </h5>
                          <p className="text-[10px] text-slate-400">
                            Invia in background senza aprire nessuna finestra né richiedere login dell'utente
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full shadow-sm">
                        Attivo
                      </span>
                    </div>

                    {/* Recipient Email */}
                    <div>
                      <label className="block text-slate-200 font-semibold text-xs mb-1">
                        Email Destinatario Notifiche Scadenze (Singola o Multiple)
                      </label>
                      <input
                        type="text"
                        value={adminEmail}
                        onChange={(e) => setAdminEmailState(e.target.value)}
                        placeholder="Es. cantinaportaromana93@gmail.com, info@azienda.it"
                        className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-xs focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        💡 Puoi inserire più indirizzi email separandoli con una virgola.
                      </p>
                    </div>

                    {/* Formspree Link */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-slate-200 font-semibold text-xs">
                          Link Endpoint Formspree.io (Form ID)
                        </label>
                        {webhookUrl && (
                          validateFormspreeUrl(webhookUrl).valid ? (
                            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              ✓ Formato Valido
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                              ⚠️ Verifica Link
                            </span>
                          )
                        )}
                      </div>
                      <input
                        type="text"
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        placeholder="Es. https://formspree.io/f/xaeqeqzl"
                        className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-amber-300 font-mono text-xs focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none"
                      />
                      {webhookUrl && !validateFormspreeUrl(webhookUrl).valid && (
                        <div className="p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] leading-relaxed">
                          {validateFormspreeUrl(webhookUrl).reason}
                        </div>
                      )}
                      <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-[10px] text-slate-400 leading-relaxed">
                        💡 <strong>Guida Formspree:</strong> Registrati gratis su <a href="https://formspree.io" target="_blank" rel="noreferrer" className="text-amber-400 underline font-bold">Formspree.io</a>, crea un modulo con <strong>"+ New Form"</strong> e incolla qui il link generato (es. <code className="text-amber-300 font-bold">https://formspree.io/f/xaeqeqzl</code>).
                      </div>
                    </div>

                    {/* Toggle Automatic Alerts */}
                    <label className="flex items-center space-x-2.5 p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 hover:border-slate-700 cursor-pointer transition-all">
                      <input
                        type="checkbox"
                        id="emailAlertsEnabledFormspree"
                        checked={emailAlertsEnabled}
                        onChange={(e) => setEmailAlertsEnabled(e.target.checked)}
                        className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-900 w-4 h-4"
                      />
                      <div>
                        <span className="block font-bold text-xs text-slate-200">
                          Abilita invio automatico promemoria scadenze con Formspree
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Invia 3 avvisi scadenze mirati (60 giorni, 30 giorni e 7 giorni prima)
                        </span>
                      </div>
                    </label>

                    {/* Feedback Messages */}
                    {savedSuccess && (
                      <div className="p-2.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-fade-in">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Impostazioni Formspree salvate con successo e sincronizzate nel Cloud!</span>
                      </div>
                    )}

                    {testEmailMsg && (
                      <div className="p-2.5 bg-slate-950 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-fade-in">
                        <Bell className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>{testEmailMsg}</span>
                      </div>
                    )}

                    {/* Actions: Save & Test Formspree */}
                    <div className="pt-2 flex flex-col sm:flex-row gap-2 border-t border-amber-500/20">
                      <button
                        type="button"
                        onClick={(e) => handleSaveEmailSettings(e, 'formspree')}
                        className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 font-bold rounded-xl flex items-center justify-center space-x-2 transition-all active:scale-95 text-xs shadow-sm"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Salva Configurazione Formspree</span>
                      </button>

                      <button
                        type="button"
                        disabled={isSendingTest}
                        onClick={() => handleRunTestEmail('formspree')}
                        className="flex-1 py-2.5 px-3 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold rounded-xl flex items-center justify-center space-x-2 transition-all shadow-md active:scale-95 text-xs disabled:opacity-50"
                      >
                        <Send className={`w-4 h-4 ${isSendingTest ? 'animate-spin' : ''}`} />
                        <span>{isSendingTest ? 'Invio in corso...' : '✉️ Prova Invio con Formspree Ora'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* CATEGORIA 2: EMAILJS DEDICATA */}
                {emailProvider === 'emailjs' && (
                  <div className="p-4 rounded-2xl bg-gradient-to-b from-indigo-500/10 to-slate-900/90 border border-indigo-500/30 space-y-3.5 animate-fade-in shadow-xl">
                    <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2.5">
                      <div className="flex items-center space-x-2">
                        <div className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-lg">
                          <KeyRound className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="font-bold text-xs text-indigo-200">
                            Categoria Selezionata: EmailJS (Integrazione API Diretta)
                          </h5>
                          <p className="text-[10px] text-slate-400">
                            Invio tramite 3 chiavi API configurate sulla tua dashboard emailjs.com
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold bg-indigo-400 text-slate-950 px-2.5 py-0.5 rounded-full shadow-sm">
                        Attivo
                      </span>
                    </div>

                    {/* Recipient Email */}
                    <div>
                      <label className="block text-slate-200 font-semibold text-xs mb-1">
                        Email Destinatario Notifiche Scadenze (Singola o Multiple)
                      </label>
                      <input
                        type="text"
                        value={adminEmail}
                        onChange={(e) => setAdminEmailState(e.target.value)}
                        placeholder="Es. cantinaportaromana93@gmail.com, info@azienda.it"
                        className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-xs focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        💡 Puoi inserire più indirizzi email separandoli con una virgola.
                      </p>
                    </div>

                    {/* 3 EmailJS API Keys */}
                    <div className="space-y-2">
                      <label className="block text-slate-200 font-semibold text-xs">
                        Le 3 Chiavi API EmailJS:
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                        <div>
                          <label className="block text-slate-300 mb-1 font-semibold text-[10px]">Service ID</label>
                          <input
                            type="text"
                            value={emailjsServiceId}
                            onChange={(e) => setEmailjsServiceId(e.target.value)}
                            placeholder="service_xxx"
                            className="w-full px-2.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono text-[11px] focus:border-indigo-400 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-300 mb-1 font-semibold text-[10px]">Template ID</label>
                          <input
                            type="text"
                            value={emailjsTemplateId}
                            onChange={(e) => setEmailjsTemplateId(e.target.value)}
                            placeholder="template_xxx"
                            className="w-full px-2.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono text-[11px] focus:border-indigo-400 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-300 mb-1 font-semibold text-[10px]">Public Key (User ID)</label>
                          <input
                            type="text"
                            value={emailjsPublicKey}
                            onChange={(e) => setEmailjsPublicKey(e.target.value)}
                            placeholder="user_xxx"
                            className="w-full px-2.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono text-[11px] focus:border-indigo-400 outline-none"
                          />
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-[10px] text-slate-400 leading-relaxed">
                        💡 <strong>Guida EmailJS:</strong> Su <a href="https://emailjs.com" target="_blank" rel="noreferrer" className="text-indigo-400 underline font-bold">EmailJS</a> imposta un template con i campi <code className="text-indigo-300 font-bold">&#123;&#123;to_email&#125;&#125;</code> e <code className="text-indigo-300 font-bold">&#123;&#123;message_body&#125;&#125;</code>.
                      </div>
                    </div>

                    {/* Toggle Automatic Alerts */}
                    <label className="flex items-center space-x-2.5 p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 hover:border-slate-700 cursor-pointer transition-all">
                      <input
                        type="checkbox"
                        id="emailAlertsEnabledEmailjs"
                        checked={emailAlertsEnabled}
                        onChange={(e) => setEmailAlertsEnabled(e.target.checked)}
                        className="rounded border-slate-700 text-indigo-500 focus:ring-indigo-500 bg-slate-900 w-4 h-4"
                      />
                      <div>
                        <span className="block font-bold text-xs text-slate-200">
                          Abilita invio automatico promemoria scadenze con EmailJS
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Invio automatico delle scadenze vetture direttamente dal browser
                        </span>
                      </div>
                    </label>

                    {/* Feedback Messages */}
                    {savedSuccess && (
                      <div className="p-2.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-fade-in">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Impostazioni EmailJS salvate con successo e sincronizzate nel Cloud!</span>
                      </div>
                    )}

                    {testEmailMsg && (
                      <div className="p-2.5 bg-slate-950 border border-indigo-500/40 text-indigo-300 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-fade-in">
                        <Bell className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span>{testEmailMsg}</span>
                      </div>
                    )}

                    {/* Actions: Save & Test EmailJS */}
                    <div className="pt-2 flex flex-col sm:flex-row gap-2 border-t border-indigo-500/20">
                      <button
                        type="button"
                        onClick={(e) => handleSaveEmailSettings(e, 'emailjs')}
                        className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-indigo-400 border border-indigo-500/30 font-bold rounded-xl flex items-center justify-center space-x-2 transition-all active:scale-95 text-xs shadow-sm"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Salva Configurazione EmailJS</span>
                      </button>

                      <button
                        type="button"
                        disabled={isSendingTest}
                        onClick={() => handleRunTestEmail('emailjs')}
                        className="flex-1 py-2.5 px-3 bg-gradient-to-r from-indigo-500 to-indigo-400 hover:from-indigo-400 hover:to-indigo-300 text-slate-950 font-bold rounded-xl flex items-center justify-center space-x-2 transition-all shadow-md active:scale-95 text-xs disabled:opacity-50"
                      >
                        <Send className={`w-4 h-4 ${isSendingTest ? 'animate-spin' : ''}`} />
                        <span>{isSendingTest ? 'Invio in corso...' : '✉️ Prova Invio con EmailJS Ora'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* CATEGORIA 3: APP MAIL DEDICATA */}
                {emailProvider === 'mailto' && (
                  <div className="p-4 rounded-2xl bg-gradient-to-b from-cyan-500/10 to-slate-900/90 border border-cyan-500/30 space-y-3.5 animate-fade-in shadow-xl">
                    <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2.5">
                      <div className="flex items-center space-x-2">
                        <div className="p-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="font-bold text-xs text-cyan-200">
                            Categoria Selezionata: App Mail di Sistema (Nessun Servizio Terzo)
                          </h5>
                          <p className="text-[10px] text-slate-400">
                            Apre la tua applicazione di posta nativa (Apple Mail, Outlook, Thunderbird) con il report già compilato
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold bg-cyan-400 text-slate-950 px-2.5 py-0.5 rounded-full shadow-sm">
                        Attivo
                      </span>
                    </div>

                    {/* Recipient Email */}
                    <div>
                      <label className="block text-slate-200 font-semibold text-xs mb-1">
                        Email Destinatario Predefinita
                      </label>
                      <input
                        type="text"
                        value={adminEmail}
                        onChange={(e) => setAdminEmailState(e.target.value)}
                        placeholder="Es. cantinaportaromana93@gmail.com"
                        className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-xs focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        All'apertura dell'app di posta, il destinatario verrà impostato automaticamente a questo indirizzo.
                      </p>
                    </div>

                    {/* Info Card */}
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300 space-y-1.5 leading-relaxed">
                      <div className="font-bold text-cyan-300 flex items-center space-x-1.5">
                        <span>✨ Vantaggi dell'App Mail:</span>
                      </div>
                      <p className="text-slate-400 text-[10px]">
                        • Nessuna registrazione a servizi terzi o chiavi API richieste.<br/>
                        • Compatibile al 100% con qualsiasi Mac, iPhone, iPad, Windows o dispositivo mobile.<br/>
                        • Puoi controllare il testo dell'email prima di fare clic su "Invia" dal tuo programma di posta.
                      </p>
                    </div>

                    {/* Feedback Messages */}
                    {savedSuccess && (
                      <div className="p-2.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-fade-in">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Preferenza App Mail salvata con successo e sincronizzata nel Cloud!</span>
                      </div>
                    )}

                    {testEmailMsg && (
                      <div className="p-2.5 bg-slate-950 border border-cyan-500/40 text-cyan-300 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-fade-in">
                        <Bell className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span>{testEmailMsg}</span>
                      </div>
                    )}

                    {/* Actions: Save & Open App Mail */}
                    <div className="pt-2 flex flex-col sm:flex-row gap-2 border-t border-cyan-500/20">
                      <button
                        type="button"
                        onClick={(e) => handleSaveEmailSettings(e, 'mailto')}
                        className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 font-bold rounded-xl flex items-center justify-center space-x-2 transition-all active:scale-95 text-xs shadow-sm"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Salva Preferenza App Mail</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRunTestEmail('mailto')}
                        className="flex-1 py-2.5 px-3 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-950 font-bold rounded-xl flex items-center justify-center space-x-2 transition-all shadow-md active:scale-95 text-xs"
                      >
                        <Send className="w-4 h-4" />
                        <span>🚀 Apri App Mail con Report Scadenze</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Strumenti Utili & Anteprima Report Scadenze */}
                <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const success = copyEmailReportToClipboard(adminEmail, cars);
                        if (success) {
                          setTestEmailMsg('📋 Testo del report scadenze copiato negli appunti! Puoi incollarlo ovunque.');
                          setTimeout(() => setTestEmailMsg(''), 4000);
                        }
                      }}
                      className="w-full sm:w-auto px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-amber-400 border border-slate-700 rounded-xl flex items-center justify-center space-x-2 transition-all active:scale-95 text-xs font-semibold shadow-sm"
                    >
                      <Copy className="w-3.5 h-3.5 text-amber-400" />
                      <span>📋 Copia Testo Report Negli Appunti</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowPreviewReport(!showPreviewReport)}
                      className="w-full sm:w-auto px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-amber-400 border border-slate-700 rounded-xl flex items-center justify-center space-x-2 transition-all active:scale-95 text-xs font-semibold shadow-sm"
                    >
                      <FileText className="w-3.5 h-3.5 text-amber-400" />
                      <span>{showPreviewReport ? 'Nascondi Anteprima' : '👁️ Visualizza Testo del Report'}</span>
                    </button>
                  </div>

                  {showPreviewReport && (
                    <div className="mt-2 p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-48 leading-relaxed">
                      {generateEmailReportText(cars)}
                    </div>
                  )}
                </div>
              </div>

              {/* Visual Effects & Expiration Alert Bar Toggles */}
              <div className="bg-slate-950/90 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h4 className="font-bold text-slate-100">Personalizzazione Grafica & Barra Notifiche</h4>
                </div>

                <p className="text-slate-400 text-[11px]">
                  Attiva o disattiva gli effetti visivi ambientali del sito e la barra animata in alto per le scadenze imminenti.
                </p>

                <div className="space-y-2.5 pt-1">
                  <label className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800 hover:border-slate-700 transition-all cursor-pointer">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block font-bold text-slate-200">Lucine Ambientali Laterali (Aura Azzurra/Blu)</span>
                        <span className="text-[10px] text-slate-400">Effetto soffuso e sfocato che pulsa ai bordi destra e sinistra</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={!!showSideGlow}
                      onChange={(e) => setShowSideGlow && setShowSideGlow(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-950 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800 hover:border-slate-700 transition-all cursor-pointer">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                        <Bell className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block font-bold text-slate-200">Barra Avviso Scadenze in Alto</span>
                        <span className="text-[10px] text-slate-400">Barra animata con effetto sfumato marrone → giallo che avvisa sulle scadenze</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={!!showExpirationBar}
                      onChange={(e) => setShowExpirationBar && setShowExpirationBar(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-950 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: GESTIONE UTENTI (3 CATEGORIE ILLIMITATI) */}
          {activeTab === 'users' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* Add New User Form */}
              <form onSubmit={handleAddUser} className="bg-slate-950/90 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
                  <UserPlus className="w-4 h-4 text-amber-400" />
                  <h4 className="font-bold text-slate-100">Aggiungi Nuovo Utente (Illimitati)</h4>
                </div>

                {userMsg && (
                  <div className={`p-2.5 rounded-xl border text-xs font-semibold ${
                    userMsg.includes('Errore') 
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' 
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}>
                    {userMsg}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Nome Completo</label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder=""
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Nome Utente (Username)</label>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder=""
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Password</label>
                    <input
                      type="text"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder=""
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Ruolo / Categoria Accesso</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 font-semibold"
                  >
                    <option value="super_admin">👑 Super Admin (Proprietario) — Accesso totale e modifiche</option>
                    <option value="editor">🛠️ Gestore / Editor — Inserimento e modifica vetture</option>
                    <option value="viewer">👁️ Visualizzatore / Cliente — Sola lettura e stampa PDF</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl shadow-lg transition-all"
                >
                  Crea Utente
                </button>
              </form>

              {/* Users List */}
              <div className="space-y-3">
                <h4 className="font-bold text-amber-400 uppercase tracking-wider text-[11px] flex items-center justify-between">
                  <span>Elenco Utenti Registrati ({users.length})</span>
                  <span className="text-slate-400 text-[10px] normal-case font-normal">Suddivisi in 3 Categorie</span>
                </h4>

                <div className="space-y-2">
                  {(users || []).map(u => {
                    const roleKey = Object.keys(USER_ROLES || {}).find(k => USER_ROLES[k]?.id === u.role);
                    const roleConfig = (USER_ROLES && roleKey && USER_ROLES[roleKey]) || USER_ROLES?.EDITOR || { name: u.role || 'Utente' };

                    if (editingUserId === u.id) {
                      return (
                        <div key={u.id} className="bg-slate-950 p-4 rounded-2xl border border-amber-500/50 space-y-3 w-full animate-fade-in">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                            <span className="font-bold text-amber-400 text-xs flex items-center">
                              <Edit3 className="w-3.5 h-3.5 mr-1.5 text-amber-400" /> 
                              Modifica Credenziali Utente ({u.name})
                            </span>
                            <button 
                              type="button" 
                              onClick={() => setEditingUserId(null)}
                              className="text-slate-400 hover:text-slate-200 text-xs"
                            >
                              ✕ Annulla
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-slate-400 font-semibold mb-1">Nome Completo</label>
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-400 font-semibold mb-1">Username (Login)</label>
                              <input
                                type="text"
                                value={editUsername}
                                onChange={(e) => setEditUsername(e.target.value)}
                                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-400 font-semibold mb-1">Password</label>
                              <input
                                type="text"
                                value={editPassword}
                                onChange={(e) => setEditPassword(e.target.value)}
                                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-slate-400 font-semibold mb-1">Ruolo / Accesso</label>
                            <select
                              value={editRole}
                              onChange={(e) => setEditRole(e.target.value)}
                              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 font-semibold"
                            >
                              <option value="super_admin">👑 Super Admin (Proprietario)</option>
                              <option value="editor">🛠️ Gestore / Editor</option>
                              <option value="viewer">👁️ Visualizzatore / Cliente</option>
                            </select>
                          </div>

                          <div className="flex justify-end space-x-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingUserId(null)}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
                            >
                              Annulla
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEditUser(u.id)}
                              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl text-xs shadow-md"
                            >
                              Salva Modifiche Credenziali
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div 
                        key={u.id}
                        className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-all"
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-100 text-sm">{u.name}</span>
                            <span className="font-mono text-slate-400 text-xs">(@{u.username})</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.role === 'super_admin' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                              u.role === 'editor' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                              'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                            }`}>
                              {roleConfig?.name || u.role || 'Utente'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">Password: <strong className="text-slate-200">{u.password}</strong></p>
                        </div>

                        <div className="flex items-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => handleStartEditUser(u)}
                            className="p-2 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-xl border border-slate-800 transition-all flex items-center space-x-1"
                            title="Modifica Nome Utente & Password Admin"
                          >
                            <Edit3 className="w-4 h-4" />
                            <span className="text-[11px] font-bold hidden sm:inline">Modifica</span>
                          </button>

                          {u.username.toLowerCase() !== 'shirantha' && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u.id)}
                              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl border border-slate-800 transition-all"
                              title="Elimina Utente"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: GESTIONE SFONDI LOGIN & HERO */}
          {activeTab === 'backgrounds' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* Add Background Form */}
              <div className="bg-slate-950/90 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
                  <ImageIcon className="w-4 h-4 text-amber-400" />
                  <h4 className="font-bold text-slate-100">Sostituisci o Aggiungi Foto Sfondi</h4>
                </div>

                {bgMsg && (
                  <div className="p-2.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-semibold">
                    {bgMsg}
                  </div>
                )}

                {/* Upload File or Custom URL */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <label className="flex-1 flex items-center justify-center space-x-2 p-3 bg-slate-900 hover:bg-slate-800 border-2 border-dashed border-slate-700 hover:border-amber-500 rounded-xl cursor-pointer transition-all text-slate-300 font-semibold">
                    <Upload className="w-4 h-4 text-amber-400" />
                    <span>Carica Foto da Dispositivo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBgFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <form onSubmit={handleAddBackground} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={newBgUrl}
                    onChange={(e) => setNewBgUrl(e.target.value)}
                    placeholder="Oppure incolla URL foto grande carrozzeria/auto..."
                    className="w-full flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs"
                  />
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-all shrink-0"
                  >
                    Aggiungi URL
                  </button>
                </form>
              </div>

              {/* Backgrounds Gallery Grid */}
              <div className="space-y-3">
                <h4 className="font-bold text-amber-400 uppercase tracking-wider text-[11px]">
                  Galleria Sfondi Attivi ({backgrounds.length})
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {backgrounds.map((bgUrl, idx) => (
                    <div 
                      key={idx}
                      className="relative group aspect-video rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-1 flex items-center justify-center"
                    >
                      <img src={bgUrl} alt="" className="w-full h-full object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={() => handleDeleteBackground(idx)}
                        className="absolute top-2 right-2 p-1.5 bg-slate-950/80 text-slate-300 hover:text-rose-400 rounded-lg border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Rimuovi Foto Sfondo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: GESTIONE UBICAZIONI / GARAGE */}
          {activeTab === 'locations' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* Add New Location Form */}
              <form onSubmit={handleAddLocationSubmit} className="bg-slate-950/90 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
                  <MapPin className="w-4 h-4 text-amber-400" />
                  <h4 className="font-bold text-slate-100">Aggiungi Nuova Ubicazione / Garage</h4>
                </div>

                {locationMsg && (
                  <div className="p-2.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-semibold">
                    {locationMsg}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={newLocationName}
                    onChange={(e) => setNewLocationName(e.target.value)}
                    placeholder="Nome nuova posizione (es. Garage Milano, Casa al Mare, Deposito 2)..."
                    className="w-full flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs"
                    required
                  />
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-all flex items-center justify-center space-x-1 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Aggiungi Ubicazione</span>
                  </button>
                </div>
              </form>

              {/* Master Locations List */}
              <div className="space-y-3">
                <h4 className="font-bold text-amber-400 uppercase tracking-wider text-[11px] flex items-center justify-between">
                  <span>Elenco Ubicazioni Predefinite ({locationsList.length})</span>
                  <span className="text-slate-400 text-[10px] normal-case font-normal">Disponibili nel menu a tendina delle vetture</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {locationsList.map((loc, idx) => (
                    <div 
                      key={idx}
                      className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-2 hover:border-slate-700 transition-all text-xs"
                    >
                      <div className="flex items-center space-x-2 text-slate-200">
                        <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="font-semibold">{loc}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteLocation(loc)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg border border-slate-800 transition-all"
                        title="Elimina Ubicazione"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 5: PERMESSI & VISIBILITÀ CLIENTI E VISITATORI */}
          {activeTab === 'permissions' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* Header Box */}
              <div className="bg-gradient-to-r from-cyan-950/40 via-slate-900 to-amber-950/30 p-4 sm:p-5 rounded-2xl border border-cyan-500/30">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-cyan-400 text-sm flex items-center gap-2">
                      <Eye className="w-4 h-4 text-cyan-400" />
                      <span>Controllo Visibilità: Clienti & Visitatori</span>
                    </h4>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Scegli cosa possono vedere o non vedere le persone esterne (clienti e visitatori del sito).
                      <br className="hidden sm:inline" />
                      <strong className="text-amber-300"> Nota:</strong> Tu come <span className="underline">Super Admin</span> (Shirantha) e Luciano come <span className="underline">Gestore</span> avrete <strong>SEMPRE visibilità completa al 100%</strong> su scadenze e dati riservati.
                    </p>
                  </div>
                  <span className="shrink-0 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Controllo Privacy</span>
                  </span>
                </div>

                {permsMsg && (
                  <div className="mt-3.5 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fade-in">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>{permsMsg}</span>
                  </div>
                )}
              </div>

              {/* Toggles List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Settings className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Cosa possono visualizzare Clienti e Visitatori:</span>
                  </h5>
                  <span className="text-[10px] text-slate-400 italic">Clicca sulle caselle per attivare/disattivare</span>
                </div>

                {/* 1. SCADENZE (DEFAULT OFF) */}
                <div 
                  onClick={() => handleTogglePerm('showExpirations', !permissions.showExpirations)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                    permissions.showExpirations 
                      ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-400' 
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start space-x-3.5">
                    <div className={`p-2.5 rounded-xl border mt-0.5 shrink-0 transition-colors ${
                      permissions.showExpirations 
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' 
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs sm:text-sm">
                          Avvisi e Scadenze (Bollo, Assicurazione, Revisione, Tagliando)
                        </span>
                        {!permissions.showExpirations ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-rose-500/15 text-rose-300 border border-rose-500/30">
                            Nascosto ai clienti (Consigliato)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            Visibile anche ai clienti
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                        Se disattivato, i clienti non vedranno il banner arancione in alto, la campanella con notifiche e le date di scadenza di bollo, revisione e assicurazione nelle auto.
                      </p>
                    </div>
                  </div>

                  {/* Switch */}
                  <div className="shrink-0 flex items-center">
                    <div className={`w-11 h-6 flex items-center rounded-full p-1 duration-300 ease-in-out ${
                      permissions.showExpirations ? 'bg-amber-500 justify-end' : 'bg-slate-800 justify-start'
                    }`}>
                      <div className="bg-white w-4 h-4 rounded-full shadow-md transform transition-all duration-300"></div>
                    </div>
                  </div>
                </div>

                {/* 2. NUMERO DI TELAIO (VIN) */}
                <div 
                  onClick={() => handleTogglePerm('showChassis', !permissions.showChassis)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                    permissions.showChassis 
                      ? 'bg-cyan-950/20 border-cyan-500/40 hover:border-cyan-400' 
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start space-x-3.5">
                    <div className={`p-2.5 rounded-xl border mt-0.5 shrink-0 transition-colors ${
                      permissions.showChassis 
                        ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' 
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs sm:text-sm">
                          Numero di Telaio (VIN Completo)
                        </span>
                        {!permissions.showChassis ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-rose-500/15 text-rose-300 border border-rose-500/30">
                            Riservato / Protetto
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                            Visibile a tutti
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                        Se disattivato, il codice di telaio (VIN) sarà oscurato o visibile solo a te e a Luciano.
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center">
                    <div className={`w-11 h-6 flex items-center rounded-full p-1 duration-300 ease-in-out ${
                      permissions.showChassis ? 'bg-cyan-500 justify-end' : 'bg-slate-800 justify-start'
                    }`}>
                      <div className="bg-white w-4 h-4 rounded-full shadow-md transform transition-all duration-300"></div>
                    </div>
                  </div>
                </div>

                {/* 3. UBICAZIONE / POSIZIONE GARAGE */}
                <div 
                  onClick={() => handleTogglePerm('showLocation', !permissions.showLocation)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                    permissions.showLocation 
                      ? 'bg-cyan-950/20 border-cyan-500/40 hover:border-cyan-400' 
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start space-x-3.5">
                    <div className={`p-2.5 rounded-xl border mt-0.5 shrink-0 transition-colors ${
                      permissions.showLocation 
                        ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' 
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs sm:text-sm">
                          Ubicazione / Sede Garage o Box
                        </span>
                        {!permissions.showLocation ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-rose-500/15 text-rose-300 border border-rose-500/30">
                            Riservato / Nascosto
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                            Visibile a tutti
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                        Se disattivato, il nome della sede interna, magazzino o box auto non viene mostrato ai visitatori.
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center">
                    <div className={`w-11 h-6 flex items-center rounded-full p-1 duration-300 ease-in-out ${
                      permissions.showLocation ? 'bg-cyan-500 justify-end' : 'bg-slate-800 justify-start'
                    }`}>
                      <div className="bg-white w-4 h-4 rounded-full shadow-md transform transition-all duration-300"></div>
                    </div>
                  </div>
                </div>

                {/* 4. DOCUMENTI SCANSIONATI */}
                <div 
                  onClick={() => handleTogglePerm('showDocuments', !permissions.showDocuments)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                    permissions.showDocuments 
                      ? 'bg-cyan-950/20 border-cyan-500/40 hover:border-cyan-400' 
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start space-x-3.5">
                    <div className={`p-2.5 rounded-xl border mt-0.5 shrink-0 transition-colors ${
                      permissions.showDocuments 
                        ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' 
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs sm:text-sm">
                          Documenti Allegati (Libretto di Circolazione, Polizze)
                        </span>
                        {!permissions.showDocuments ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-rose-500/15 text-rose-300 border border-rose-500/30">
                            Riservato ad Amministrazione
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                            Visibile a tutti
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                        Se disattivato, i documenti PDF e le foto scansionate del libretto non sono visualizzabili da clienti esterni.
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center">
                    <div className={`w-11 h-6 flex items-center rounded-full p-1 duration-300 ease-in-out ${
                      permissions.showDocuments ? 'bg-cyan-500 justify-end' : 'bg-slate-800 justify-start'
                    }`}>
                      <div className="bg-white w-4 h-4 rounded-full shadow-md transform transition-all duration-300"></div>
                    </div>
                  </div>
                </div>

                {/* 5. PREZZI DI VENDITA */}
                <div 
                  onClick={() => handleTogglePerm('showPrices', !permissions.showPrices)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                    permissions.showPrices 
                      ? 'bg-cyan-950/20 border-cyan-500/40 hover:border-cyan-400' 
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start space-x-3.5">
                    <div className={`p-2.5 rounded-xl border mt-0.5 shrink-0 transition-colors ${
                      permissions.showPrices 
                        ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' 
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs sm:text-sm">
                          Prezzi di Vendita delle Auto
                        </span>
                        {permissions.showPrices ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            Prezzi Esposti
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            Trattativa Riservata
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                        Se disattivato, il prezzo viene sostituito dalla dicitura "Trattativa Riservata" per visitatori e clienti.
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center">
                    <div className={`w-11 h-6 flex items-center rounded-full p-1 duration-300 ease-in-out ${
                      permissions.showPrices ? 'bg-cyan-500 justify-end' : 'bg-slate-800 justify-start'
                    }`}>
                      <div className="bg-white w-4 h-4 rounded-full shadow-md transform transition-all duration-300"></div>
                    </div>
                  </div>
                </div>

                {/* 6. DOWNLOAD SCHEDA PDF */}
                <div 
                  onClick={() => handleTogglePerm('allowPdfDownload', !permissions.allowPdfDownload)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                    permissions.allowPdfDownload 
                      ? 'bg-cyan-950/20 border-cyan-500/40 hover:border-cyan-400' 
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start space-x-3.5">
                    <div className={`p-2.5 rounded-xl border mt-0.5 shrink-0 transition-colors ${
                      permissions.allowPdfDownload 
                        ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' 
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      <Download className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs sm:text-sm">
                          Pulsante Download / Stampa Scheda PDF
                        </span>
                        {permissions.allowPdfDownload ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            Download Abilitato
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-rose-500/15 text-rose-300 border border-rose-500/30">
                            Download Disabilitato
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                        Permette o impedisce ai visitatori di esportare o stampare la scheda del veicolo in formato PDF.
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center">
                    <div className={`w-11 h-6 flex items-center rounded-full p-1 duration-300 ease-in-out ${
                      permissions.allowPdfDownload ? 'bg-cyan-500 justify-end' : 'bg-slate-800 justify-start'
                    }`}>
                      <div className="bg-white w-4 h-4 rounded-full shadow-md transform transition-all duration-300"></div>
                    </div>
                  </div>
                </div>

                {/* 7. ACCESSO OSPITE / VISITATORE */}
                <div 
                  onClick={() => handleTogglePerm('allowGuestBrowsing', !permissions.allowGuestBrowsing)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                    permissions.allowGuestBrowsing 
                      ? 'bg-cyan-950/20 border-cyan-500/40 hover:border-cyan-400' 
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start space-x-3.5">
                    <div className={`p-2.5 rounded-xl border mt-0.5 shrink-0 transition-colors ${
                      permissions.allowGuestBrowsing 
                        ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' 
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs sm:text-sm">
                          Esplorazione Libera Senza Login (Accesso Ospite)
                        </span>
                        {permissions.allowGuestBrowsing ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            Catalogo Aperto
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            Login Richiesto
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                        Se attivo, nella pagina di login iniziale compare il pulsante per entrare subito nel catalogo come visitatore senza digitare password.
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center">
                    <div className={`w-11 h-6 flex items-center rounded-full p-1 duration-300 ease-in-out ${
                      permissions.allowGuestBrowsing ? 'bg-cyan-500 justify-end' : 'bg-slate-800 justify-start'
                    }`}>
                      <div className="bg-white w-4 h-4 rounded-full shadow-md transform transition-all duration-300"></div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleResetPerms}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition-all flex items-center justify-center gap-2"
                >
                  <EyeOff className="w-4 h-4" />
                  <span>Ripristina Predefiniti</span>
                </button>

                <button
                  type="button"
                  onClick={handleSavePerms}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-amber-400 hover:from-cyan-300 hover:to-amber-300 shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Salva Configurazione Visibilità</span>
                </button>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
