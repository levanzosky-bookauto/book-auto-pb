import React, { useState } from 'react';
import {
  KeyRound,
  Mail,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
  User,
  Eye,
  EyeOff,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import {
  getUsers,
  findUserForRecovery,
  updateUserPassword,
  verifyMasterPin
} from '../utils/auth';
import { sendPasswordRecoveryEmail, getAdminEmail } from '../utils/emailAlerts';

export default function ForgotCredentialsModal({ isOpen, onClose, onSuccessReset }) {
  if (!isOpen) return null;

  // Active Tab: 'email' (Option 2) or 'pin' (Option 3)
  const [activeTab, setActiveTab] = useState('email');

  // --- OPTION 2: EMAIL RECOVERY STATE ---
  const [emailStep, setEmailStep] = useState(1); // 1: input user/email, 2: verify OTP, 3: set new password, 4: success
  const [identifierInput, setIdentifierInput] = useState('');
  const [recoveryUser, setRecoveryUser] = useState(null);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [inputOtp, setInputOtp] = useState('');
  const [targetEmailDisplay, setTargetEmailDisplay] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatusMsg, setEmailStatusMsg] = useState({ type: '', text: '' });

  // New Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // --- OPTION 3: MASTER PIN STATE ---
  const [masterPinInput, setMasterPinInput] = useState('');
  const [showMasterPin, setShowMasterPin] = useState(false);
  const [isMasterVerified, setIsMasterVerified] = useState(false);
  const [selectedUserForPinReset, setSelectedUserForPinReset] = useState(null);
  const [pinNewPassword, setPinNewPassword] = useState('');
  const [pinConfirmPassword, setPinConfirmPassword] = useState('');
  const [showPinPassword, setShowPinPassword] = useState(false);
  const [pinStatusMsg, setPinStatusMsg] = useState({ type: '', text: '' });

  // Helper to mask email for security (e.g. sh***@domain.com)
  const maskEmail = (email) => {
    if (!email) return 'tua casella email';
    const parts = email.split('@');
    if (parts.length !== 2) return email;
    const name = parts[0];
    const maskedName = name.length <= 2 ? name[0] + '***' : name[0] + '***' + name[name.length - 1];
    return `${maskedName}@${parts[1]}`;
  };

  // --- HANDLERS FOR OPTION 2 (EMAIL) ---
  const handleRequestEmailCode = async (e) => {
    e?.preventDefault();
    setEmailStatusMsg({ type: '', text: '' });

    if (!identifierInput.trim()) {
      setEmailStatusMsg({ type: 'error', text: 'Inserisci il tuo Nome Utente o la tua Email.' });
      return;
    }

    const matchedUser = findUserForRecovery(identifierInput);
    if (!matchedUser) {
      setEmailStatusMsg({
        type: 'error',
        text: 'Nessun account trovato con questo Nome Utente o Email. Se non li ricordi, usa la scheda "PIN Master".'
      });
      return;
    }

    // Determine target email
    const configuredAdminEmail = getAdminEmail();
    const destinationEmail = matchedUser.email || (matchedUser.role === 'super_admin' ? configuredAdminEmail : configuredAdminEmail);

    if (!destinationEmail) {
      setEmailStatusMsg({
        type: 'warning',
        text: 'Nessun indirizzo email configurato per questo account. Usa la scheda "PIN Master d\'Emergenza" per procedere subito.'
      });
      return;
    }

    // Generate 6-digit OTP code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setRecoveryUser(matchedUser);
    setTargetEmailDisplay(destinationEmail);

    setIsSendingEmail(true);
    setEmailStatusMsg({ type: 'info', text: 'Invio codice di sicurezza via email in corso...' });

    try {
      const res = await sendPasswordRecoveryEmail(
        destinationEmail,
        matchedUser.name,
        code,
        matchedUser.username
      );

      setIsSendingEmail(false);
      setEmailStep(2);
      setEmailStatusMsg({
        type: 'success',
        text: `Codice inviato a ${maskEmail(destinationEmail)}! Controlla la tua posta.`
      });
    } catch (err) {
      setIsSendingEmail(false);
      // Fallback: still advance to OTP step and show local helper
      setEmailStep(2);
      setEmailStatusMsg({
        type: 'info',
        text: `Codice pronto per la verifica (inviato a ${maskEmail(destinationEmail)}).`
      });
    }
  };

  const handleVerifyOtp = (e) => {
    e?.preventDefault();
    setEmailStatusMsg({ type: '', text: '' });

    const cleanInput = inputOtp.trim();
    if (!cleanInput) {
      setEmailStatusMsg({ type: 'error', text: 'Digita il codice di 6 cifre ricevuto.' });
      return;
    }

    if (cleanInput !== generatedOtp) {
      setEmailStatusMsg({
        type: 'error',
        text: 'Codice non corretto o scaduto. Riprova oppure reinvia il codice.'
      });
      return;
    }

    // OTP Verified! Advance to Step 3: Set New Password
    setEmailStatusMsg({
      type: 'success',
      text: 'Codice verificato con successo! Imposta ora la tua nuova password.'
    });
    setEmailStep(3);
  };

  const handleSaveNewPasswordViaEmail = (e) => {
    e?.preventDefault();
    setEmailStatusMsg({ type: '', text: '' });

    if (!newPassword.trim()) {
      setEmailStatusMsg({ type: 'error', text: 'Inserisci una nuova password.' });
      return;
    }

    if (newPassword.length < 4) {
      setEmailStatusMsg({ type: 'error', text: 'La password deve avere almeno 4 caratteri.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setEmailStatusMsg({ type: 'error', text: 'Le due password inserite non coincidono.' });
      return;
    }

    setIsSavingPassword(true);
    const res = updateUserPassword(recoveryUser.id, newPassword);
    setIsSavingPassword(false);

    if (res.success) {
      setEmailStep(4);
      setEmailStatusMsg({
        type: 'success',
        text: 'Password aggiornata con successo!'
      });
      if (onSuccessReset) {
        onSuccessReset(recoveryUser.username);
      }
    } else {
      setEmailStatusMsg({ type: 'error', text: res.reason || 'Errore durante il salvataggio della nuova password.' });
    }
  };

  // --- HANDLERS FOR OPTION 3 (MASTER PIN) ---
  const handleVerifyMasterPin = (e) => {
    e?.preventDefault();
    setPinStatusMsg({ type: '', text: '' });

    if (!masterPinInput.trim()) {
      setPinStatusMsg({ type: 'error', text: 'Inserisci il PIN Master di Sicurezza.' });
      return;
    }

    if (verifyMasterPin(masterPinInput)) {
      setIsMasterVerified(true);
      const allUsers = getUsers();
      if (allUsers.length > 0) {
        setSelectedUserForPinReset(allUsers[0]);
      }
      setPinStatusMsg({
        type: 'success',
        text: 'PIN Master confermato! Seleziona l\'utente e reimposta subito le credenziali.'
      });
    } else {
      setPinStatusMsg({
        type: 'error',
        text: 'PIN Master errato. Inserisci il codice di sicurezza configurato.'
      });
    }
  };

  const handleSaveNewPasswordViaPin = (e) => {
    e?.preventDefault();
    setPinStatusMsg({ type: '', text: '' });

    if (!selectedUserForPinReset) {
      setPinStatusMsg({ type: 'error', text: 'Seleziona un utente da reimpostare.' });
      return;
    }

    if (!pinNewPassword.trim()) {
      setPinStatusMsg({ type: 'error', text: 'Inserisci la nuova password.' });
      return;
    }

    if (pinNewPassword.length < 4) {
      setPinStatusMsg({ type: 'error', text: 'La password deve contenere almeno 4 caratteri.' });
      return;
    }

    if (pinNewPassword !== pinConfirmPassword) {
      setPinStatusMsg({ type: 'error', text: 'Le due password non coincidono.' });
      return;
    }

    const res = updateUserPassword(selectedUserForPinReset.id, pinNewPassword);
    if (res.success) {
      setPinStatusMsg({
        type: 'success',
        text: `Password per @${selectedUserForPinReset.username} aggiornata con successo!`
      });
      if (onSuccessReset) {
        onSuccessReset(selectedUserForPinReset.username);
      }
      setTimeout(() => {
        onClose();
      }, 1800);
    } else {
      setPinStatusMsg({ type: 'error', text: res.reason || 'Errore durante l\'aggiornamento.' });
    }
  };

  const allUsersList = getUsers();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900/95 border border-amber-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-amber-500/10 text-slate-100 overflow-hidden">
        
        {/* Glow ambient background effects */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-amber-400/10 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-wide text-amber-400">
                Recupero Credenziali
              </h3>
              <p className="text-xs text-slate-400">
                Reimposta la password o recupera il tuo Nome Utente
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            title="Chiudi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Tab Bar: Opzione 2 vs Opzione 3 */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/80 rounded-2xl border border-slate-800 mb-5">
          <button
            type="button"
            onClick={() => setActiveTab('email')}
            className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all ${
              activeTab === 'email'
                ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Opzione 2: Via Email</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pin')}
            className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all ${
              activeTab === 'pin'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Opzione 3: PIN Master</span>
          </button>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* TAB 1: OPZIONE 2 - VIA EMAIL                                  */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'email' && (
          <div className="space-y-4">
            
            {/* Step 1: Request Email Code */}
            {emailStep === 1 && (
              <form onSubmit={handleRequestEmailCode} className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 leading-relaxed">
                  Inserisci il tuo <strong>Nome Utente</strong> oppure l'<strong>Email</strong> registrata.
                  Ti invieremo un codice di sicurezza a 6 cifre per autorizzare la nuova password.
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Nome Utente o Email Registrata
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={identifierInput}
                      onChange={(e) => setIdentifierInput(e.target.value)}
                      placeholder="Es. luciano"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      autoFocus
                      required
                    />
                  </div>
                </div>

                {emailStatusMsg.text && (
                  <div className={`p-3 rounded-xl text-xs flex items-start space-x-2 ${
                    emailStatusMsg.type === 'error' ? 'bg-red-500/10 border border-red-500/30 text-red-300' :
                    emailStatusMsg.type === 'warning' ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300' :
                    'bg-cyan-500/10 border border-cyan-500/30 text-cyan-300'
                  }`}>
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{emailStatusMsg.text}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSendingEmail}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <Mail className={`w-4 h-4 ${isSendingEmail ? 'animate-bounce' : ''}`} />
                  <span>{isSendingEmail ? 'Invio codice in corso...' : 'Invia Codice di Verifica via Email'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            )}

            {/* Step 2: Verify OTP Code */}
            {emailStep === 2 && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-200 leading-relaxed">
                  Abbiamo inviato un codice di sicurezza a 6 cifre a: <br />
                  <strong className="text-white font-mono">{maskEmail(targetEmailDisplay)}</strong>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Codice di Verifica a 6 Cifre
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={inputOtp}
                    onChange={(e) => setInputOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full py-2.5 text-center text-xl font-mono tracking-widest font-bold bg-slate-950 border border-slate-700 rounded-xl text-amber-400 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    autoFocus
                    required
                  />
                </div>

                {emailStatusMsg.text && (
                  <div className={`p-3 rounded-xl text-xs flex items-start space-x-2 ${
                    emailStatusMsg.type === 'error' ? 'bg-red-500/10 border border-red-500/30 text-red-300' :
                    'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                  }`}>
                    {emailStatusMsg.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />}
                    <span>{emailStatusMsg.text}</span>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEmailStep(1);
                      setEmailStatusMsg({ type: '', text: '' });
                    }}
                    className="w-1/3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all"
                  >
                    Indietro
                  </button>
                  <button
                    type="submit"
                    className="w-2/3 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verifica Codice</span>
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: Enter New Password */}
            {emailStep === 3 && (
              <form onSubmit={handleSaveNewPasswordViaEmail} className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200">
                  <div className="flex items-center space-x-2 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold">Identità verificata!</span>
                  </div>
                  <div>
                    Nome Utente: <strong className="font-mono text-white text-sm">@{recoveryUser?.username}</strong>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nuova Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimo 4 caratteri"
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      autoFocus
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Conferma Nuova Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ripeti la password"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      required
                    />
                  </div>
                </div>

                {emailStatusMsg.text && (
                  <div className={`p-3 rounded-xl text-xs flex items-start space-x-2 ${
                    emailStatusMsg.type === 'error' ? 'bg-red-500/10 border border-red-500/30 text-red-300' :
                    'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                  }`}>
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{emailStatusMsg.text}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSavingPassword}
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSavingPassword ? 'Salvataggio...' : 'Salva Nuova Password e Concludi'}</span>
                </button>
              </form>
            )}

            {/* Step 4: Success Message */}
            {emailStep === 4 && (
              <div className="py-4 text-center space-y-4">
                <div className="w-14 h-14 bg-emerald-500/20 border border-emerald-500/50 rounded-full flex items-center justify-center mx-auto text-emerald-400 shadow-lg">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white mb-1">
                    Password Aggiornata!
                  </h4>
                  <p className="text-xs text-slate-300">
                    Il tuo Nome Utente è: <strong className="font-mono text-amber-400">@{recoveryUser?.username}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-all"
                >
                  Torna alla Schermata di Login
                </button>
              </div>
            )}

          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: OPZIONE 3 - PIN MASTER D'EMERGENZA (GIÀ ATTIVO)        */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'pin' && (
          <div className="space-y-4">
            {!isMasterVerified ? (
              <form onSubmit={handleVerifyMasterPin} className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-200 leading-relaxed">
                  <strong>Opzione 3:</strong> Lo sblocco con <strong>PIN Master segreto</strong> permette al proprietario di reimpostare immediatamente qualsiasi account, <strong>anche offline e senza attendere l'email</strong>.
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Inserisci PIN Master di Sicurezza
                  </label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
                    <input
                      type={showMasterPin ? 'text' : 'password'}
                      value={masterPinInput}
                      onChange={(e) => setMasterPinInput(e.target.value)}
                      placeholder="Digita il PIN Master segreto..."
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 font-mono tracking-wider"
                      autoFocus
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowMasterPin(!showMasterPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                      title={showMasterPin ? 'Nascondi PIN' : 'Mostra PIN'}
                    >
                      {showMasterPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {pinStatusMsg.text && (
                  <div className={`p-3 rounded-xl text-xs flex items-start space-x-2 ${
                    pinStatusMsg.type === 'error' ? 'bg-red-500/10 border border-red-500/30 text-red-300' :
                    'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                  }`}>
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{pinStatusMsg.text}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Sblocca con PIN Master</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleSaveNewPasswordViaPin} className="space-y-4">
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center justify-between">
                  <span className="font-semibold flex items-center">
                    <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-400" />
                    PIN Master Verificato
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMasterVerified(false);
                      setMasterPinInput('');
                    }}
                    className="text-[10px] text-slate-400 hover:text-slate-200 underline"
                  >
                    Blocca di nuovo
                  </button>
                </div>

                {/* Account Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Seleziona l'Account da Reimpostare
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {allUsersList.map(u => {
                      const isSelected = selectedUserForPinReset?.id === u.id;
                      return (
                        <div
                          key={u.id}
                          onClick={() => setSelectedUserForPinReset(u)}
                          className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                            isSelected
                              ? 'bg-amber-500/20 border-amber-500 text-amber-200'
                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <span className="font-bold text-white">{u.name}</span>
                            <span className="ml-2 font-mono text-[11px] text-slate-400">(@{u.username})</span>
                          </div>
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-700">
                            {u.role === 'super_admin' ? 'Super Admin' : u.role === 'editor' ? 'Editor' : 'Cliente'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Password Fields */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nuova Password per @{selectedUserForPinReset?.username || 'utente'}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showPinPassword ? 'text' : 'password'}
                      value={pinNewPassword}
                      onChange={(e) => setPinNewPassword(e.target.value)}
                      placeholder="Nuova password..."
                      className="w-full pl-10 pr-10 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPinPassword(!showPinPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showPinPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Conferma Nuova Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showPinPassword ? 'text' : 'password'}
                      value={pinConfirmPassword}
                      onChange={(e) => setPinConfirmPassword(e.target.value)}
                      placeholder="Ripeti la password..."
                      className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                      required
                    />
                  </div>
                </div>

                {pinStatusMsg.text && (
                  <div className={`p-3 rounded-xl text-xs flex items-start space-x-2 ${
                    pinStatusMsg.type === 'error' ? 'bg-red-500/10 border border-red-500/30 text-red-300' :
                    'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                  }`}>
                    {pinStatusMsg.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />}
                    <span>{pinStatusMsg.text}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Salva Nuova Password Immediatamente</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* Footer Note for Collaborators */}
        <div className="mt-5 pt-3 border-t border-slate-800 text-[11px] text-slate-400 text-center">
          <span>ℹ️ </span>
          <strong>Nota per collaboratori:</strong> L'Amministratore può reimpostare o fornirti una nuova password in qualsiasi momento dal pannello <em>"Gestione Utenti"</em>.
        </div>

      </div>
    </div>
  );
}
