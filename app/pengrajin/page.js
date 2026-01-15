"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import QRCode from "qrcode";

// Komponen Logo Gemini
const GeminiLogo = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M16.4992 2C16.2788 7.10686 19.103 10.5 22 12.0035C18.6665 13.4248 16.389 16.9227 16.4992 22C14.9661 19.7302 11.8267 17.2014 8.5 16.5C10.25 15.5 12 14.2995 12.5 12C10.8333 10.5833 7.5 9.49999 2 9.5C6.29926 8.45971 9.59745 6.55808 11 2.5C12.601 5.52976 14.2707 5.95309 16.4992 2Z" fill="url(#paint0_linear)" />
    <defs>
      <linearGradient id="paint0_linear" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#4E7BFF" />
        <stop offset="1" stopColor="#B57BFF" />
      </linearGradient>
    </defs>
  </svg>
);

export default function Home() {
  const [form, setForm] = useState({
    namaPengrajin: "",
    alamatPengrajin: "",
    namaVerifikator: "",
    uidNFC: "",
    filosofi: "",
    imageBase64: "",
  });

  const [step, setStep] = useState(1);
  const [previewText, setPreviewText] = useState("");

  // Loading states terpisah
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isMinting, setIsMinting] = useState(false);

  // Error & Status
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [txHash, setTxHash] = useState("");
  const [verifyUrl, setVerifyUrl] = useState(""); // URL untuk QR Code dengan signature
  const [qrCodeImage, setQrCodeImage] = useState(""); // QR Code sebagai data URL
  const [isRecording, setIsRecording] = useState(false);

  // Ref untuk timer cleanup
  const recognitionTimerRef = useRef(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(""); // Clear error saat user mengetik
  };

  // Fungsi Kompres Gambar ADAPTIF
  const compressImage = (file, maxWidth = 800, targetSizeKB = 100) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Resize jika terlalu besar
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Adaptive: mulai 90%, turun sampai target tercapai
          let quality = 0.9;
          let compressedBase64 = canvas.toDataURL('image/jpeg', quality);

          while (compressedBase64.length > targetSizeKB * 1024 * 1.37 && quality > 0.3) {
            quality -= 0.1;
            compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          }

          console.log(`📸 Quality: ${Math.round(quality * 100)}%, Size: ~${Math.round(compressedBase64.length / 1024)}KB`);
          resolve(compressedBase64);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  // Fungsi Upload Gambar + Preview (dengan kompresi)
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setStatus("📸 Mengompres gambar...");
      try {
        const compressedImage = await compressImage(file, 400, 30); // max 400px, target 30KB
        setForm((prev) => ({ ...prev, imageBase64: compressedImage }));
        setStatus("✅ Gambar berhasil dikompres");
        setError("");
      } catch (err) {
        setError("Gagal memproses gambar");
      }
    }
  };

  // Validasi Terpusat
  const validateForm = useCallback(() => {
    if (!form.uidNFC) return "Scan NFC terlebih dahulu!";
    if (!form.imageBase64) return "Foto batik wajib diupload!";
    if (!form.namaVerifikator) return "Nama verifikator wajib diisi!";
    if (!form.namaPengrajin) return "Nama pengrajin wajib diisi!";
    return null;
  }, [form]);

  const startListening = () => {
    if (!("webkitSpeechRecognition" in window)) {
      setError("Fitur suara hanya tersedia di Chrome.");
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = "id-ID";
    recognition.continuous = false;

    // Timer dengan cleanup
    recognitionTimerRef.current = setTimeout(() => {
      recognition.stop();
    }, 45000);

    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (e) => {
      clearTimeout(recognitionTimerRef.current);
      setForm((prev) => ({ ...prev, filosofi: prev.filosofi + " " + e.results[0][0].transcript }));
      setIsRecording(false);
    };
    recognition.onerror = (e) => {
      clearTimeout(recognitionTimerRef.current);
      setError("Gagal merekam suara: " + e.error);
      setIsRecording(false);
    };
    recognition.onend = () => {
      clearTimeout(recognitionTimerRef.current);
      setIsRecording(false);
    };
    recognition.start();
  };

  const scanNFC = async () => {
    setError("");
    if (!("NDEFReader" in window)) {
      setError("⚠️ Perangkat ini tidak mendukung NFC. Gunakan smartphone dengan fitur NFC.");
      return;
    }
    try {
      const ndef = new NDEFReader();
      await ndef.scan();
      setStatus("📡 Tempelkan NFC Tag ke perangkat...");
      ndef.onreading = (event) => {
        const uid = event.serialNumber;
        setForm((prev) => ({ ...prev, uidNFC: uid }));
        setStatus("✅ NFC Terbaca: " + uid);
      };
    } catch (err) {
      setError("Gagal scan NFC: " + err.message);
    }
  };

  // --- OPSI 1: MANUAL ---
  const handleManualInput = (e) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    const template = `SERTIFIKAT KEASLIAN BATIK WIDOSARI\n\nKarya otentik ini dibuat oleh pengrajin ${form.namaPengrajin}.\n\nFilosofi:\n"${form.filosofi || 'Melestarikan warisan leluhur.'}"\n\nKarya ini telah diverifikasi keasliannya menggunakan teknologi Blockchain dan NFC.`;

    setPreviewText(template);
    setError("");
    setStep(2);
  };

  // --- OPSI 2: AI PREVIEW ---
  const handleGeneratePreview = async (e) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsAnalyzing(true);
    setError("");
    setStatus("🤖 Gemini 2.5 Flash sedang menganalisis...");

    try {
      const res = await fetch("/api/ai-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namaPengrajin: form.namaPengrajin,
          filosofi: form.filosofi,
          imageBase64: form.imageBase64
        })
      });

      const data = await res.json();

      if (data.success) {
        setPreviewText(data.result);
        setStep(2);
        setStatus("");
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.warn("Fallback:", err.message);
      setError("AI tidak tersedia. Menggunakan mode manual.");
      handleManualInput(e);
    }
    setIsAnalyzing(false);
  };

  // --- MINTING FINAL ---
  const handleFinalMint = async () => {
    setIsMinting(true);
    setError("");
    setStatus("🚀 Mengirim ke Blockchain...");

    try {
      const res = await fetch("/api/mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          finalDescription: previewText
        })
      });
      const data = await res.json();
      if (data.success) {
        setStatus("✅ SUKSES! Sertifikat Tercetak.");
        setTxHash(data.txHash);
        // Simpan verify URL dengan signature untuk QR Code
        if (data.verifyUrl) {
          setVerifyUrl(data.verifyUrl);
          // Generate QR Code otomatis
          const fullUrl = window.location.origin + data.verifyUrl;
          try {
            const qrDataUrl = await QRCode.toDataURL(fullUrl, {
              width: 300,
              margin: 2,
              color: { dark: '#000000', light: '#ffffff' }
            });
            setQrCodeImage(qrDataUrl);
          } catch (qrErr) {
            console.error("Gagal generate QR:", qrErr);
          }
        }
      } else {
        setError(data.error);
        setStatus("");
      }
    } catch (err) {
      setError("Gagal mencetak: " + err.message);
      setStatus("");
    }
    setIsMinting(false);
  };

  const isLoading = isAnalyzing || isMinting;

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden font-sans">

      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950/50 to-slate-950" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />

      {/* Main Content */}
      <div className="relative z-10 min-h-screen p-4 flex justify-center items-center">
        <div className="bg-white/5 backdrop-blur-xl p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-md border border-white/10">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-600 rounded-2xl mb-4 shadow-lg shadow-amber-500/20">
              <span className="text-2xl">🎨</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Posko Digital</h1>
            <p className="text-amber-400/80 font-medium text-xs mt-2 uppercase tracking-[0.2em]">
              {step === 1 ? "Input Data Pengrajin" : "Preview Sertifikat"}
            </p>
          </div>

          {/* ERROR BANNER */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-300 text-sm text-center backdrop-blur">
              ❌ {error}
            </div>
          )}

          {/* STEP 1: FORM INPUT */}
          {step === 1 && (
            <form className="space-y-5">
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Identitas</label>
                <input
                  name="namaPengrajin"
                  placeholder="Nama Pengrajin"
                  onChange={handleChange}
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 outline-none focus:border-amber-500/50 focus:bg-white/10 transition-all"
                  required
                />
                <input
                  name="alamatPengrajin"
                  placeholder="Wallet (0x...) - Opsional"
                  onChange={handleChange}
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-sm text-white font-mono placeholder-slate-500 outline-none focus:border-amber-500/50 focus:bg-white/10 transition-all"
                />
              </div>

              <div className="relative">
                <textarea
                  name="filosofi"
                  placeholder="Filosofi Batik (Suara/Teks)..."
                  value={form.filosofi}
                  onChange={handleChange}
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 h-24 pr-12 outline-none focus:border-amber-500/50 focus:bg-white/10 transition-all resize-none"
                />
                <button
                  type="button"
                  onClick={startListening}
                  className={`absolute right-3 bottom-3 p-2 rounded-xl transition-all ${isRecording ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/50" : "bg-white/10 text-slate-400 hover:bg-white/20 hover:text-white"}`}
                  aria-label="Rekam suara"
                >
                  🎙️
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Upload Foto */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative border-2 border-dashed border-white/10 text-center rounded-2xl hover:border-indigo-500/50 h-24 overflow-hidden flex justify-center items-center transition-all bg-white/5">
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" aria-label="Upload foto batik" />
                    {form.imageBase64 ? (
                      <img src={form.imageBase64} alt="Preview foto batik" className="h-full w-full object-cover" />
                    ) : (
                      <div className="p-3 text-center">
                        <span className="text-2xl">📸</span>
                        <p className="text-[10px] text-slate-500 mt-1">Upload Foto</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Scan NFC */}
                <button
                  type="button"
                  onClick={scanNFC}
                  className={`relative group rounded-2xl flex flex-col items-center justify-center h-24 border-2 transition-all overflow-hidden ${form.uidNFC ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-white/5 border-white/10 text-white hover:border-cyan-500/50"}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-teal-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="relative text-2xl">{form.uidNFC ? "✅" : "📡"}</span>
                  <p className="relative text-[10px] font-bold mt-1 uppercase tracking-wider">{form.uidNFC ? "NFC OK" : "SCAN NFC"}</p>
                </button>
              </div>

              {/* Verifikator */}
              <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                <p className="text-[10px] font-bold text-amber-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                  <span>👮</span> Verifikator
                </p>
                <input
                  name="namaVerifikator"
                  placeholder="Nama Petugas"
                  onChange={handleChange}
                  className="w-full p-3 bg-white/10 border border-amber-500/20 rounded-xl text-sm text-white placeholder-amber-200/50 outline-none focus:border-amber-500/50 transition-all"
                  required
                />
              </div>

              {/* Buttons */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={handleManualInput}
                  disabled={isLoading}
                  className="flex-1 p-4 bg-white/5 border border-white/10 text-slate-300 rounded-xl font-bold text-sm hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
                >
                  ✍️ MANUAL
                </button>
                <button
                  type="button"
                  onClick={handleGeneratePreview}
                  disabled={isLoading}
                  className="flex-[2] p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] transition-all flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  {isAnalyzing ? <span className="animate-pulse">⏳ Berpikir...</span> : <>✨ ANALISIS AI</>}
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: PREVIEW */}
          {step === 2 && (
            <div className="space-y-5">

              {/* Preview Gambar */}
              <div className="w-full h-44 bg-white/5 rounded-2xl overflow-hidden border border-white/10 relative">
                {form.imageBase64 ? (
                  <img src={form.imageBase64} className="w-full h-full object-cover" alt="Preview batik untuk sertifikat" />
                ) : (
                  <div className="flex justify-center items-center h-full text-slate-500">No Image</div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-3 text-white text-[10px] font-mono text-center">
                  🔗 NFC UID: {form.uidNFC || "000000"}
                </div>
              </div>

              {/* Preview Teks */}
              <div className="bg-indigo-500/10 p-5 rounded-2xl border border-indigo-500/20 relative">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Deskripsi Sertifikat</span>
                  <GeminiLogo className="w-5 h-5" />
                </div>
                <textarea
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                  className="w-full h-36 p-4 text-sm text-white bg-white/5 border border-indigo-500/20 rounded-xl focus:border-indigo-500/50 outline-none resize-none transition-all"
                  aria-label="Edit deskripsi sertifikat"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => { setStep(1); setError(""); }}
                  className="flex-1 p-4 bg-white/5 border border-white/10 text-slate-300 rounded-xl font-bold text-xs hover:bg-white/10 transition-all"
                >
                  ⬅ EDIT
                </button>
                <button
                  onClick={handleFinalMint}
                  disabled={isMinting}
                  className="flex-[2] p-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-[1.02] transition-all disabled:opacity-50"
                >
                  {isMinting ? "⏳ MENCETAK..." : "✅ CETAK FINAL"}
                </button>
              </div>
            </div>
          )}

          {/* Status Banner */}
          {status && (
            <div className={`mt-6 p-5 rounded-2xl border text-sm text-center transition-all ${status.includes("SUKSES") ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-white/5 border-white/10 text-slate-300"}`}>
              <p className="font-bold">{status}</p>

              {/* QR Code Section */}
              {qrCodeImage && (
                <div className="mt-4 p-4 bg-white rounded-2xl">
                  <p className="text-xs text-slate-600 font-bold mb-3 text-center">📱 QR Code Sertifikat</p>
                  <div className="flex justify-center mb-4">
                    <img src={qrCodeImage} alt="QR Code Verifikasi" className="w-48 h-48" />
                  </div>
                  <div className="flex gap-2 justify-center">
                    <a
                      href={qrCodeImage}
                      download={`sertifikat-batik-qr.png`}
                      className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 transition-all flex items-center gap-1"
                    >
                      📥 Download QR
                    </a>
                    <button
                      onClick={() => {
                        const printWindow = window.open('', '_blank');
                        printWindow.document.write(`
                          <html>
                            <head><title>QR Code Sertifikat</title></head>
                            <body style="display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;">
                              <div style="text-align:center;">
                                <h2 style="font-family:sans-serif;">Sertifikat Batik</h2>
                                <img src="${qrCodeImage}" style="width:300px;height:300px;" />
                                <p style="font-family:monospace;font-size:10px;word-break:break-all;max-width:300px;">${window.location.origin}${verifyUrl}</p>
                              </div>
                            </body>
                          </html>
                        `);
                        printWindow.document.close();
                        printWindow.print();
                      }}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg text-xs font-bold hover:bg-blue-600 transition-all flex items-center gap-1"
                    >
                      🖨️ Print QR
                    </button>
                  </div>
                </div>
              )}

              {/* Verify URL dengan Signature */}
              {verifyUrl && (
                <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/10">
                  <p className="text-[10px] text-slate-400 mb-2">🔐 URL Verifikasi (dengan Signature):</p>
                  <p className="text-[10px] font-mono text-cyan-300 break-all bg-black/30 p-2 rounded">
                    {typeof window !== 'undefined' ? window.location.origin : ''}{verifyUrl}
                  </p>
                  <p className="text-[9px] text-slate-500 mt-2">Scan QR atau gunakan URL ini — terlindungi signature kriptografis</p>
                </div>
              )}

              {txHash && (
                <a href={`https://polygonscan.com/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 px-4 py-2 bg-white/10 rounded-lg text-xs text-blue-400 hover:text-blue-300 hover:bg-white/20 transition-all">
                  Lihat di Blockchain ↗
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Custom Animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}
