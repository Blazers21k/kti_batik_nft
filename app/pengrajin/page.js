"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import ThemeToggle, { useTheme } from "../components/ThemeToggle";
import { BATIK_TECHNIQUES } from "../lib/batik-techniques";

const MATERIAL_GROUPS = [
  { name: "Kain", options: ["Mori primisima", "Mori prima", "Mori biru", "Mori blaco/belacu", "Katun", "Sutra", "Tenun gedog"] },
  { name: "Bahan proses batik", options: ["Malam/lilin batik", "Pewarna alam", "Pewarna sintetis", "Mordan/tawas"] },
];

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
  const isDark = useTheme();
  const router = useRouter();
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isAdminSession, setIsAdminSession] = useState(false);

  const [form, setForm] = useState({
    namaPengrajin: "",
    alamatPengrajin: "",
    uidNFC: "",
    filosofi: "",
    imageBase64: "",
    technique: "",
    materials: [],
  });
  const [customMaterial, setCustomMaterial] = useState("");

  const [step, setStep] = useState(1);
  const [previewText, setPreviewText] = useState("");

  // Loading states terpisah
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isMinting, setIsMinting] = useState(false);

  // Error & Status
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [txHash, setTxHash] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  const [verifyUrl, setVerifyUrl] = useState(""); // URL pembuka halaman yang tetap meminta scan NFC
  const [isRecording, setIsRecording] = useState(false);
  const [gasEstimate, setGasEstimate] = useState(null); // Estimasi gas fee
  const [isEstimating, setIsEstimating] = useState(false);
  const [ipfsUrl, setIpfsUrl] = useState(""); // IPFS URL untuk gambar
  const [nfcCheck, setNfcCheck] = useState(null); // { isRegistered, tokenName, tokenId } | null
  const [isCheckingNfc, setIsCheckingNfc] = useState(false);

  // RAG & Acknowledgment states
  const [aiReferences, setAiReferences] = useState([]); // Referensi dari RAG
  const [ragUsed, setRagUsed] = useState(false); // Apakah RAG aktif
  const [acknowledgments, setAcknowledgments] = useState({
    aiAcknowledged: false,  // Saya paham uraian dibantu AI
    originalWork: false     // Karya asli buatan saya
  });
  const [showSourcesModal, setShowSourcesModal] = useState(false); // Modal T&C sumber referensi

  // Ref untuk timer cleanup
  const recognitionTimerRef = useRef(null);

  // Auth guard: cek login sebelum akses area pengrajin
  useEffect(() => {
    const userToken = localStorage.getItem("user_token");

    if (!userToken) {
      router.replace("/login");
      return;
    }

    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${userToken}` } })
      .then(async (response) => {
        if (!response.ok) throw new Error("Sesi login tidak valid.");
        return response.json();
      })
      .then((data) => {
        const adminSession = Boolean(data.isAdmin);
        setIsAdminSession(adminSession);
        setForm((prev) => ({
          ...prev,
          namaPengrajin: adminSession ? "" : data.user?.nama || "",
        }));
        setIsAuthChecking(false);
      })
      .catch(() => {
        localStorage.removeItem("user_token");
        localStorage.removeItem("user_data");
        router.replace("/login");
      });
  }, [router]);

  const validateForm = useCallback(() => {
    if (!form.uidNFC) return "Scan NFC terlebih dahulu!!";
    if (!form.imageBase64) return "Foto batik wajib diupload!";
    if (!form.namaPengrajin) return "Nama pengrajin wajib diisi!";
    if (!form.technique) return "Pilih jenis batik terlebih dahulu.";
    if (!form.materials.length) return "Pilih atau tambahkan minimal satu bahan batik.";
    return null;
  }, [form]);

  // Loading screen saat mengecek autentikasi
  if (isAuthChecking) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-600 rounded-2xl mb-4 shadow-lg shadow-amber-500/20 animate-pulse">
            <span className="text-3xl">🔐</span>
          </div>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Memeriksa autentikasi...</p>
        </div>
      </div>
    );
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(""); // Clear error saat user mengetik
  };

  const toggleMaterial = (material) => {
    setForm((prev) => ({
      ...prev,
      materials: prev.materials.includes(material)
        ? prev.materials.filter((item) => item !== material)
        : [...prev.materials, material],
    }));
    setError("");
  };

  const addCustomMaterial = () => {
    const material = customMaterial.trim();
    if (!material) return;
    setForm((prev) => prev.materials.some((item) => item.toLowerCase() === material.toLowerCase())
      ? prev
      : { ...prev, materials: [...prev.materials, material] });
    setCustomMaterial("");
    setError("");
  };

  // Kompresi asinkron dengan timeout agar file yang tak didukung tidak membuat UI menggantung.
  const compressImage = (file, maxWidth = 800, targetSizeKB = 100) => new Promise((resolve, reject) => {
    let settled = false;
    let objectUrl = "";
    const timeoutId = window.setTimeout(() => fail(new Error("Kompresi gambar terlalu lama. Coba pilih foto JPG atau PNG yang lebih kecil.")), 45000);

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = "";
      }
    };
    const fail = (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const succeed = (value) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    };

    if (!file?.type?.startsWith("image/")) {
      fail(new Error("File bukan gambar yang didukung. Pilih JPG atau PNG."));
      return;
    }

    // `Image` is also imported from next/image above, so `new Image()` resolves
    // to the React component rather than the browser's image constructor.
    const img = document.createElement("img");
    img.onerror = () => fail(new Error("Format foto tidak dapat dibaca browser. Coba ubah ke JPG atau PNG."));
    img.onload = async () => {
      try {
        if (!img.naturalWidth || !img.naturalHeight) throw new Error("Ukuran foto tidak valid.");

        const scale = Math.min(1, maxWidth / img.naturalWidth, 1200 / img.naturalHeight);
        const width = Math.max(1, Math.round(img.naturalWidth * scale));
        const height = Math.max(1, Math.round(img.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Browser tidak dapat memproses foto ini.");
        context.drawImage(img, 0, 0, width, height);

        const toBlob = (quality) => new Promise((resolveBlob, rejectBlob) => {
          canvas.toBlob((blob) => {
            if (blob) resolveBlob(blob);
            else rejectBlob(new Error("Browser gagal mengompres foto."));
          }, "image/jpeg", quality);
        });

        let quality = 0.88;
        let blob = await toBlob(quality);
        while (blob.size > targetSizeKB * 1024 && quality > 0.48) {
          quality = Math.max(0.48, quality - 0.1);
          blob = await toBlob(quality);
        }

        const reader = new FileReader();
        reader.onerror = () => fail(new Error("Hasil kompresi tidak dapat dibaca."));
        reader.onload = () => {
          if (typeof reader.result !== "string") {
            fail(new Error("Hasil kompresi gambar tidak valid."));
            return;
          }
          console.log(`📸 Quality: ${Math.round(quality * 100)}%, Size: ~${Math.round(blob.size / 1024)}KB`);
          succeed(reader.result);
        };
        reader.readAsDataURL(blob);
      } catch (error) {
        fail(error);
      }
    };

    objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;
  });

  // Fungsi Upload Gambar + Preview (dengan kompresi + IPFS)
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      console.log(`📁 File asli: ${file.name}, Size: ${Math.round(file.size / 1024)}KB`);
      setStatus("📸 Mengompres gambar...");
      setIpfsUrl(""); // Reset IPFS URL

      try {
        const compressedImage = await compressImage(file, 600, 100); // Kualitas bagus karena pakai IPFS
        const compressedSizeKB = Math.round(compressedImage.length / 1024);
        console.log(`✅ Setelah kompresi: ${compressedSizeKB}KB`);
        setForm((prev) => ({ ...prev, imageBase64: compressedImage }));

        // Upload ke IPFS langsung supaya estimate gas lebih murah
        setStatus("📤 Mengupload ke IPFS...");
        const ipfsRes = await fetch("/api/ipfs-upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: compressedImage,
            fileName: `batik_${Date.now()}.jpg`
          })
        });
        const ipfsData = await ipfsRes.json();

        if (ipfsData.success) {
          setIpfsUrl(ipfsData.ipfsUrl);
          setStatus(`✅ Upload IPFS berhasil! (${compressedSizeKB}KB)`);
          console.log("✅ IPFS URL:", ipfsData.ipfsUrl);
        } else {
          console.warn("⚠️ IPFS gagal, akan gunakan base64:", ipfsData.error);
          setStatus(`✅ Gambar dikompres: ${compressedSizeKB}KB (tanpa IPFS)`);
        }
        setError("");
      } catch (err) {
        console.error("❌ Gagal proses gambar:", err);
        setStatus("");
        setError(err.message || "Gagal memproses gambar. Coba foto JPG atau PNG.");
      }
    }
  };

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

  // Cek NFC UID di blockchain
  const checkNfcOnChain = async (uid) => {
    setIsCheckingNfc(true);
    setNfcCheck(null);
    try {
      const res = await fetch(`/api/check-nfc?uid=${encodeURIComponent(uid)}`);
      const data = await res.json();
      if (data.success) {
        setNfcCheck(data);
        if (data.isRegistered) {
          setStatus(`⚠️ NFC sudah terdaftar! (${data.tokenName || 'Token #' + data.tokenId})`);
          setError(`NFC UID ini sudah dipakai untuk "${data.tokenName || 'Token #' + data.tokenId}". Gunakan NFC tag lain.`);
        } else {
          setStatus("✅ NFC tersedia — belum terdaftar di blockchain");
          setError("");
        }
      }
    } catch (err) {
      console.warn("Gagal cek NFC:", err);
      // Tidak block user jika check gagal, biarkan minting yang validasi
      setStatus("✅ NFC Terbaca: " + uid + " (cek online gagal)");
    }
    setIsCheckingNfc(false);
  };

  const scanNFC = async () => {
    setError("");
    setNfcCheck(null);
    if (!("NDEFReader" in window)) {
      // PRODUCTION MODE: Tampilkan error jika tidak ada NFC
      setError("Perangkat ini tidak mendukung NFC. Gunakan smartphone dengan NFC untuk scan tag.");
      return;
    }
    try {
      const ndef = new NDEFReader();
      await ndef.scan();
      setStatus("📡 Tempelkan NFC Tag ke perangkat...");
      ndef.onreading = async (event) => {
        const uid = event.serialNumber;
        setForm((prev) => ({ ...prev, uidNFC: uid }));
        setStatus("🔍 Mengecek NFC di blockchain...");
        await checkNfcOnChain(uid);
      };
    } catch (err) {
      setError("Gagal scan NFC: " + err.message);
    }
  };

  const writeToNFC = async () => {
    if (!verifyUrl) return;
    setStatus("📡 Dekatkan NFC Tag untuk menulis...");
    try {
      const ndef = new NDEFReader();
      await ndef.write({
        records: [{ recordType: "url", data: window.location.origin + verifyUrl }]
      });
      setStatus("✅ Berhasil menulis ke NFC!");
    } catch (error) {
      console.error(error);
      setError("Gagal menulis ke NFC: " + error.message);
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

    const template = `SERTIFIKAT KEASLIAN BATIK WIDOSARI\n\nKarya otentik ini dibuat oleh pengrajin ${form.namaPengrajin}.\n\nJenis Batik: ${form.technique}\nBahan: ${form.materials.join(", ")}\n\nFilosofi:\n"${form.filosofi || 'Melestarikan warisan leluhur.'}"\n\nKarya ini telah diverifikasi keasliannya menggunakan teknologi Blockchain dan NFC.`;

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
        setAiReferences(data.references || []);
        setRagUsed(data.ragUsed || false);
        setAcknowledgments({ aiAcknowledged: false, originalWork: false });
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

  // --- ESTIMASI GAS ---
  const handleEstimateGas = async () => {
    setIsEstimating(true);
    setError("");
    setGasEstimate(null);
    try {
      const res = await fetch("/api/estimate-gas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          finalDescription: previewText,
          ipfsUrl: ipfsUrl // Kirim IPFS URL untuk estimasi lebih murah
        })
      });
      const data = await res.json();
      if (data.success) {
        setGasEstimate(data);
      } else {
        setError(data.error || "Gagal estimasi gas");
      }
    } catch (err) {
      setError("Error: " + err.message);
    }
    setIsEstimating(false);
  };

  // --- MINTING FINAL ---
  const handleFinalMint = async () => {
    setIsMinting(true);
    setError("");

    try {
      // Step 1: Upload gambar ke IPFS terlebih dahulu
      setStatus("� Mengupload gambar ke IPFS...");
      let finalIpfsUrl = ipfsUrl;

      if (!finalIpfsUrl && form.imageBase64) {
        const ipfsRes = await fetch("/api/ipfs-upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: form.imageBase64,
            fileName: `batik_${form.namaPengrajin}_${Date.now()}.jpg`
          })
        });
        const ipfsData = await ipfsRes.json();

        if (ipfsData.success) {
          finalIpfsUrl = ipfsData.ipfsUrl;
          setIpfsUrl(finalIpfsUrl);
          console.log("✅ IPFS Upload:", finalIpfsUrl);
        } else {
          // Fallback ke base64 jika IPFS gagal
          console.warn("⚠️ IPFS gagal, menggunakan base64:", ipfsData.error);
        }
      }

      // Step 2: Mint NFT
      setStatus("🚀 Mengirim ke Blockchain...");
      const res = await fetch("/api/mint", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("user_token") || ""}`,
        },
        body: JSON.stringify({
          ...form,
          materials: form.materials,
          finalDescription: previewText,
          ipfsUrl: finalIpfsUrl // Kirim IPFS URL, lebih murah!
        })
      });
      const data = await res.json();
      if (data.success) {
        setStatus("✅ SUKSES! Sertifikat Tercetak.");
        setTxHash(data.txHash);
        setIssuedAt(data.issuedAt || "");
        if (data.verifyUrl) setVerifyUrl(data.verifyUrl);
        if (data.warning) setStatus(`⚠️ ${data.warning}`);
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
    <div className={`min-h-screen relative overflow-hidden font-sans transition-colors duration-500 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>

      {/* Theme Toggle */}
      <ThemeToggle />
      <div className={`absolute inset-0 transition-colors duration-500 ${isDark ? 'bg-gradient-to-br from-slate-950 via-indigo-950/50 to-slate-950' : 'bg-gradient-to-br from-slate-50 via-indigo-50/50 to-slate-50'}`} />
      <div className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl ${isDark ? 'bg-amber-500/10' : 'bg-amber-400/20'}`} />
      <div className={`absolute bottom-0 left-0 w-80 h-80 rounded-full blur-3xl ${isDark ? 'bg-indigo-500/10' : 'bg-indigo-400/20'}`} />

      {/* Grid Pattern */}
      <div className={`absolute inset-0 bg-[size:40px_40px] ${isDark ? 'bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)]' : 'bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)]'}`} />

      {/* Main Content */}
      <div className={`relative z-10 min-h-screen p-4 flex justify-center items-center ${isDark ? 'text-white' : 'text-slate-800'}`}>
        <div className={`backdrop-blur-xl p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-md border transition-all ${isDark ? 'bg-white/5 border-white/10' : 'bg-white/70 border-slate-200'}`}>

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
                {isAdminSession && <p className="text-xs text-amber-300/80">Masukkan nama pengrajin atau komunitas yang membuat karya. Sertifikat akan dikelola oleh NBC.</p>}
                <input
                  name="namaPengrajin"
                  placeholder={isAdminSession ? "Nama pengrajin atau komunitas" : "Nama dari akun pengrajin"}
                  value={form.namaPengrajin}
                  readOnly={!isAdminSession}
                  onChange={handleChange}
                  className={`w-full p-4 rounded-xl text-sm outline-none transition-all ${!isAdminSession ? "opacity-80" : ""} ${
                    isDark
                      ? "bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:border-amber-500/50 focus:bg-white/10"
                      : "bg-slate-100 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:bg-white"
                  }`}
                  required
                />
                <input
                  name="alamatPengrajin"
                  placeholder="Wallet Crypto (0x...) - Opsional"
                  value={form.alamatPengrajin}
                  onChange={handleChange}
                  className={`w-full p-4 rounded-xl text-sm font-mono outline-none transition-all ${
                    isDark
                      ? "bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:border-amber-500/50 focus:bg-white/10"
                      : "bg-slate-100 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:bg-white"
                  }`}
                />
              </div>

              <section className="space-y-3 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-cyan-300">Jenis Batik <span className="text-red-400">*</span></p>
                  <p className="mt-1 text-[11px] text-slate-500">Pilih teknik utama yang digunakan pada karya.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {BATIK_TECHNIQUES.map((technique) => {
                    const selected = form.technique === technique;
                    return (
                      <button
                        key={technique}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => { setForm((prev) => ({ ...prev, technique })); setError(""); }}
                        className={`rounded-full border px-3 py-1.5 text-xs transition ${selected ? "border-cyan-400 bg-cyan-500/20 text-cyan-200" : "border-white/10 bg-white/5 text-slate-300 hover:border-cyan-500/40"}`}
                      >
                        {selected ? "✓ " : "+ "}{technique}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="space-y-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-amber-300">Bahan Batik <span className="text-red-400">*</span></label>
                  <p className="mt-1 text-[11px] text-slate-500">Pilih semua bahan yang digunakan. Minimal satu bahan wajib dicatat.</p>
                </div>
                {MATERIAL_GROUPS.map((group) => (
                  <div key={group.name}>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">{group.name}</p>
                    <div className="flex flex-wrap gap-2">
                      {group.options.map((material) => {
                        const selected = form.materials.includes(material);
                        return (
                          <button
                            key={material}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => toggleMaterial(material)}
                            className={`rounded-full border px-3 py-1.5 text-xs transition ${selected ? "border-amber-400 bg-amber-500/20 text-amber-200" : "border-white/10 bg-white/5 text-slate-300 hover:border-amber-500/40"}`}
                          >
                            {selected ? "✓ " : "+ "}{material}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    value={customMaterial}
                    maxLength={120}
                    onChange={(event) => setCustomMaterial(event.target.value)}
                    onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addCustomMaterial(); } }}
                    placeholder="Bahan lain (ketik sendiri)"
                    className={`min-w-0 flex-1 rounded-xl p-3 text-xs outline-none ${isDark ? "border border-white/10 bg-white/5 text-white placeholder-slate-500" : "border border-slate-200 bg-white text-slate-900 placeholder-slate-400"}`}
                  />
                  <button type="button" onClick={addCustomMaterial} className="rounded-xl bg-amber-500 px-4 text-xs font-bold text-slate-950 hover:bg-amber-400">Tambah</button>
                </div>
                {form.materials.length > 0 && (
                  <div className="flex flex-wrap gap-2 border-t border-white/10 pt-3">
                    {form.materials.map((material) => (
                      <span key={material} className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-200">
                        {material}
                        <button type="button" onClick={() => toggleMaterial(material)} aria-label={`Hapus ${material}`} className="font-bold text-emerald-300 hover:text-white">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </section>

              <div className="relative">
                <textarea
                  name="filosofi"
                  placeholder="Filosofi Batik (Suara/Teks)..."
                  value={form.filosofi}
                  onChange={handleChange}
                  className={`w-full p-4 rounded-xl text-sm h-24 pr-12 outline-none resize-none transition-all ${
                    isDark
                      ? "bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:border-amber-500/50 focus:bg-white/10"
                      : "bg-slate-100 border border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:bg-white"
                  }`}
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
                      <Image src={form.imageBase64} alt="Preview foto batik" fill sizes="50vw" unoptimized className="object-contain" />
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
                  disabled={isCheckingNfc}
                  className={`relative group rounded-2xl flex flex-col items-center justify-center h-24 border-2 transition-all overflow-hidden ${nfcCheck?.isRegistered
                      ? "bg-red-500/10 border-red-500/30 text-red-400"
                      : form.uidNFC
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : "bg-white/5 border-white/10 text-white hover:border-cyan-500/50"
                    }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-teal-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="relative text-2xl">
                    {isCheckingNfc ? "⏳" : nfcCheck?.isRegistered ? "❌" : form.uidNFC ? "✅" : "📡"}
                  </span>
                  <p className="relative text-[10px] font-bold mt-1 uppercase tracking-wider">
                    {isCheckingNfc ? "CEK..." : nfcCheck?.isRegistered ? "TERPAKAI" : form.uidNFC ? "NFC OK" : "SCAN NFC"}
                  </p>
                </button>
              </div>

              {/* Verifikator */}
              {/* Buttons */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={handleManualInput}
                  disabled={isLoading || nfcCheck?.isRegistered}
                  className="flex-1 p-4 bg-white/5 border border-white/10 text-slate-300 rounded-xl font-bold text-sm hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
                >
                  ✍️ MANUAL
                </button>
                <button
                  type="button"
                  onClick={handleGeneratePreview}
                  disabled={isLoading || nfcCheck?.isRegistered}
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
                  <Image src={form.imageBase64} className="object-contain" alt="Preview batik untuk sertifikat" fill sizes="100vw" unoptimized />
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
                  className={`w-full h-64 p-4 text-sm rounded-xl focus:border-indigo-500/50 outline-none resize-y transition-all font-mono leading-relaxed ${
                    isDark
                      ? "text-white bg-white/5 border border-indigo-500/20"
                      : "text-slate-900 bg-slate-100 border border-indigo-200"
                  }`}
                  aria-label="Edit deskripsi sertifikat"
                />
              </div>

              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-cyan-300">Jenis Batik</p>
                <p className="mt-2 text-sm text-slate-200">{form.technique}</p>
                <p className="mt-4 text-xs font-bold uppercase tracking-wider text-amber-300">Bahan yang dicatat</p>
                <p className="mt-2 text-sm text-slate-200">{form.materials.join(", ")}</p>
                <p className="mt-3 text-[11px] text-slate-500">Tanggal terbit akan dicatat otomatis saat sertifikat dicetak.</p>
              </div>

              {/* RAG References */}
              {aiReferences.length > 0 && (
                <div className="bg-purple-500/10 p-4 rounded-2xl border border-purple-500/20">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">📚 Referensi AI</span>
                    {ragUsed && <span className="text-[10px] px-2 py-0.5 bg-purple-500/20 rounded-full text-purple-300">RAG Active</span>}
                  </div>
                  <div className="space-y-2">
                    {aiReferences.slice(0, 3).map((ref, i) => (
                      <div key={i} className="p-2.5 bg-white/5 rounded-xl border border-white/5">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-white">{ref.nama_motif}</span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/30 rounded text-purple-200">{ref.similarity}%</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">{ref.daerah_asal}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">📖 {ref.sumber}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Acknowledgment Checklist */}
              <div className="bg-amber-500/10 p-4 rounded-2xl border border-amber-500/20">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider block mb-3">✅ Persetujuan Sebelum Minting</span>

                <div className="space-y-3">
                  {/* Checkbox 1: AI Acknowledgment */}
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={acknowledgments.aiAcknowledged}
                      onChange={(e) => setAcknowledgments(prev => ({ ...prev, aiAcknowledged: e.target.checked }))}
                      className="mt-0.5 w-4 h-4 accent-amber-500 rounded cursor-pointer flex-shrink-0"
                    />
                    <span className="text-xs text-slate-300 group-hover:text-white transition-colors leading-relaxed">
                      Saya memahami bahwa uraian ciptaan ini <strong className="text-amber-300">dibantu oleh AI</strong> dan telah memeriksa serta menyetujui isinya.
                    </span>
                  </label>

                  {/* Checkbox 2: Original Work */}
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={acknowledgments.originalWork}
                      onChange={(e) => setAcknowledgments(prev => ({ ...prev, originalWork: e.target.checked }))}
                      className="mt-0.5 w-4 h-4 accent-amber-500 rounded cursor-pointer flex-shrink-0"
                    />
                    <span className="text-xs text-slate-300 group-hover:text-white transition-colors leading-relaxed">
                      Saya menyatakan bahwa karya batik yang didaftarkan adalah <strong className="text-amber-300">karya asli buatan saya sendiri</strong>.
                    </span>
                  </label>
                </div>

                {/* Tombol Lihat Sumber Referensi (T&C style) */}
                <button
                  type="button"
                  onClick={() => setShowSourcesModal(true)}
                  className="mt-3 w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-1.5"
                >
                  📄 Lihat Sumber Referensi AI
                </button>
              </div>

              {/* Gas Estimation */}
              <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-600/30">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">⛽ Estimasi Biaya</span>
                  <button
                    onClick={handleEstimateGas}
                    disabled={isEstimating}
                    className="px-3 py-1.5 bg-blue-600/80 text-white rounded-lg text-xs font-bold hover:bg-blue-500 transition-all disabled:opacity-50"
                  >
                    {isEstimating ? "⏳ Menghitung..." : "🔍 Hitung Gas"}
                  </button>
                </div>
                {gasEstimate && (
                  <div className={`p-3 rounded-xl border space-y-1 ${gasEstimate.usingIPFS ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                    <p className={`text-sm font-bold ${gasEstimate.usingIPFS ? 'text-emerald-400' : 'text-amber-400'}`}>
                      💰 {gasEstimate.estimatedCostPOL} POL
                    </p>
                    <p className={`text-xs ${gasEstimate.usingIPFS ? 'text-emerald-300' : 'text-amber-300'}`}>
                      ≈ Rp {gasEstimate.estimatedCostIDR.toLocaleString()}
                    </p>
                    <p className="text-slate-400 text-[10px]">
                      {gasEstimate.usingIPFS ? '✅ IPFS' : '⚠️ Base64'} | 📦 {gasEstimate.imageSizeKB} KB | Gas: {gasEstimate.estimatedGas}
                    </p>
                  </div>
                )}
                {!gasEstimate && !isEstimating && (
                  <p className="text-slate-500 text-xs text-center">Klik &quot;Hitung Gas&quot; untuk melihat estimasi biaya</p>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => { setStep(1); setError(""); setGasEstimate(null); setAcknowledgments({ aiAcknowledged: false, originalWork: false }); }}
                  className="flex-1 p-4 bg-white/5 border border-white/10 text-slate-300 rounded-xl font-bold text-xs hover:bg-white/10 transition-all"
                >
                  ⬅ EDIT
                </button>
                <button
                  onClick={handleFinalMint}
                  disabled={isMinting || !acknowledgments.aiAcknowledged || !acknowledgments.originalWork}
                  className={`flex-[2] p-4 rounded-xl font-bold text-sm shadow-lg transition-all ${acknowledgments.aiAcknowledged && acknowledgments.originalWork ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-[1.02]' : 'bg-slate-700 text-slate-400 cursor-not-allowed shadow-none'} disabled:opacity-50`}
                  title={!acknowledgments.aiAcknowledged || !acknowledgments.originalWork ? 'Centang semua persetujuan terlebih dahulu' : ''}
                >
                  {isMinting ? "⏳ MENCETAK..." : !acknowledgments.aiAcknowledged || !acknowledgments.originalWork ? "🔒 CENTANG PERSETUJUAN" : "✅ CETAK FINAL"}
                </button>
              </div>
            </div>
          )}

          {/* Status Banner */}
          {status && (
            <div className={`mt-6 p-5 rounded-2xl border text-sm text-center transition-all ${status.includes("SUKSES") ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-white/5 border-white/10 text-slate-300"}`}>
              <p className="font-bold">{status}</p>
              {issuedAt && (
                <div className="mx-auto mt-3 max-w-xs rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Tanggal Terbit</p>
                  <p className="mt-1 text-sm text-white">{new Date(issuedAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
                </div>
              )}
              {verifyUrl && (
                <div className="mt-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                  <p className="text-xs text-slate-300">Tulis tautan pembuka ke chip NFC. Tautan ini hanya membuka halaman scan; sertifikat tidak bisa diverifikasi tanpa UID chip fisik.</p>
                  <button
                    type="button"
                    onClick={writeToNFC}
                    className="mt-3 w-full rounded-lg bg-gradient-to-r from-blue-500 to-cyan-600 px-4 py-3 text-xs font-bold text-white transition hover:brightness-110"
                  >
                    📡 Tulis tautan ke chip NFC
                  </button>
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

      {/* Sources Modal (T&C style) */}
      {showSourcesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowSourcesModal(false)}>
          <div className={`w-full max-w-md max-h-[80vh] overflow-y-auto rounded-3xl border shadow-2xl p-6 ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>📄 Sumber Referensi AI</h3>
              <button onClick={() => setShowSourcesModal(false)} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>

            <div className={`text-xs leading-relaxed space-y-4 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              <p>Sistem AI pada NusantaraBatikChain menggunakan teknologi <strong>RAG (Retrieval-Augmented Generation)</strong> untuk menganalisis motif batik. Uraian ciptaan dihasilkan berdasarkan data dari sumber-sumber berikut:</p>

              <div className="space-y-3">
                <div className={`p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                  <p className="font-bold text-amber-400">🏛️ iWareBatik.org</p>
                  <p className="mt-1">Platform resmi di bawah UNESCO Chair in ICT to Develop and Promote Sustainable Tourism (Università della Svizzera italiana), bekerja sama dengan Sobat Budaya dan Bandung Fe Institute.</p>
                </div>
                <div className={`p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                  <p className="font-bold text-amber-400">🇮🇩 Kementerian Kebudayaan RI</p>
                  <p className="mt-1">Data Warisan Budaya Takbenda Indonesia (warisanbudaya.kemdikbud.go.id) — database resmi pemerintah untuk pencatatan karya budaya nasional.</p>
                </div>
                <div className={`p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                  <p className="font-bold text-amber-400">🏭 Balai Besar Kerajinan dan Batik (BBKB)</p>
                  <p className="mt-1">Kementerian Perindustrian RI — lembaga teknis yang menangani standardisasi dan pengembangan batik Indonesia.</p>
                </div>
                <div className={`p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                  <p className="font-bold text-amber-400">📖 Literatur Akademis</p>
                  <p className="mt-1">• Adi Kusrianto — <em>&quot;Batik: Filosofi, Motif, dan Kegunaan&quot;</em> (2013)<br/>• Hamzuri — <em>&quot;Batik Klasik&quot;</em> (Djambatan, 1994)<br/>• Museum Batik Yogyakarta &amp; Museum Batik Indonesia TMII</p>
                </div>
              </div>

              <div className={`p-3 rounded-xl border ${isDark ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
                <p className="font-bold text-amber-400 mb-1">⚠️ Disclaimer</p>
                <p>AI dapat membuat kesalahan dalam identifikasi motif. Hasil analisis bersifat <strong>rekomendasi</strong> dan perlu diverifikasi oleh pengrajin. Pengrajin bertanggung jawab penuh atas keakuratan uraian ciptaan final yang akan di-mint sebagai NFT.</p>
              </div>
            </div>

            <button
              onClick={() => setShowSourcesModal(false)}
              className="mt-4 w-full p-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-bold text-sm hover:scale-[1.02] transition-all"
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      )}

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
