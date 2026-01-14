"use client";
import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";

// Komponen Logo Gemini (SVG)
const GeminiLogo = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
    <path d="M16.4992 2C16.2788 7.10686 19.103 10.5 22 12.0035C18.6665 13.4248 16.389 16.9227 16.4992 22C14.9661 19.7302 11.8267 17.2014 8.5 16.5C10.25 15.5 12 14.2995 12.5 12C10.8333 10.5833 7.5 9.49999 2 9.5C6.29926 8.45971 9.59745 6.55808 11 2.5C12.601 5.52976 14.2707 5.95309 16.4992 2Z" fill="url(#paint0_linear_verify)" />
    <defs>
      <linearGradient id="paint0_linear_verify" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#10B981" />
        <stop offset="1" stopColor="#3B82F6" />
      </linearGradient>
    </defs>
  </svg>
);

// Helper: Format tanggal dengan aman
const formatDate = (dateString) => {
  if (!dateString || dateString === "-") return "-";
  try {
    return new Date(dateString).toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
};

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id");
  const sig = searchParams.get("sig");

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // QR Scanner states
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  const getAttribute = (traitType) => {
    if (!data?.metadata?.attributes) return "-";
    const attr = data.metadata.attributes.find(a => a.trait_type === traitType);
    return attr ? attr.value : "-";
  };

  // Start QR Scanner
  const startScanner = async () => {
    setScanError("");
    setIsScanning(true);

    try {
      const { Html5Qrcode } = await import("html5-qrcode");

      // Wait for DOM to be ready
      setTimeout(async () => {
        if (!scannerRef.current) return;

        html5QrCodeRef.current = new Html5Qrcode("qr-reader");

        await html5QrCodeRef.current.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            // Success - parse URL and redirect
            console.log("QR Scanned:", decodedText);
            stopScanner();

            // Extract id and sig from URL
            try {
              const url = new URL(decodedText);
              const scannedId = url.searchParams.get("id");
              const scannedSig = url.searchParams.get("sig");

              if (scannedId) {
                const newUrl = `/verify?id=${scannedId}${scannedSig ? `&sig=${scannedSig}` : ''}`;
                router.push(newUrl);
              } else {
                setScanError("QR Code tidak valid - tidak ada Token ID");
              }
            } catch (e) {
              // Maybe it's just an ID number
              if (/^\d+$/.test(decodedText)) {
                router.push(`/verify?id=${decodedText}`);
              } else {
                setScanError("Format QR tidak dikenali");
              }
            }
          },
          (errorMessage) => {
            // Ignore scan errors (normal when no QR in view)
          }
        );
      }, 100);
    } catch (err) {
      console.error("Scanner error:", err);
      setScanError("Gagal mengakses kamera. Pastikan izin kamera diberikan.");
      setIsScanning(false);
    }
  };

  // Stop QR Scanner
  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current = null;
      } catch (e) {
        console.log("Scanner already stopped");
      }
    }
    setIsScanning(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  useEffect(() => {
    if (!id) { setLoading(false); return; }

    // Build verify URL with signature if present
    const verifyUrl = sig
      ? `/api/verify?id=${id}&sig=${encodeURIComponent(sig)}`
      : `/api/verify?id=${id}`;

    fetch(verifyUrl)
      .then((res) => res.json())
      .then((result) => {
        setTimeout(() => {
          if (result.success) {
            setData(result.data);
          } else {
            setError(result.error || "Data tidak valid.");
          }
          setLoading(false);
        }, 500);
      })
      .catch((err) => {
        console.error("Verify fetch error:", err);
        setError("Gagal menghubungi server.");
        setLoading(false);
      });
  }, [id]);

  // TAMPILAN 1: BELUM ADA ID - dengan QR Scanner
  if (!id) return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden flex flex-col justify-center items-center p-6">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950/30 to-slate-950" />
      <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />

      <div className="relative z-10 bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 text-center max-w-sm w-full">

        {!isScanning ? (
          <>
            <div className="text-6xl mb-4">📷</div>
            <h1 className="text-2xl font-bold text-white mb-2">Verifikasi Batik</h1>
            <p className="text-slate-400 text-sm mb-6">Scan QR Code atau Tempel NFC.</p>

            {/* Scan Button */}
            <button
              onClick={startScanner}
              className="w-full p-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
            >
              📸 SCAN QR CODE
            </button>

            {/* Security Notice */}
            <div className="mt-6 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <p className="text-[10px] text-amber-300/80">
                💡 <strong>QR Code</strong> = Akses cepat ke data<br />
                🔐 <strong>NFC Tag</strong> = Bukti keaslian penuh
              </p>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold text-white mb-4">Arahkan ke QR Code</h2>

            {/* Scanner Container */}
            <div
              id="qr-reader"
              ref={scannerRef}
              className="w-full aspect-square rounded-xl overflow-hidden bg-black/50 mb-4"
            />

            {/* Error Message */}
            {scanError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm">
                {scanError}
              </div>
            )}

            {/* Cancel Button */}
            <button
              onClick={stopScanner}
              className="w-full p-3 bg-white/10 border border-white/10 text-slate-300 rounded-xl font-bold text-sm hover:bg-white/20 transition-all"
            >
              ✕ BATAL
            </button>
          </>
        )}
      </div>
    </div>
  );

  // TAMPILAN 2: LOADING
  if (loading) return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden flex flex-col justify-center items-center" role="status">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-emerald-950/20 to-slate-950" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />

      <div className="relative z-10 text-center">
        <GeminiLogo className="w-24 h-24 mx-auto animate-spin" style={{ animationDuration: '3s' }} />
        <p className="mt-6 text-emerald-400/80 animate-pulse text-sm font-mono tracking-wider">Memverifikasi Keaslian...</p>
      </div>
    </div>
  );

  // TAMPILAN 3: ERROR/PALSU
  if (error) return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden flex justify-center items-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-red-950/20 to-slate-950" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-red-500/10 rounded-full blur-3xl" />

      <div className="relative z-10 bg-red-500/10 backdrop-blur-xl p-8 rounded-3xl border border-red-500/30 text-center max-w-sm" role="alert">
        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-5xl">⚠️</span>
        </div>
        <h1 className="text-2xl font-bold text-red-400 mb-3">TIDAK VALID</h1>
        <p className="text-red-300/80 text-sm">{error}</p>
      </div>
    </div>
  );

  // TAMPILAN 4: Data tidak tersedia
  if (!data || !data.metadata) return (
    <div className="min-h-screen bg-slate-950 flex justify-center items-center p-4">
      <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 text-center">
        <p className="text-slate-400">Data tidak tersedia.</p>
      </div>
    </div>
  );

  // TAMPILAN 5: SUKSES (PREMIUM)
  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden font-sans">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-emerald-950/20 to-slate-950" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:50px_50px]" />

      {/* Main Content */}
      <div className="relative z-10 min-h-screen p-4 flex justify-center items-center">
        <div className="bg-white/5 backdrop-blur-xl w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-white/10">

          {/* Header - Verified Badge */}
          <header className="relative p-8 text-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-teal-500/20" />
            <GeminiLogo className="w-32 h-32 absolute -right-8 -top-8 opacity-10 rotate-12" />

            <div className="relative z-10">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
                <span className="text-4xl">✅</span>
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight">TERVERIFIKASI</h1>
              <p className="text-emerald-300/80 text-xs font-medium mt-2 uppercase tracking-[0.3em]">Nusantara Batik Chain</p>

              {/* Verification Level Indicator - Dynamic */}
              <div className={`mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${data.verificationLevel === 'qr_signed'
                ? 'bg-emerald-500/20 border border-emerald-500/30'
                : data.verificationLevel === 'qr_invalid'
                  ? 'bg-red-500/20 border border-red-500/30'
                  : 'bg-white/10'
                }`}>
                <span className="text-xs">
                  {data.verificationLevel === 'qr_signed' ? '🔐' : data.verificationLevel === 'qr_invalid' ? '⚠️' : '📱'}
                </span>
                <span className={`text-[10px] font-medium ${data.verificationLevel === 'qr_signed'
                  ? 'text-emerald-300'
                  : data.verificationLevel === 'qr_invalid'
                    ? 'text-red-300'
                    : 'text-amber-300'
                  }`}>
                  {data.verificationLabel || 'Verifikasi via QR/Link'}
                </span>
              </div>
            </div>
          </header>

          <main className="p-6 space-y-5">

            {/* Judul Batik */}
            <div className="text-center pb-5 border-b border-white/10">
              <h2 className="text-xl font-bold text-white">{data.metadata.name}</h2>
              <div className="inline-block bg-white/10 px-4 py-1.5 rounded-full mt-3">
                <p className="text-[10px] text-slate-400 font-mono">TOKEN ID #{data.id}</p>
              </div>
            </div>

            {/* Deskripsi AI */}
            <article className="bg-indigo-500/10 p-5 rounded-2xl border border-indigo-500/20 relative">
              <span className="absolute top-3 left-4 text-4xl text-indigo-400/30 font-serif">"</span>
              <p className="text-sm text-indigo-100 italic leading-relaxed relative z-10 px-4 font-serif">
                {data.metadata.description}
              </p>
              <div className="mt-4 flex justify-end items-center gap-2">
                <GeminiLogo className="w-4 h-4" />
                <span className="text-[10px] font-bold text-indigo-400">AI Curator</span>
              </div>
            </article>

            {/* Detail Keamanan */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">STATUS</p>
                <p className={`text-sm font-bold ${data.status?.includes("AKTIF") ? "text-emerald-400" : "text-amber-400"}`}>{data.status}</p>
              </div>
              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">NFC CHIP</p>
                <p className="text-sm font-mono text-slate-300 truncate" title={data.nfcUid}>{getAttribute("NFC UID")}</p>
              </div>
            </div>

            {/* Jejak Audit (Verifikator) */}
            <div className="bg-amber-500/10 p-4 rounded-xl border border-amber-500/20 flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center text-xl">👮</div>
              <div>
                <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Diverifikasi Oleh</p>
                <p className="text-sm font-bold text-white">{getAttribute("Verified By")}</p>
                <p className="text-[10px] text-amber-300/60 font-mono mt-0.5">
                  {formatDate(getAttribute("Date"))}
                </p>
              </div>
            </div>

            {/* NFC Verification Notice - Dynamic based on verification level */}
            {data.verificationLevel === 'qr_signed' ? (
              <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20 text-center">
                <p className="text-[10px] text-emerald-300/80 leading-relaxed">
                  ✅ <strong className="text-emerald-200">QR Code ini tersignature dan valid.</strong><br />
                  Data terjamin berasal dari sertifikat asli yang dicetak di blockchain.
                </p>
              </div>
            ) : data.verificationLevel === 'qr_invalid' ? (
              <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20 text-center">
                <p className="text-[10px] text-red-300/80 leading-relaxed">
                  ⚠️ <strong className="text-red-200">Signature QR tidak valid!</strong><br />
                  QR Code ini mungkin dipalsukan atau dimodifikasi. Verifikasi dengan NFC untuk kepastian.
                </p>
              </div>
            ) : (
              <div className="bg-cyan-500/10 p-4 rounded-xl border border-cyan-500/20 text-center">
                <p className="text-[10px] text-cyan-300/80 leading-relaxed">
                  💡 <strong className="text-cyan-200">Verifikasi ini via QR/Link.</strong><br />
                  Untuk keaslian penuh, minta penjual menempelkan <strong className="text-cyan-200">NFC Tag</strong> ke perangkat Anda.
                </p>
              </div>
            )}

            {/* Owner */}
            <footer className="text-center pt-4 border-t border-white/10">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Pemilik Saat Ini</p>
              <p className="font-mono text-[10px] text-slate-400 bg-white/5 inline-block px-3 py-2 rounded-lg mt-2 truncate max-w-full border border-white/10">
                {data.owner}
              </p>
            </footer>
          </main>
        </div>
      </div>

      {/* Custom CSS */}
      <style jsx>{`
        @keyframes glow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex justify-center items-center">
        <div className="text-slate-500 animate-pulse">Loading...</div>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
