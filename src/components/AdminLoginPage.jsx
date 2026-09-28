import React, { useState, useEffect } from 'react';
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
import { authenticateUser, getBackgroundImages, USER_ROLES } from '../utils/auth';

export default function AdminLoginPage({ 
  onLoginSuccess, 
  onClose 
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [backgrounds, setBackgrounds] = useState([]);
  const [currentBgIndex, setCurrentBgIndex] = useState(0);

  useEffect(() => {
    const bgList = getBackgroundImages();
    setBackgrounds(bgList);
  }, []);

  // Cycle background image automatically every 6 seconds
  useEffect(() => {
    if (backgrounds.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentBgIndex(prev => (prev + 1) % backgrounds.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [backgrounds]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim() || !password.trim()) {
      setErrorMsg('Inserisci sia il Nome Utente che la Password.');
      return;
    }

    const user = authenticateUser(username, password);

    if (user) {
      onLoginSuccess(user);
    } else {
      setErrorMsg('Credenziali errate! Verifica nome utente o password.');
    }
  };

  const currentBgUrl = backgrounds[currentBgIndex] || '/images/cars/car_2_page.jpg';

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

      {/* Login Card Shell */}
      <div 
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
                placeholder=""
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
            className="w-full py-3 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-sm rounded-xl shadow-lg shadow-amber-500/25 transition-all active:scale-95 flex items-center justify-center space-x-2"
          >
            <span>Accedi all'Area Riservata</span>
            <ArrowRight className="w-4 h-4" />
          </button>
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
