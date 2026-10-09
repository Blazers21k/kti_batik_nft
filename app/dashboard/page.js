"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

function imageSource(value) {
  if (!value?.startsWith("ipfs://")) return value;
  return `https://gateway.pinata.cloud/ipfs/${value.slice("ipfs://".length)}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [karya, setKarya] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedKarya, setSelectedKarya] = useState(null);
  const [adminArtisans, setAdminArtisans] = useState([]);
  const [adminCertificateRecords, setAdminCertificateRecords] = useState([]);
  const [assignmentTokenId, setAssignmentTokenId] = useState("");
  const [assignmentArtisanId, setAssignmentArtisanId] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [materialsDrafts, setMaterialsDrafts] = useState({});
  const [techniqueDrafts, setTechniqueDrafts] = useState({});

  const fetchKarya = useCallback(async (token, isAdmin) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [galleryResponse, mineResponse] = await Promise.all([
        fetch("/api/gallery"),
        fetch("/api/certificates/mine", { headers }),
      ]);
      const [galleryData, mineData] = await Promise.all([galleryResponse.json(), mineResponse.json()]);
      if (!galleryResponse.ok || !galleryData.success) throw new Error(galleryData.error || "Gagal memuat sertifikat.");

      if (isAdmin) {
        const [artisansResponse, recordsResponse] = await Promise.all([
          fetch("/api/admin/artisans", { headers }),
          fetch("/api/admin/certificates", { headers }),
        ]);
        const [artisansData, recordsData] = await Promise.all([artisansResponse.json(), recordsResponse.json()]);
        if (!artisansResponse.ok || !recordsResponse.ok) throw new Error("Gagal memuat alat pengelolaan admin.");
        const records = recordsData.records || [];
        const assignedIds = new Set(records.map((record) => String(record.tokenId)));
        setAdminArtisans(artisansData.artisans || []);
        setAdminCertificateRecords(records);
        setKarya((galleryData.data || []).map((item) => ({
          ...item,
          canEditTechnique: (!item.techniqueSource || item.techniqueSource === "application")
            && assignedIds.has(String(item.tokenId)),
          canEditMaterials: !item.materialsSource || item.materialsSource === "application"
            ? assignedIds.has(String(item.tokenId))
            : false,
        })));
      } else {
        if (!mineResponse.ok || !mineData.success) throw new Error(mineData.error || "Gagal memuat sertifikat akun.");
        const ownedIds = new Set((mineData.records || []).map((record) => String(record.tokenId)));
        setKarya((galleryData.data || [])
          .filter((item) => ownedIds.has(String(item.tokenId)))
          .map((item) => ({
            ...item,
            canEditMaterials: !item.materialsSource || item.materialsSource === "application",
            canEditTechnique: !item.techniqueSource || item.techniqueSource === "application",
          })));
      }
    } catch (err) {
      console.error("Gagal memuat karya:", err);
      setAdminMessage(err.message || "Gagal memuat data sertifikat.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
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
            const nextSession = {
              nama: data.user.nama,
              email: data.user.email,
              isAdmin: Boolean(data.isAdmin),
            };
            setSession(nextSession);
            fetchKarya(token, nextSession.isAdmin);
            return;
          } else {
            localStorage.removeItem("user_token");
            localStorage.removeItem("user_data");
          }
        } catch {
          try {
            const cached = JSON.parse(userData);
            const nextSession = { nama: cached.nama, email: cached.email, isAdmin: false };
            setSession(nextSession);
            fetchKarya(token, false);
            return;
          } catch {
            localStorage.removeItem("user_token");
            localStorage.removeItem("user_data");
          }
        }
      }

      router.push("/login");
    };

    checkSession();
  }, [fetchKarya, router]);

  const assignLegacyCertificate = async () => {
    if (!assignmentTokenId || !assignmentArtisanId) return;
    const token = localStorage.getItem("user_token");
    const manageAsAdmin = assignmentArtisanId === "__NBC_ADMIN__";
    setAdminMessage(manageAsAdmin ? "Menghubungkan sertifikat ke pengelolaan NBC…" : "Menghubungkan sertifikat ke akun pengrajin…");
    try {
      const response = await fetch(`/api/admin/certificates/${assignmentTokenId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          artisanUserId: manageAsAdmin ? "" : assignmentArtisanId,
          manageAsAdmin,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Gagal menghubungkan sertifikat.");
      setAdminMessage(manageAsAdmin
        ? `Sertifikat #${assignmentTokenId} berhasil ditautkan ke pengelolaan NBC.`
        : `Sertifikat #${assignmentTokenId} berhasil ditautkan ke akun pengrajin.`);
      setAssignmentTokenId("");
      setAssignmentArtisanId("");
      await fetchKarya(token, true);
    } catch (error) {
      setAdminMessage(error.message || "Gagal menghubungkan sertifikat.");
    }
  };

  const saveSupplementalData = async (tokenId) => {
    const token = localStorage.getItem("user_token");
    const item = karya.find((certificate) => String(certificate.tokenId) === String(tokenId));
    const body = {};
    if (item?.canEditMaterials) {
      const materials = (materialsDrafts[tokenId] ?? (item.materials || []).join(", "))
        .split(",").map((value) => value.trim()).filter(Boolean);
      if (materials.length) body.materials = materials;
    }
    if (item?.canEditTechnique) {
      const technique = techniqueDrafts[tokenId] ?? (item.techniqueSource === "application" ? item.technique || "" : "");
      if (technique.trim()) body.technique = technique.trim();
    }
    setAdminMessage("Menyimpan data pelengkap sertifikat…");
    try {
      const response = await fetch(`/api/certificates/${tokenId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Gagal menyimpan data pelengkap.");
      setAdminMessage(`Jenis batik dan bahan sertifikat #${tokenId} tersimpan sebagai data pelengkap aplikasi.`);
      await fetchKarya(token, Boolean(session?.isAdmin));
    } catch (error) {
      setAdminMessage(error.message || "Gagal menyimpan data pelengkap.");
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
              {session.isAdmin ? "🛡️ Admin NBC" : "🎨 Pengrajin"}
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

        {session.isAdmin && (
          <section className="max-w-6xl mx-auto mb-8 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
            <h2 className="font-bold text-amber-200">Hubungkan sertifikat lama</h2>
            <p className="mt-1 text-xs text-slate-400">Pilih akun pengrajin jika mereka memakai dashboard, atau pilih pengelolaan NBC jika kamu mengurus sertifikat tanpa meminta akun mereka.</p>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
              <select value={assignmentTokenId} onChange={(event) => setAssignmentTokenId(event.target.value)} className="rounded-xl border border-white/10 bg-slate-900 p-3 text-sm text-white">
                <option value="">Pilih sertifikat lama</option>
                {karya.filter((item) => !adminCertificateRecords.some((record) => String(record.tokenId) === String(item.tokenId))).map((item) => (
                  <option key={item.tokenId} value={item.tokenId}>#{item.tokenId} — {item.name}</option>
                ))}
              </select>
              <select value={assignmentArtisanId} onChange={(event) => setAssignmentArtisanId(event.target.value)} className="rounded-xl border border-white/10 bg-slate-900 p-3 text-sm text-white">
                <option value="">Pilih pengelola data</option>
                <option value="__NBC_ADMIN__">Kelola oleh NBC (tanpa akun pengrajin)</option>
                {adminArtisans.map((artisan) => <option key={artisan.id} value={artisan.id}>{artisan.nama} ({artisan.email})</option>)}
              </select>
              <button type="button" onClick={assignLegacyCertificate} disabled={!assignmentTokenId || !assignmentArtisanId} className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">Hubungkan</button>
            </div>
          </section>
        )}

        {adminMessage && <p className="max-w-6xl mx-auto mb-5 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300" role="status">{adminMessage}</p>}

        {/* Karya Grid */}
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <span>📋</span>
            <span>{session.isAdmin ? "Semua Sertifikat" : "Karya Saya"}</span>
            <span className="text-sm font-normal text-slate-500">— {session.isAdmin ? "Pengelolaan sertifikat NBC" : "Daftar sertifikat yang ditautkan ke akun Anda"}</span>
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
                      key={item.tokenId || index}
                  onClick={() => setSelectedKarya(selectedKarya === index ? null : index)}
                  className="group bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 hover:border-emerald-500/30 transition-all duration-300 overflow-hidden cursor-pointer"
                >
                  {/* Image */}
                  {item.image && (
                    <div className="relative aspect-[4/3] max-h-96 overflow-hidden bg-black/10 p-2">
                      <Image
                        src={imageSource(item.image)}
                        alt={item.name || "Batik"}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        unoptimized
                        className="object-contain transition-transform duration-500"
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
                        {(item.issuedAt || item.attributes?.find(a => ["Tanggal Terbit", "Date", "Tanggal Sertifikasi"].includes(a.trait_type))?.value) && (
                          <div>
                            <p className="text-xs text-slate-500">Tanggal Terbit</p>
                            <p className="text-sm text-white">
                              {new Date(item.issuedAt || item.attributes.find(a => ["Tanggal Terbit", "Date", "Tanggal Sertifikasi"].includes(a.trait_type)).value).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                            </p>
                          </div>
                        )}

                        <div>
                          <p className="text-xs text-slate-500">Jenis Batik</p>
                          <p className="text-sm text-white mt-1">{item.technique || item.attributes?.find(a => ["Jenis Batik", "Teknik Batik", "Teknik Pembuatan"].includes(a.trait_type))?.value || "Belum dicatat"}</p>
                          {item.techniqueSource === "application" && <p className="mt-1 text-[10px] text-amber-300/80">Data pelengkap aplikasi; metadata blockchain lama tidak diubah.</p>}
                        </div>

                        <div>
                          <p className="text-xs text-slate-500">Bahan yang Digunakan</p>
                          <p className="text-sm text-white mt-1">{item.materials?.length ? item.materials.join(", ") : "Belum dicatat"}</p>
                          {item.materialsSource === "application" && <p className="mt-1 text-[10px] text-amber-300/80">Data pelengkap aplikasi; metadata blockchain lama tidak diubah.</p>}
                        </div>

                        {(item.canEditMaterials || item.canEditTechnique) && (
                          <div className="space-y-2" onClick={(event) => event.stopPropagation()}>
                            {item.canEditTechnique && (
                              <>
                                <label className="block text-xs text-slate-400" htmlFor={`technique-${item.tokenId}`}>Lengkapi jenis batik</label>
                                <input
                                  id={`technique-${item.tokenId}`}
                                  value={techniqueDrafts[item.tokenId] ?? (item.techniqueSource === "application" ? item.technique || "" : "")}
                                  onChange={(event) => setTechniqueDrafts((prev) => ({ ...prev, [item.tokenId]: event.target.value }))}
                                  placeholder="Contoh: Printing"
                                  className="w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-sm text-white outline-none focus:border-amber-500/50"
                                />
                              </>
                            )}
                            {item.canEditMaterials && (
                              <>
                                <label className="block text-xs text-slate-400" htmlFor={`materials-${item.tokenId}`}>Lengkapi bahan (pisahkan dengan koma)</label>
                                <textarea
                                  id={`materials-${item.tokenId}`}
                                  value={materialsDrafts[item.tokenId] ?? (item.materials || []).join(", ")}
                                  onChange={(event) => setMaterialsDrafts((prev) => ({ ...prev, [item.tokenId]: event.target.value }))}
                                  className="w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-sm text-white outline-none focus:border-amber-500/50"
                                  rows={2}
                                />
                              </>
                            )}
                            <button type="button" onClick={() => saveSupplementalData(item.tokenId)} className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400">Simpan data pelengkap</button>
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
                          <span>📡</span>
                          <span>Buka halaman verifikasi NFC</span>
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
