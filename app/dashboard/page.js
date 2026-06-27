"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [karya, setKarya] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedKarya, setSelectedKarya] = useState(null);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const token = localStorage.getItem("user_token");
    const userData = localStorage.getItem("user_data");

    if (token && userData) {
      try {
        const res = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setSession({
            nama: data.user.nama,
            email: data.user.email,
          });
          fetchKarya(data.user.nama);
          return;
        } else {
          // Session expired, hapus token
          localStorage.removeItem("user_token");
          localStorage.removeItem("user_data");
        }
      } catch {
        // Network error, coba pakai cached data
        try {
          const cached = JSON.parse(userData);
          setSession({ nama: cached.nama, email: cached.email });
          fetchKarya(cached.nama);
          return;
        } catch {
          localStorage.removeItem("user_token");
          localStorage.removeItem("user_data");
        }
      }
    }

    // Tidak ada session, redirect ke login
    router.push("/login");
  };

  const fetchKarya = async (nama) => {
    try {
      const res = await fetch(`/api/gallery?pengrajin=${encodeURIComponent(nama)}`);
      const data = await res.json();
      if (data.sertifikat) {
        setKarya(data.sertifikat);
      }
    } catch (err) {
      console.error("Gagal memuat karya:", err);
    } finally {
      setIsLoading(false);
    }
  };

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
    router.push("/login");
  };

  if (!session) return null;

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden font-sans">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950" />
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-emerald-500/8 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-amber-500/8 rounded-full blur-3xl" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />

      {/* Content */}
      <div className="relative z-10 min-h-screen p-6 text-white">

        {/* Header Bar */}
        <div className="max-w-6xl mx-auto flex items-center justify-between mb-8">
          <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <span>←</span>
            <span className="text-sm">Beranda</span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-emerald-400">{session.nama}</p>
              <p className="text-xs text-slate-500">
                {session.email}
              </p>
            </div>
            <span className="px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              🎨 Pengrajin
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-400 hover:text-red-400 hover:border-red-500/30 transition-all"
            >
              Keluar
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-600 rounded-xl flex items-center justify-center">
                <span className="text-xl">🎨</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{karya.length}</p>
                <p className="text-xs text-slate-400">Total Karya</p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-xl flex items-center justify-center">
                <span className="text-xl">✅</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{karya.length}</p>
                <p className="text-xs text-slate-400">Tersertifikasi</p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-xl">⛓️</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-400">On-Chain</p>
                <p className="text-xs text-slate-400">Status Blockchain</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="max-w-6xl mx-auto flex gap-3 mb-8">
          <Link
            href="/pengrajin"
            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all duration-300 flex items-center gap-2"
          >
            <span>➕</span>
            <span>Daftarkan Karya Baru</span>
          </Link>
          {/* Hide gallery link for now
          <Link
            href="/gallery"
            className="px-6 py-3 bg-white/5 border border-white/10 hover:border-white/20 text-white rounded-xl transition-all flex items-center gap-2"
          >
            <span>🖼️</span>
            <span>Gallery Publik</span>
          </Link>
          */}
        </div>

        {/* Karya Grid */}
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <span>📋</span>
            <span>Karya Saya</span>
            <span className="text-sm font-normal text-slate-500">— Daftar sertifikat yang telah diterbitkan</span>
          </h2>

          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="flex items-center gap-3 text-slate-400">
                <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Memuat karya dari blockchain...</span>
              </div>
            </div>
          ) : karya.length === 0 ? (
            <div className="text-center py-20">
              <span className="text-6xl mb-4 block">🎭</span>
              <p className="text-slate-400 text-lg">Belum ada karya terdaftar</p>
              <p className="text-slate-500 text-sm mt-2">Mulai daftarkan karya batik pertama Anda</p>
              <Link
                href="/pengrajin"
                className="inline-block mt-6 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all"
              >
                Daftarkan Karya →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {karya.map((item, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedKarya(selectedKarya === index ? null : index)}
                  className="group bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 hover:border-emerald-500/30 transition-all duration-300 overflow-hidden cursor-pointer"
                >
                  {/* Image */}
                  {item.image && (
                    <div className="aspect-square overflow-hidden">
                      <img
                        src={item.image}
                        alt={item.name || "Batik"}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  )}

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-white mb-1 truncate">
                      {item.name || `Sertifikat #${index + 1}`}
                    </h3>

                    {/* Token ID Badge */}
                    {item.tokenId && (
                      <span className="inline-block px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-400 mb-2">
                        Token #{item.tokenId}
                      </span>
                    )}

                    {/* Description Preview */}
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {item.description || "Deskripsi tidak tersedia"}
                    </p>

                    {/* Expanded Details */}
                    {selectedKarya === index && (
                      <div className="mt-4 pt-4 border-t border-white/10 space-y-3 animate-fadeIn">
                        {/* NFC UID */}
                        {item.attributes?.find(a => a.trait_type === "NFC UID") && (
                          <div>
                            <p className="text-xs text-slate-500">NFC UID</p>
                            <p className="text-sm text-white font-mono">
                              {item.attributes.find(a => a.trait_type === "NFC UID").value}
                            </p>
                          </div>
                        )}

                        {/* Tanggal */}
                        {item.attributes?.find(a => a.trait_type === "Tanggal Sertifikasi") && (
                          <div>
                            <p className="text-xs text-slate-500">Tanggal Sertifikasi</p>
                            <p className="text-sm text-white">
                              {item.attributes.find(a => a.trait_type === "Tanggal Sertifikasi").value}
                            </p>
                          </div>
                        )}

                        {/* Full Description */}
                        <div>
                          <p className="text-xs text-slate-500">Deskripsi Lengkap</p>
                          <p className="text-sm text-slate-300 mt-1">
                            {item.description}
                          </p>
                        </div>

                        {/* Verify Link */}
                        <Link
                          href={`/verify?id=${item.tokenId}`}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-xs text-cyan-400 hover:bg-cyan-500/20 transition-all"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span>🔍</span>
                          <span>Lihat Halaman Verifikasi</span>
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Click Indicator */}
                  <div className="px-4 pb-3">
                    <p className="text-xs text-slate-600 text-center">
                      {selectedKarya === index ? "▲ Tutup detail" : "▼ Klik untuk detail"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="mt-12 text-slate-600 text-xs font-mono text-center">
          Nusantara Batik Chain • Dashboard Pengrajin • Data tersimpan di Polygon Blockchain
        </p>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
