"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AccountButton() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    // Cek apakah sudah login
    const token = localStorage.getItem("user_token");
    const userData = localStorage.getItem("user_data");

    if (token && userData) {
      try {
        const parsed = JSON.parse(userData);
        setUser(parsed);
      } catch {
        // data corrupt
      }
    }

    // Listen untuk perubahan login status
    const handleStorage = () => {
      const t = localStorage.getItem("user_token");
      const d = localStorage.getItem("user_data");
      if (t && d) {
        try { setUser(JSON.parse(d)); } catch { setUser(null); }
      } else {
        setUser(null);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    const token = localStorage.getItem("user_token");
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {}
    localStorage.removeItem("user_token");
    localStorage.removeItem("user_data");
    setUser(null);
    setIsOpen(false);
    router.push("/login");
  };

  // Ambil inisial dari nama user
  const getInitials = (nama) => {
    if (!nama) return "?";
    const parts = nama.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return nama.slice(0, 2).toUpperCase();
  };

  // Jika belum login, tampilkan tombol login
  if (!user) {
    return (
      <Link
        href="/login"
        className="fixed top-5 right-5 z-[100] flex items-center gap-2 px-4 py-2.5 rounded-full backdrop-blur-xl border bg-white/10 border-white/20 text-white hover:bg-white/20 transition-all duration-300 shadow-lg hover:scale-105 active:scale-95"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <polyline points="10 17 15 12 10 7" />
          <line x1="15" y1="12" x2="3" y2="12" />
        </svg>
        <span className="text-sm font-medium">Masuk</span>
      </Link>
    );
  }

  // Jika sudah login, tampilkan avatar + dropdown
  return (
    <div ref={menuRef} className="fixed top-5 right-5 z-[100]">
      {/* Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center gap-2.5 pl-4 pr-2 py-1.5 rounded-full backdrop-blur-xl border bg-white/10 border-white/20 hover:bg-white/20 transition-all duration-300 shadow-lg hover:scale-105 active:scale-95"
      >
        <span className="text-sm font-medium text-white/80 hidden sm:block max-w-[120px] truncate">
          {user.nama}
        </span>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-sm font-bold shadow-md shadow-emerald-500/20">
          {getInitials(user.nama)}
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-14 right-0 w-64 backdrop-blur-2xl bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-slideDown">
          {/* User Info */}
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-base font-bold shadow-md">
                {getInitials(user.nama)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user.nama}</p>
                <p className="text-xs text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="p-2">
            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-300 hover:text-white hover:bg-white/10 transition-all"
            >
              <span>📊</span>
              <span>Dashboard</span>
            </Link>
            <Link
              href="/pengrajin"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-300 hover:text-white hover:bg-white/10 transition-all"
            >
              <span>🎨</span>
              <span>Area Pengrajin</span>
            </Link>
            <Link
              href="/gallery"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-300 hover:text-white hover:bg-white/10 transition-all"
            >
              <span>🖼️</span>
              <span>Gallery</span>
            </Link>
          </div>

          {/* Logout */}
          <div className="p-2 border-t border-white/10">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all w-full text-left"
            >
              <span>🚪</span>
              <span>Keluar</span>
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-slideDown {
          animation: slideDown 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
