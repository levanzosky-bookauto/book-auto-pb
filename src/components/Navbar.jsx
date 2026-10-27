import React, { useState, useRef, useEffect } from 'react';
import { 
  Car, 
  Search, 
  Plus, 
  Heart, 
  Download, 
  Upload, 
  RotateCcw, 
  SlidersHorizontal,
  Sparkles,
  Grid,
  List as ListIcon,
  Printer,
  CheckSquare,
  Shield,
  Bell,
  Lock,
  ShieldCheck,
  Settings,
  LogOut,
  User,
  FolderOpen,
  ChevronDown
} from 'lucide-react';
import { isStaffUser, canViewExpirations } from '../utils/permissions';

export default function Navbar({ 
  searchQuery, 
  setSearchQuery, 
  selectedBrand, 
  setSelectedBrand,
  brands, 
  carsCount,
  favoritesCount,
  selectedCount = 0,
  expirationsCount = 0,
  hasUrgentExpirations = false,
  onOpenExpirationsModal,
  onOpenAdminModal,
  onOpenAddModal,
  onOpenBackupModal,
  onResetData,
  onOpenPdfReportModal,
  onOpenBrandLogosModal,
  onlyFavorites,
  setOnlyFavorites,
  viewMode,
  setViewMode,
  currentUser,
  clientPermissions,
  onLogout,
  onRefreshCloudData,
  isSyncing = false,
  onOpenCartellaDocumenti,
  totalDocumentsCount = 0,
  theme = 'military',
  setTheme
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const showExpirations = canViewExpirations(currentUser, clientPermissions);
  const isStaff = isStaffUser(currentUser);

  // Close user dropdown menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen]);

  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-white/10 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo & Title */}
          <div className="flex items-center space-x-2 sm:space-x-3 cursor-pointer shrink-0" onClick={() => { setSelectedBrand('Tutti'); setOnlyFavorites(false); setSearchQuery(''); }}>
            <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-200 p-0.5 shadow-lg shadow-amber-500/20 shrink-0">
              <div className="w-full h-full bg-[#0b132b] rounded-[10px] sm:rounded-[14px] flex items-center justify-center">
                <Car className="w-4 h-4 sm:w-6 sm:h-6 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <span className="font-heading font-bold text-base sm:text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500">
                  BOOK AUTO PB
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium hidden sm:block">
                Collezione Vetture & Specifiche Tecniche
              </p>
            </div>
          </div>

          {/* Search Bar - Responsive & Compact to preserve room for right buttons */}
          <div className="hidden md:flex flex-1 min-w-[120px] max-w-xs lg:max-w-sm xl:max-w-md mx-2 sm:mx-3">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca per Marca, Modello, N° Telaio..."
                className="w-full pl-10 pr-9 py-2 bg-slate-900/90 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all shadow-inner"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700 text-xs text-slate-400 hover:text-white transition-colors"
                  title="Cancella ricerca"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Desktop Right Action Controls */}
          <div className="hidden lg:flex items-center space-x-2 shrink-0">
            
            {/* View Switcher */}
            <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800 shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'grid' 
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Griglia Vetture"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'list' 
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Tabella Dettagliata"
              >
                <ListIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Military Camo / Classic Dark Theme Switcher */}
            {setTheme && (
              <button
                onClick={() => setTheme(theme === 'military' ? 'classic' : 'military')}
                className={`flex items-center space-x-1.5 px-2.5 py-2 rounded-xl text-xs font-bold border transition-all shrink-0 ${
                  theme === 'military'
                    ? 'bg-emerald-950/80 text-amber-300 border-emerald-600/40 shadow-lg shadow-emerald-900/30'
                    : 'bg-slate-900/60 text-slate-300 border-slate-700/60 hover:bg-slate-800 hover:text-white'
                }`}
                title={theme === 'military' ? "Tema Militare Mimetico Attivo (Clicca per Tema Classico)" : "Tema Scuro Classico Attivo (Clicca per Tema Militare Mimetico)"}
              >
                <span className="text-sm">{theme === 'military' ? '🪖' : '🌙'}</span>
                <span className="hidden xl:inline">{theme === 'military' ? 'Mimetico' : 'Classico'}</span>
              </button>
            )}

            {/* Favorite Filter Toggle - Compact: Only Heart + Counter */}
            <button
              onClick={() => setOnlyFavorites(!onlyFavorites)}
              className={`flex items-center space-x-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold border transition-all shrink-0 ${
                onlyFavorites 
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-lg shadow-rose-500/10' 
                  : 'bg-slate-900/60 text-slate-300 border-slate-700/60 hover:bg-slate-800 hover:text-white'
              }`}
              title={onlyFavorites ? "Mostra tutte le vetture" : "Filtra Vetture Preferite"}
            >
              <Heart className={`w-4 h-4 ${onlyFavorites ? 'fill-rose-400 text-rose-400' : 'text-slate-400'}`} />
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-amber-400 font-bold border border-slate-700">
                {favoritesCount}
              </span>
            </button>

            {/* Expirations & Notifications Bell Button - Compact: Only Bell + Counter */}
            {showExpirations && (
              <button
                onClick={onOpenExpirationsModal}
                className={`relative flex items-center space-x-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold border transition-all shrink-0 ${
                  hasUrgentExpirations
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse shadow-lg shadow-rose-500/20'
                    : expirationsCount > 0
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-md shadow-amber-500/10'
                    : 'bg-slate-900/60 text-slate-300 border-slate-700/60 hover:bg-slate-800 hover:text-white'
                }`}
                title="Scadenze & Notifiche Vetture (Bollo, Assicurazione, Revisione, Tagliando)"
              >
                <Bell className={`w-4 h-4 ${hasUrgentExpirations ? 'text-rose-400' : expirationsCount > 0 ? 'text-amber-400' : 'text-slate-400'}`} />
                {expirationsCount > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                    hasUrgentExpirations ? 'bg-rose-500 text-white' : 'bg-amber-500 text-slate-950'
                  }`}>
                    {expirationsCount}
                  </span>
                )}
              </button>
            )}

            {/* Cartella & Archivio Documenti Button - Compact: Only Folder Icon + Counter */}
            {(isStaff || (clientPermissions && clientPermissions.showDocuments)) && (
              <button
                onClick={onOpenCartellaDocumenti}
                className="flex items-center space-x-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold bg-slate-900/60 text-slate-300 border border-slate-700/60 hover:bg-slate-800 hover:border-amber-500/40 hover:text-amber-300 transition-all shrink-0"
                title="Archivio & Cartella Documenti Scansionati (Libretti, Assicurazioni, Bolli)"
              >
                <FolderOpen className="w-4 h-4 text-amber-400" />
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-amber-400 font-bold border border-slate-700">
                  {totalDocumentsCount}
                </span>
              </button>
            )}

            {/* PDF Print Selected Cars Button (if selected) */}
            {selectedCount > 0 && (
              <button
                onClick={onOpenPdfReportModal}
                className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-500/20 transition-all animate-fade-in"
                title="Stampa / Esporta PDF Vetture Selezionate"
              >
                <Printer className="w-4 h-4" />
                <span>PDF ({selectedCount})</span>
              </button>
            )}

            {/* Standalone Admin Button - Exactly in line and bounded within grid width */}
            {isStaff && (
              <button
                type="button"
                onClick={onOpenAdminModal}
                className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-2 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold rounded-xl text-xs shadow-md shadow-amber-500/20 transition-all shrink-0 cursor-pointer active:scale-95 border border-amber-300/40"
                title="Pannello Amministratore & Email"
              >
                <ShieldCheck className="w-4 h-4 text-slate-950" />
                <span>Admin</span>
              </button>
            )}

            {/* Active User Dropdown Menu */}
            {currentUser && (
              <div className="relative shrink-0 pl-1 border-l border-slate-800" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className={`flex items-center space-x-1.5 sm:space-x-2 px-2 sm:px-2.5 py-1.5 rounded-xl border transition-all text-xs font-semibold cursor-pointer ${
                    userMenuOpen
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-md shadow-amber-500/10'
                      : 'bg-slate-900/80 hover:bg-slate-800 border-slate-700/80 hover:border-amber-500/40 text-slate-200'
                  }`}
                  title="Menu Profilo & Utente"
                >
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-300 p-0.5 flex items-center justify-center shrink-0 shadow-sm">
                    <div className="w-full h-full bg-[#0b132b] rounded-[6px] flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                  </div>
                  <div className="flex flex-col text-left leading-tight hidden xl:flex">
                    <span className="font-bold text-xs text-amber-300 flex items-center space-x-1">
                      <span>{currentUser.name || currentUser.username}</span>
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono tracking-tight">
                      {isStaff ? 'Admin ⚙️' : 'Cliente'}
                    </span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${userMenuOpen ? 'rotate-180 text-amber-400' : ''}`} />
                </button>

                {/* Dropdown Menu Popup */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-900/95 border border-amber-500/30 shadow-2xl shadow-black/80 backdrop-blur-xl py-2 z-50 animate-fade-in">
                    {/* User Header */}
                    <div className="px-4 py-2.5 border-b border-slate-800 flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">
                          {currentUser.name || currentUser.username}
                        </p>
                        <p className="text-[10px] text-amber-400/90 font-mono">
                          {currentUser.roleLabel || (isStaff ? 'Super Admin' : 'Visualizzatore')}
                        </p>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="p-1.5 space-y-1 text-xs">
                      {isStaff && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setUserMenuOpen(false);
                              onOpenAdminModal && onOpenAdminModal();
                            }}
                            className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-slate-200 hover:text-slate-950 hover:bg-gradient-to-r hover:from-amber-400 hover:to-amber-500 font-bold transition-all group cursor-pointer text-left shadow-sm"
                          >
                            <ShieldCheck className="w-4 h-4 text-amber-400 group-hover:text-slate-950 shrink-0" />
                            <span>Pannello Admin & Email</span>
                          </button>

                          {onOpenAddModal && (
                            <button
                              type="button"
                              onClick={() => {
                                setUserMenuOpen(false);
                                onOpenAddModal();
                              }}
                              className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer text-left"
                            >
                              <Plus className="w-4 h-4 text-amber-400 shrink-0" />
                              <span>Aggiungi Nuova Vettura</span>
                            </button>
                          )}

                          {onOpenBrandLogosModal && (
                            <button
                              type="button"
                              onClick={() => {
                                setUserMenuOpen(false);
                                onOpenBrandLogosModal();
                              }}
                              className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer text-left"
                            >
                              <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                              <span>Gestione Marchi & Loghi</span>
                            </button>
                          )}

                          {onOpenBackupModal && (
                            <button
                              type="button"
                              onClick={() => {
                                setUserMenuOpen(false);
                                onOpenBackupModal();
                              }}
                              className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer text-left"
                            >
                              <Download className="w-4 h-4 text-amber-400 shrink-0" />
                              <span>Backup Dati & Scansioni</span>
                            </button>
                          )}

                          {onRefreshCloudData && (
                            <button
                              type="button"
                              onClick={() => {
                                setUserMenuOpen(false);
                                onRefreshCloudData();
                              }}
                              className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-cyan-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer text-left"
                            >
                              <RotateCcw className="w-4 h-4 text-cyan-400 shrink-0" />
                              <span>Sincronizza Cloud</span>
                            </button>
                          )}

                          <div className="my-1 border-t border-slate-800" />
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false);
                          onLogout && onLogout();
                        }}
                        className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-rose-300 hover:text-white hover:bg-rose-500/20 transition-all cursor-pointer text-left font-semibold"
                      >
                        <LogOut className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>Disconnetti (Esci)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile Right Controls */}
          <div className="flex lg:hidden items-center space-x-1.5 sm:space-x-2">
            <button
              onClick={() => setOnlyFavorites(!onlyFavorites)}
              className={`p-1.5 sm:p-2 rounded-xl border transition-all active:scale-95 ${
                onlyFavorites ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' : 'bg-slate-900/60 text-slate-300 border-slate-700'
              }`}
              title="Filtra Preferiti"
            >
              <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${onlyFavorites ? 'fill-rose-400' : ''}`} />
            </button>

            {/* Mobile Expirations Bell Button (Directly visible on phones if allowed) */}
            {showExpirations && (
              <button
                type="button"
                onClick={onOpenExpirationsModal}
                className={`relative p-1.5 sm:p-2 rounded-xl border transition-all active:scale-95 ${
                  hasUrgentExpirations
                    ? 'bg-rose-500/25 text-rose-300 border-rose-500/60 shadow-lg shadow-rose-500/30 animate-pulse'
                    : expirationsCount > 0
                    ? 'bg-amber-500/25 text-amber-300 border-amber-500/50 shadow-md shadow-amber-500/20'
                    : 'bg-slate-900/60 text-slate-300 border-slate-700'
                }`}
                title="Scadenze & Notifiche Vetture (Bollo, Assicurazione, Revisione, Tagliando)"
              >
                <Bell className={`w-4 h-4 sm:w-5 sm:h-5 ${hasUrgentExpirations ? 'text-rose-400' : expirationsCount > 0 ? 'text-amber-400' : 'text-slate-400'}`} />
                {expirationsCount > 0 && (
                  <span className={`absolute -top-1 -right-1 min-w-[16px] h-[16px] sm:min-w-[18px] sm:h-[18px] px-1 flex items-center justify-center rounded-full text-[9px] sm:text-[10px] font-extrabold shadow-md ${
                    hasUrgentExpirations ? 'bg-rose-500 text-white' : 'bg-amber-500 text-slate-950'
                  }`}>
                    {expirationsCount}
                  </span>
                )}
              </button>
            )}

            {/* Folder button removed from mobile header to prevent overflow (already accessible in dropdown menu below) */}

            {isStaff && (
              <button
                onClick={onOpenAddModal}
                className="p-1.5 sm:p-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-md transition-all active:scale-95"
                title="Aggiungi Auto"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="relative p-1.5 sm:p-2 text-slate-300 bg-slate-900/80 hover:bg-slate-800 rounded-xl border border-slate-700 transition-all active:scale-95"
              title="Menu Opzioni, Utente & Admin"
            >
              <SlidersHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
              {expirationsCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              )}
            </button>
          </div>

        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden py-3 border-t border-slate-800">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca per Marca, Modello, Telaio..."
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>
        </div>

        {/* Mobile Menu Panel */}
        {mobileMenuOpen && (
          <div className="lg:hidden pb-4 space-y-3 animate-fade-in border-t border-slate-800 pt-3">
            
            {/* User Profile Card */}
            {currentUser && (
              <div className="flex items-center justify-between p-3 bg-slate-900/90 rounded-2xl border border-amber-500/30">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-500/30">
                    <User className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-amber-300 flex items-center space-x-1">
                      <span>{currentUser.name || currentUser.username}</span>
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {currentUser.roleLabel || (currentUser.role === 'super_admin' ? 'Super Admin (Proprietario)' : 'Gestore / Editor')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setMobileMenuOpen(false); onLogout && onLogout(); }}
                  className="flex items-center space-x-1 px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition-all"
                  title="Disconnetti"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Esci</span>
                </button>
              </div>
            )}

            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-slate-400">Modalità di Visualizzazione</span>
              <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1 rounded text-xs ${viewMode === 'grid' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'}`}
                >
                  Griglia
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1 rounded text-xs ${viewMode === 'list' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'}`}
                >
                  Lista
                </button>
              </div>
            </div>

            {/* Mobile Theme Switcher */}
            {setTheme && (
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-slate-400">Tema & Colori Sfondo</span>
                <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setTheme('military')}
                    className={`px-3 py-1 rounded text-xs font-bold flex items-center space-x-1 ${
                      theme === 'military' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                    }`}
                  >
                    <span>🪖</span>
                    <span>Mimetico</span>
                  </button>
                  <button
                    onClick={() => setTheme('classic')}
                    className={`px-3 py-1 rounded text-xs font-bold flex items-center space-x-1 ${
                      theme === 'classic' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                    }`}
                  >
                    <span>🌙</span>
                    <span>Classico</span>
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col space-y-2 pt-2">
              {showExpirations && (
                <button
                  type="button"
                  onClick={() => { setMobileMenuOpen(false); onOpenExpirationsModal && onOpenExpirationsModal(); }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                    hasUrgentExpirations
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse'
                      : expirationsCount > 0
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-md'
                      : 'bg-slate-900 text-slate-300 border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Bell className="w-4 h-4 text-amber-400" />
                    <span>Scadenze & Promemoria Vetture</span>
                  </div>
                  {expirationsCount > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      hasUrgentExpirations ? 'bg-rose-500 text-white' : 'bg-amber-500 text-slate-950'
                    }`}>
                      {expirationsCount}
                    </span>
                  )}
                </button>
              )}

              {(isStaff || (clientPermissions && clientPermissions.showDocuments)) && (
                <button
                  type="button"
                  onClick={() => { setMobileMenuOpen(false); onOpenCartellaDocumenti && onOpenCartellaDocumenti(); }}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold border border-slate-700 bg-slate-900 text-slate-200 hover:border-amber-500/40"
                >
                  <div className="flex items-center space-x-2">
                    <FolderOpen className="w-4 h-4 text-amber-400" />
                    <span>Cartella & Archivio Documenti</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-slate-950">
                    {totalDocumentsCount} File
                  </span>
                </button>
              )}

              {isStaff && (
                <button
                  type="button"
                  onClick={() => { setMobileMenuOpen(false); onOpenAdminModal && onOpenAdminModal(); }}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 rounded-xl text-xs font-extrabold shadow-md active:scale-95 transition-transform"
                >
                  <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                  <span>Pannello Admin & Notifiche Email</span>
                </button>
              )}

              {onRefreshCloudData && (
                <button
                  type="button"
                  onClick={() => { onRefreshCloudData(); }}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 bg-slate-900/90 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-bold shadow transition-all active:scale-95"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-cyan-400' : 'text-cyan-400'}`} />
                  <span>{isSyncing ? 'Sincronizzazione Cloud in corso...' : 'Aggiorna / Sincronizza Dati Cloud'}</span>
                </button>
              )}

              {isStaff && (
                <button
                  type="button"
                  onClick={() => { setMobileMenuOpen(false); onOpenBackupModal && onOpenBackupModal(); }}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-amber-500/40 rounded-xl text-xs font-semibold shadow transition-all active:scale-95"
                >
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>Backup & Export</span>
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </header>
  );
}
