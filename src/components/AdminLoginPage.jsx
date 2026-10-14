import React, { useState, useEffect, useRef } from 'react';
import { 
  Lock, 
  User, 
  KeyRound, 
  ShieldCheck, 
  Car, 
  ArrowRight, 
  Image as ImageIcon, 
  Sparkles, 
  X,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { authenticateUser, authenticateUserAsync, syncUsersWithCloud, getBackgroundImages, USER_ROLES } from '../utils/auth';
import { getClientPermissions } from '../utils/permissions';
import BouncingCarsCanvas from './BouncingCarsCanvas';

export default function AdminLoginPage({ 
  onLoginSuccess, 
  onClose,
  clientPermissions 
}) {
  const loginCardRef = useRef(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [showHelpCredentials, setShowHelpCredentials] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [backgrounds, setBackgrounds] = useState([]);
  const [currentBgIndex, setCurrentBgIndex] = useState(0);

  useEffect(() => {
    const bgList = getBackgroundImages();
    setBackgrounds(bgList);
    // Sync freshest users from Supabase Cloud on login page mount
    syncUsersWithCloud().catch(() => {});
  }, []);

  // Cycle background image automatically every 6 seconds
  useEffect(() => {
    if (backgrounds.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentBgIndex(prev => (prev + 1) % backgrounds.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [backgrounds]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanU = (username || '').trim();
    const cleanP = (password || '').trim();

    if (!cleanU || !cleanP) {
      setErrorMsg('Inserisci sia il Nome Utente che la Password.');
      return;
    }

    setIsChecking(true);
    try {
      const user = await authenticateUserAsync(cleanU, cleanP);

      if (user) {
        onLoginSuccess(user);
      } else {
        setErrorMsg('Credenziali non riconosciute! Verifica nome utente o password.');
      }
    } catch (err) {
      setErrorMsg('Errore di connessione. Riprova tra poco.');
    } finally {
      setIsChecking(false);
    }
  };

  const currentBgUrl = backgrounds[currentBgIndex] || './images/cars/car_2_page.jpg';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in bg-slate-950">
      
      {/* Background Car Image Slideshow with Overlay */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img 
          src={currentBgUrl} 
          alt="Car Background" 
          className="w-full h-full object-cover scale-105 filter brightness-50 contrast-125 transition-all duration-1000 ease-in-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/50 backdrop-blur-sm" />
      </div>

      {/* Interactive 3D Bouncing Supercars Canvas (Ferrari, Lamborghini, Bugatti) */}
      <BouncingCarsCanvas cardRef={loginCardRef} />

      {/* Login Card Shell */}
      <div 
        ref={loginCardRef}
        className="relative z-10 glass-panel w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-white/20 p-6 sm:p-8 bg-slate-900/90 text-slate-100 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Close Button if opened as modal */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-slate-800/80 hover:bg-amber-500 hover:text-slate-950 text-slate-400 rounded-xl border border-slate-700 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Card Header Logo */}
        <div className="text-center space-y-3 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-200 p-0.5 shadow-xl shadow-amber-500/25 mx-auto">
            <div className="w-full h-full bg-[#0b132b] rounded-[14px] flex items-center justify-center">
              <Car className="w-8 h-8 text-amber-400" />
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-bold font-heading bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500">
              BOOK AUTO PB
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-semibold uppercase tracking-widest">
              Accesso Area Riservata
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-center space-x-2 animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Username */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nome Utente
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="es. shirantha oppure luciano"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="username"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/90 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Password
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=""
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="current-password"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-950/90 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Login Button */}
          <button
            type="submit"
            disabled={isChecking}
            className="w-full py-3 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-sm rounded-xl shadow-lg shadow-amber-500/25 transition-all active:scale-95 flex items-center justify-center space-x-2 disabled:opacity-60"
          >
            <span>{isChecking ? 'Verifica credenziali in corso...' : 'Accedi all\'Area Riservata'}</span>
            <ArrowRight className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
          </button>

          {/* Quick Credential Helper Dropdown for Mobile / Desk */}
          <div className="pt-1 text-center">
            <button
              type="button"
              onClick={() => setShowHelpCredentials(!showHelpCredentials)}
              className="text-[11px] text-slate-400 hover:text-amber-400 transition-colors underline"
            >
              {showHelpCredentials ? 'Chiudi aiuto credenziali' : '💡 Aiuto credenziali o accesso rapido'}
            </button>

            {showHelpCredentials && (
              <div className="mt-2.5 p-3 bg-slate-950/95 border border-amber-500/30 rounded-2xl text-[11px] text-slate-300 text-left space-y-2 animate-fade-in shadow-xl">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                  <span className="font-bold text-amber-300 flex items-center space-x-1">
                    <span>🔑 Credenziali Predefinite Book Auto:</span>
                  </span>
                  <span className="text-[9px] text-slate-400">Sincronizzate nel Cloud</span>
                </div>

                <div className="space-y-1.5 text-[10px]">
                  <div className="flex items-center justify-between bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                    <div>
                      <span className="font-bold text-amber-300 block">Super Admin:</span>
                      <span className="text-slate-300">Utente: <code className="text-amber-300 font-bold">shirantha</code> • Pass: <code className="text-amber-300 font-bold">Maduka0822</code></span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setUsername('shirantha'); setPassword('Maduka0822'); }}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[10px] shadow transition-all active:scale-95"
                    >
                      Inserisci
                    </button>
                  </div>

                  <div className="flex items-center justify-between bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                    <div>
                      <span className="font-bold text-emerald-300 block">Gestore / Editor:</span>
                      <span className="text-slate-300">Utente: <code className="text-emerald-300 font-bold">luciano</code> • Pass: <code className="text-emerald-300 font-bold">1234</code></span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setUsername('luciano'); setPassword('1234'); }}
                      className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-[10px] shadow transition-all active:scale-95"
                    >
                      Inserisci
                    </button>
                  </div>
                </div>

                <p className="text-[9px] text-slate-400 leading-tight">
                  ✨ Premi <strong>"Inserisci"</strong> per compilare automaticamente i campi senza errori di digitazione su smartphone.
                </p>
              </div>
            )}
          </div>

          {/* Quick Client / Guest Exploration Mode Button */}
          {(clientPermissions || getClientPermissions())?.allowGuestBrowsing && (
            <div className="pt-1 text-center">
              <div className="flex items-center my-2">
                <div className="flex-1 border-t border-slate-700/60"></div>
                <span className="px-3 text-[10px] uppercase font-bold text-slate-400 tracking-wider">oppure</span>
                <div className="flex-1 border-t border-slate-700/60"></div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onLoginSuccess({
                    id: 'guest_visitor',
                    username: 'visitatore',
                    name: 'Visitatore / Cliente',
                    role: 'viewer',
                    roleLabel: 'Visitatore / Cliente'
                  });
                }}
                className="w-full py-2.5 bg-slate-800/80 hover:bg-slate-700/90 text-cyan-300 hover:text-cyan-200 border border-cyan-500/30 hover:border-cyan-400/50 font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center space-x-2"
              >
                <Eye className="w-4 h-4 text-cyan-400" />
                <span>Esplora Catalogo come Visitatore</span>
              </button>
            </div>
          )}
        </form>

        {/* Background Selector Indicator */}
        {backgrounds.length > 1 && (
          <div className="mt-4 flex items-center justify-center space-x-1.5">
            {backgrounds.map((bg, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentBgIndex(idx)}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentBgIndex ? 'w-6 bg-amber-400' : 'bg-slate-700 hover:bg-slate-500'
                }`}
                title={`Sfondo foto vettura ${idx + 1}`}
              />
            ))}
          </div>
        )}

        {/* Powered by SHI branding */}
        <div className="mt-5 pt-3 border-t border-slate-800/80 text-center">
          <span className="text-[11px] font-bold tracking-widest text-amber-400/90 uppercase bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 inline-block shadow-sm">
            Powered by SHI
          </span>
        </div>

      </div>
    </div>
  );
}
