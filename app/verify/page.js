"use client";

import { Suspense, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import ThemeToggle, { useTheme } from "../components/ThemeToggle";

function formatDate(value) {
  if (!value) return "Belum tercatat";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function VerificationContent() {
  const searchParams = useSearchParams();
  const isDark = useTheme();
  const expectedTokenId = searchParams.get("id") || "";
  const readerRef = useRef(null);
  const handledScanRef = useRef(false);
  const [data, setData] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const [error, setError] = useState("");

  const startNfcScan = async () => {
    setData(null);
    setError("");
    setScanMessage("");
    handledScanRef.current = false;

    if (!("NDEFReader" in window)) {
      setError("Pemindaian NFC tidak didukung di perangkat ini. Buka halaman ini melalui Chrome di Android dengan NFC aktif.");
      return;
    }

    try {
      const reader = new NDEFReader();
      readerRef.current = reader;
      await reader.scan();
      setIsScanning(true);
      setScanMessage("Dekatkan chip NFC fisik ke bagian belakang ponsel.");

      reader.onreading = async (event) => {
        if (handledScanRef.current) return;
        handledScanRef.current = true;
        const nfcUid = event.serialNumber;
        if (!nfcUid) {
          setIsScanning(false);
          setError("Perangkat tidak memberikan UID dari chip NFC. Coba gunakan ponsel Android lain yang mendukung Web NFC.");
          return;
        }

        setScanMessage("UID chip terbaca. Memeriksa kecocokan pada blockchain…");
        try {
          const response = await fetch("/api/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nfcUid, expectedTokenId: expectedTokenId || undefined }),
          });
          const result = await response.json();
          if (!response.ok || !result.success) {
            setError(result.error || "Chip NFC tidak dapat diverifikasi.");
            setScanMessage("");
          } else {
            setData(result.data);
            setError("");
            setScanMessage("Chip NFC terdaftar dan cocok dengan sertifikat blockchain.");
          }
        } catch (requestError) {
          setError("Gagal menghubungi server verifikasi. Periksa koneksi lalu coba lagi.");
          setScanMessage("");
          console.error("NFC verify request failed:", requestError);
        } finally {
          setIsScanning(false);
        }
      };

      reader.onreadingerror = () => {
        setIsScanning(false);
        setError("Chip NFC tidak terbaca. Pastikan chip berada dekat ponsel dan coba lagi.");
        setScanMessage("");
      };
    } catch (scanError) {
      setIsScanning(false);
      setError(scanError.message || "Tidak dapat memulai pemindaian NFC.");
    }
  };

  const imageUrl = data?.metadata?.image?.startsWith("ipfs://")
    ? `https://gateway.pinata.cloud/ipfs/${data.metadata.image.slice("ipfs://".length)}`
    : data?.metadata?.image;
  const materials = data?.materials || [];

  return (
    <main className={`min-h-screen relative overflow-hidden px-4 py-10 ${isDark ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900"}`}>
      <ThemeToggle />
      <div className={`absolute inset-0 pointer-events-none ${isDark ? "bg-gradient-to-br from-slate-950 via-indigo-950/40 to-slate-950" : "bg-gradient-to-br from-white via-emerald-50 to-slate-50"}`} />
      <div className="relative z-10 mx-auto w-full max-w-2xl">
        <header className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-3xl shadow-lg shadow-emerald-500/20">📡</div>
          <p className="text-xs uppercase tracking-[0.25em] text-emerald-400">Nusantara Batik Chain</p>
          <h1 className="mt-2 text-3xl font-black">Verifikasi melalui NFC</h1>
          <p className={`mx-auto mt-3 max-w-lg text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
            Sertifikat hanya ditampilkan setelah UID chip fisik cocok dengan data pada blockchain.
          </p>
        </header>

        {!data && (
          <section className={`rounded-3xl border p-6 text-center shadow-xl ${isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-white"}`}>
            {expectedTokenId && <p className="mb-4 text-xs font-mono text-slate-500">Token #{expectedTokenId} — chip tetap harus dipindai</p>}
            <button
              type="button"
              onClick={startNfcScan}
              disabled={isScanning}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-4 font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
            >
              {isScanning ? "📡 Menunggu chip NFC…" : "📡 Pindai Chip NFC"}
            </button>
            {scanMessage && <p className="mt-4 text-sm text-emerald-400" role="status">{scanMessage}</p>}
            {error && <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300" role="alert">{error}</p>}
            <p className={`mt-5 text-xs leading-relaxed ${isDark ? "text-slate-500" : "text-slate-500"}`}>
              Perlu perangkat NFC dan browser yang mendukung Web NFC. Perangkat yang tidak mendukung NFC belum dapat digunakan untuk verifikasi.
            </p>
          </section>
        )}

        {data && (
          <article className={`overflow-hidden rounded-3xl border shadow-2xl ${isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-white"}`}>
            <div className="bg-gradient-to-r from-emerald-500/15 to-teal-500/15 px-6 py-7 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-3xl">✅</div>
              <h2 className="mt-3 text-2xl font-black">TERVERIFIKASI</h2>
              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-emerald-400">Nusantara Batik Chain</p>
            </div>

            <div className="space-y-5 p-6">
              <div className="text-center">
                <h3 className="text-xl font-bold">{data.metadata?.name || `Sertifikat #${data.id}`}</h3>
                <p className="mt-2 inline-block rounded-full bg-white/10 px-3 py-1 font-mono text-xs text-slate-400">Token #{data.id}</p>
              </div>

              {imageUrl && (
                <div className="relative aspect-[4/3] max-h-[32rem] min-h-48 w-full overflow-hidden rounded-2xl border border-white/10 bg-black/10 p-2">
                  <Image src={imageUrl} alt={data.metadata?.name || "Foto batik"} fill sizes="(max-width: 768px) 100vw, 600px" unoptimized className="object-contain" />
                </div>
              )}

              <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">STATUS NFC CHIP</p>
                <p className="mt-1 font-bold text-emerald-200">{data.verificationLabel}</p>
                <p className="mt-2 text-xs leading-relaxed text-emerald-100/80">{data.statusExplanation} Status sertifikat: {data.status}.</p>
                <p className="mt-3 break-all font-mono text-xs text-slate-300">UID: {data.nfcUid}</p>
              </section>

              <section className={`rounded-2xl p-4 ${isDark ? "bg-white/5" : "bg-slate-50"}`}>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Tanggal Terbit</p>
                <p className="mt-1 text-sm">{formatDate(data.issuedAt)}</p>
              </section>

              <section className={`rounded-2xl p-4 ${isDark ? "bg-white/5" : "bg-slate-50"}`}>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Jenis Batik</p>
                <p className="mt-1 text-sm">{data.technique || "Belum dicatat"}</p>
              </section>

              <section className={`rounded-2xl p-4 ${isDark ? "bg-white/5" : "bg-slate-50"}`}>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Bahan yang Digunakan</p>
                {materials.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {materials.map((material) => <span key={material} className="rounded-full bg-amber-500/10 px-3 py-1 text-xs text-amber-300">{material}</span>)}
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-slate-400">Belum dicatat</p>
                )}
                {data.materialsSource === "application" && <p className="mt-2 text-[10px] text-amber-400/80">Data pelengkap aplikasi; metadata blockchain lama tidak diubah.</p>}
              </section>

              {data.metadata?.description && (
                <section className={`rounded-2xl p-4 ${isDark ? "bg-white/5" : "bg-slate-50"}`}>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Keterangan</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{data.metadata.description}</p>
                </section>
              )}

              <button type="button" onClick={() => { setData(null); setError(""); setScanMessage(""); }} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-slate-300 transition hover:bg-white/10">
                Pindai chip lain
              </button>
            </div>
          </article>
        )}
      </div>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <VerificationContent />
    </Suspense>
  );
}
