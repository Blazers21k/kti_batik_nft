"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function LandingPage() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('nbc-theme');
    if (saved) setIsDark(saved === 'dark');
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem('nbc-theme', next ? 'dark' : 'light');
  };

  return (
    <div className={`min-h-screen relative overflow-hidden font-sans transition-colors duration-500 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>

      {/* Animated Gradient Background */}
      <div className={`absolute inset-0 animate-gradient-shift transition-colors duration-500 ${isDark ? 'bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950' : 'bg-gradient-to-br from-slate-50 via-blue-50 to-amber-50'}`} />

      {/* Floating Orbs - Decorative */}
      <div className={`absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl animate-pulse-slow ${isDark ? 'bg-amber-500/10' : 'bg-amber-400/20'}`} />
      <div className={`absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-3xl animate-pulse-slow delay-1000 ${isDark ? 'bg-indigo-500/10' : 'bg-indigo-400/15'}`} />
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl ${isDark ? 'bg-teal-500/5' : 'bg-teal-400/10'}`} />

      {/* Grid Pattern Overlay */}
      <div className={`absolute inset-0 bg-[linear-gradient(rgba(${isDark ? '255,255,255' : '0,0,0'},${isDark ? '0.02' : '0.03'})_1px,transparent_1px),linear-gradient(90deg,rgba(${isDark ? '255,255,255' : '0,0,0'},${isDark ? '0.02' : '0.03'})_1px,transparent_1px)] bg-[size:60px_60px]`} />

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className={`fixed top-5 right-5 z-[100] w-12 h-12 rounded-full backdrop-blur-xl border transition-all duration-300 hover:scale-110 active:scale-95 shadow-lg flex items-center justify-center ${isDark ? 'bg-white/10 border-white/20 text-yellow-300 hover:bg-white/20' : 'bg-black/5 border-black/10 text-indigo-600 hover:bg-black/10'}`}
        aria-label="Toggle theme"
      >
        {isDark ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/>
            <line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        )}
      </button>

      {/* Main Content */}
      <div className={`relative z-10 min-h-screen flex flex-col justify-center items-center p-6 transition-colors duration-500 ${isDark ? 'text-white' : 'text-slate-800'}`}>

        {/* Hero Section */}
        <div className="text-center mb-16">
          {/* Logo */}
          <div className="relative inline-block mb-6">
            <div className={`absolute inset-0 blur-3xl opacity-30 animate-pulse ${isDark ? 'bg-gradient-to-r from-amber-400 to-yellow-600' : 'bg-gradient-to-r from-amber-300 to-yellow-500'}`} />
            <img src="/Logo.png" alt="Nusantara Batik Chain" className="relative w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 object-contain filter drop-shadow-2xl" style={{ mixBlendMode: isDark ? 'lighten' : 'multiply' }} />
          </div>

          {/* Tagline with Decorative Line */}
          <div className="flex items-center justify-center gap-4 mt-4">
            <div className={`h-px w-12 bg-gradient-to-r from-transparent ${isDark ? 'to-amber-500/50' : 'to-amber-600/40'}`} />
            <p className={`text-sm md:text-base font-medium tracking-[0.3em] uppercase ${isDark ? 'text-blue-200/80' : 'text-indigo-500/80'}`}>
              AI Motif Analyzer • Blockchain Verified
            </p>
            <div className={`h-px w-12 bg-gradient-to-l from-transparent ${isDark ? 'to-amber-500/50' : 'to-amber-600/40'}`} />
          </div>
        </div>

        {/* Menu Cards */}
        <div className="grid gap-6 w-full max-w-lg">

          {/* Card: Pengrajin */}
          <Link href="/pengrajin" className="group relative block">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className={`relative p-6 md:p-8 backdrop-blur-xl rounded-2xl border transition-all duration-300 overflow-hidden ${isDark ? 'bg-white/5 border-white/10 group-hover:border-amber-500/30 group-hover:bg-white/10' : 'bg-white/60 border-slate-200 group-hover:border-amber-400 group-hover:bg-white/80 shadow-sm group-hover:shadow-md'}`}>
              <div className={`absolute inset-0 bg-gradient-to-r from-transparent to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ${isDark ? 'via-white/5' : 'via-black/[0.02]'}`} />
              <div className="relative flex items-center gap-5">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                  <span className="text-3xl">🎨</span>
                </div>
                <div className="flex-1 text-left">
                  <h3 className={`font-bold text-xl md:text-2xl transition-colors ${isDark ? 'text-white group-hover:text-amber-100' : 'text-slate-800 group-hover:text-amber-700'}`}>
                    Area Pengrajin
                  </h3>
                  <p className={`text-sm mt-1 transition-colors ${isDark ? 'text-slate-400 group-hover:text-slate-300' : 'text-slate-500 group-hover:text-slate-600'}`}>
                    Daftarkan Karya & Cetak Sertifikat NFT
                  </p>
                </div>
                <div className={`text-2xl transition-all duration-300 group-hover:translate-x-2 ${isDark ? 'text-amber-500/50 group-hover:text-amber-400' : 'text-amber-400/50 group-hover:text-amber-600'}`}>
                  →
                </div>
              </div>
            </div>
          </Link>

          {/* Card: Verifikasi */}
          <Link href="/verify" className="group relative block">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-teal-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className={`relative p-6 md:p-8 backdrop-blur-xl rounded-2xl border transition-all duration-300 overflow-hidden ${isDark ? 'bg-white/5 border-white/10 group-hover:border-cyan-500/30 group-hover:bg-white/10' : 'bg-white/60 border-slate-200 group-hover:border-cyan-400 group-hover:bg-white/80 shadow-sm group-hover:shadow-md'}`}>
              <div className={`absolute inset-0 bg-gradient-to-r from-transparent to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ${isDark ? 'via-white/5' : 'via-black/[0.02]'}`} />
              <div className="relative flex items-center gap-5">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                  <span className="text-3xl">🔍</span>
                </div>
                <div className="flex-1 text-left">
                  <h3 className={`font-bold text-xl md:text-2xl transition-colors ${isDark ? 'text-white group-hover:text-cyan-100' : 'text-slate-800 group-hover:text-cyan-700'}`}>
                    Verifikasi Publik
                  </h3>
                  <p className={`text-sm mt-1 transition-colors ${isDark ? 'text-slate-400 group-hover:text-slate-300' : 'text-slate-500 group-hover:text-slate-600'}`}>
                    Cek Keaslian & Filosofi Batik
                  </p>
                </div>
                <div className={`text-2xl transition-all duration-300 group-hover:translate-x-2 ${isDark ? 'text-cyan-500/50 group-hover:text-cyan-400' : 'text-cyan-400/50 group-hover:text-cyan-600'}`}>
                  →
                </div>
              </div>
            </div>
          </Link>

          {/* Card: Portal Pengrajin — hidden for now, enable when ready */}
          {false && (
          <Link href="/login" className="group relative block">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-green-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className={`relative p-6 md:p-8 backdrop-blur-xl rounded-2xl border transition-all duration-300 overflow-hidden ${isDark ? 'bg-white/5 border-white/10 group-hover:border-emerald-500/30 group-hover:bg-white/10' : 'bg-white/60 border-slate-200 group-hover:border-emerald-400 group-hover:bg-white/80 shadow-sm group-hover:shadow-md'}`}>
              <div className={`absolute inset-0 bg-gradient-to-r from-transparent to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ${isDark ? 'via-white/5' : 'via-black/[0.02]'}`} />
              <div className="relative flex items-center gap-5">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                  <span className="text-3xl">🔐</span>
                </div>
                <div className="flex-1 text-left">
                  <h3 className={`font-bold text-xl md:text-2xl transition-colors ${isDark ? 'text-white group-hover:text-emerald-100' : 'text-slate-800 group-hover:text-emerald-700'}`}>
                    Portal Pengrajin
                  </h3>
                  <p className={`text-sm mt-1 transition-colors ${isDark ? 'text-slate-400 group-hover:text-slate-300' : 'text-slate-500 group-hover:text-slate-600'}`}>
                    Login & Lihat Karya Tersertifikasi
                  </p>
                </div>
                <div className={`text-2xl transition-all duration-300 group-hover:translate-x-2 ${isDark ? 'text-emerald-500/50 group-hover:text-emerald-400' : 'text-emerald-400/50 group-hover:text-emerald-600'}`}>
                  →
                </div>
              </div>
            </div>
          </Link>
          )}
        </div>

        {/* Trust Badges */}
        <div className={`mt-16 flex items-center gap-6 text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span>Polygon Network</span>
          </div>
          <div className={`w-px h-4 ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`} />
          <div className="flex items-center gap-2">
            <span>⚡</span>
            <span>Gemini 2.5 Flash</span>
          </div>
          <div className={`w-px h-4 ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`} />
          <div className="flex items-center gap-2">
            <span>▲</span>
            <span>Vercel</span>
          </div>
        </div>

        {/* Footer */}
        <p className={`mt-6 text-xs font-mono text-center ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
          Studi Implementasi Blockchain untuk Otentikasi Batik • Desa Widosari
        </p>
      </div>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }
        .animate-gradient-shift {
          background-size: 200% 200%;
          animation: gradient-shift 15s ease infinite;
        }
        .animate-shimmer {
          animation: shimmer 3s ease-in-out infinite;
        }
        .animate-pulse-slow {
          animation: pulse-slow 8s ease-in-out infinite;
        }
        .delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
    </div>
  );
}
