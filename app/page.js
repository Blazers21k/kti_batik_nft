"use client";
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden font-sans">

      {/* Animated Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 animate-gradient-shift" />

      {/* Floating Orbs - Decorative */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl animate-pulse-slow delay-1000" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-3xl" />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col justify-center items-center p-6 text-white">

        {/* Hero Section */}
        <div className="text-center mb-16">
          {/* Ornamental Icon */}
          <div className="relative inline-block mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-yellow-600 blur-2xl opacity-30 animate-pulse" />
            <span className="relative text-8xl md:text-9xl filter drop-shadow-2xl">⚜️</span>
          </div>

          {/* Main Title */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-4">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 animate-shimmer bg-[length:200%_auto]">
              NUSANTARA
            </span>
            <br />
            <span className="text-white/90 font-light tracking-wide text-3xl md:text-4xl lg:text-5xl">
              BATIK CHAIN
            </span>
          </h1>

          {/* Tagline with Decorative Line */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-amber-500/50" />
            <p className="text-blue-200/80 text-sm md:text-base font-medium tracking-[0.3em] uppercase">
              AI Curator • Blockchain Verified
            </p>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-amber-500/50" />
          </div>
        </div>

        {/* Menu Cards - Glassmorphism Style */}
        <div className="grid gap-6 w-full max-w-lg">

          {/* Card: Pengrajin */}
          <Link href="/pengrajin" className="group relative block">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative p-6 md:p-8 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 group-hover:border-amber-500/30 group-hover:bg-white/10 transition-all duration-300 overflow-hidden">
              {/* Shine Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

              <div className="relative flex items-center gap-5">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                  <span className="text-3xl">🎨</span>
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-bold text-xl md:text-2xl text-white group-hover:text-amber-100 transition-colors">
                    Area Pengrajin
                  </h3>
                  <p className="text-sm text-slate-400 mt-1 group-hover:text-slate-300 transition-colors">
                    Daftarkan Karya & Cetak Sertifikat NFT
                  </p>
                </div>
                <div className="text-2xl text-amber-500/50 group-hover:text-amber-400 group-hover:translate-x-2 transition-all duration-300">
                  →
                </div>
              </div>
            </div>
          </Link>

          {/* Card: Verifikasi */}
          <Link href="/verify" className="group relative block">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-teal-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative p-6 md:p-8 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 group-hover:border-cyan-500/30 group-hover:bg-white/10 transition-all duration-300 overflow-hidden">
              {/* Shine Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

              <div className="relative flex items-center gap-5">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                  <span className="text-3xl">🔍</span>
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-bold text-xl md:text-2xl text-white group-hover:text-cyan-100 transition-colors">
                    Verifikasi Publik
                  </h3>
                  <p className="text-sm text-slate-400 mt-1 group-hover:text-slate-300 transition-colors">
                    Cek Keaslian & Filosofi Batik
                  </p>
                </div>
                <div className="text-2xl text-cyan-500/50 group-hover:text-cyan-400 group-hover:translate-x-2 transition-all duration-300">
                  →
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Trust Badges */}
        <div className="mt-16 flex items-center gap-6 text-slate-500 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span>Polygon Network</span>
          </div>
          <div className="w-px h-4 bg-slate-700" />
          <div className="flex items-center gap-2">
            <span>⚡</span>
            <span>Gemini 2.5 Flash</span>
          </div>
          <div className="w-px h-4 bg-slate-700" />
          <div className="flex items-center gap-2">
            <span>▲</span>
            <span>Vercel</span>
          </div>
        </div>

        {/* Footer - inside content flow */}
        <p className="mt-6 text-slate-600 text-xs font-mono text-center">
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
