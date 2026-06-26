"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: Form, 2: OTP Verification
  const [form, setForm] = useState({ nama: "", email: "", password: "", confirmPassword: "" });
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  // Password strength indicator
  const getPasswordStrength = (pw) => {
    if (!pw) return { level: 0, text: "", color: "" };
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^a-zA-Z0-9]/.test(pw)) score++;

    if (score <= 1) return { level: 1, text: "Lemah", color: "bg-red-500" };
    if (score <= 2) return { level: 2, text: "Cukup", color: "bg-amber-500" };
    if (score <= 3) return { level: 3, text: "Baik", color: "bg-emerald-500" };
    return { level: 4, text: "Kuat", color: "bg-cyan-400" };
  };

  const strength = getPasswordStrength(form.password);

  // Step 1: Submit registration form
  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (form.password !== form.confirmPassword) {
      setError("Password dan konfirmasi password tidak sama");
      return;
    }

    // Validasi password di frontend
    if (form.password.length < 8) {
      setError("Password minimal 8 karakter");
      return;
    }
    if (!/[a-zA-Z]/.test(form.password)) {
      setError("Password harus mengandung huruf");
      return;
    }
    if (!/[0-9]/.test(form.password)) {
      setError("Password harus mengandung angka");
      return;
    }
    if (strength.level < 2) {
      setError("Kekuatan password minimal harus 'Cukup'");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: form.nama,
          email: form.email,
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registrasi gagal");
        setIsLoading(false);
        return;
      }

      setRegisteredEmail(form.email);
      setSuccess("Kode verifikasi telah dikirim ke email Anda!");
      setStep(2);

      // Jika mode dev (SMTP belum aktif), tampilkan OTP
      if (data._devOtp) {
        setOtpCode(data._devOtp);
      }
    } catch (err) {
      setError("Terjadi kesalahan koneksi");
    }
    setIsLoading(false);
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: registeredEmail,
          otpCode: otpCode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Verifikasi gagal");
        setIsLoading(false);
        return;
      }

      // Simpan session token
      localStorage.setItem("user_token", data.token);
      localStorage.setItem("user_data", JSON.stringify(data.user));

      setSuccess("Akun berhasil dibuat! Mengalihkan...");

      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    } catch (err) {
      setError("Terjadi kesalahan koneksi");
    }
    setIsLoading(false);
  };

  // Resend OTP
  const handleResendOTP = async () => {
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: form.nama,
          email: registeredEmail,
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Gagal mengirim ulang kode");
      } else {
        setSuccess("Kode verifikasi baru telah dikirim!");
        if (data._devOtp) setOtpCode(data._devOtp);
      }
    } catch (err) {
      setError("Terjadi kesalahan koneksi");
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden font-sans">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950" />
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1.5s" }} />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col justify-center items-center p-6 text-white">

        {/* Back Button */}
        <Link href="/" className="absolute top-6 left-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <span>←</span>
          <span className="text-sm">Kembali</span>
        </Link>

        <div className="w-full max-w-md">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="relative inline-block mb-4">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-600 blur-2xl opacity-30 animate-pulse" />
              <span className="relative text-6xl">{step === 1 ? "📝" : "📧"}</span>
            </div>
            <h1 className="text-3xl font-bold">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-200 to-orange-400">
                {step === 1 ? "Daftar Akun" : "Verifikasi Email"}
              </span>
            </h1>
            <p className="text-slate-400 text-sm mt-2">
              {step === 1
                ? "Buat akun untuk mengelola karya batik Anda"
                : `Masukkan kode yang dikirim ke ${registeredEmail}`}
            </p>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${step === 1 ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"}`}>
              {step > 1 ? "✓" : "1"} Data Diri
            </div>
            <div className="w-8 h-px bg-white/20" />
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${step === 2 ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-white/5 text-slate-500 border border-white/10"}`}>
              2 Verifikasi
            </div>
          </div>

          {/* ═══ STEP 1: Registration Form ═══ */}
          {step === 1 && (
            <form onSubmit={handleRegister} className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 space-y-5">

              {/* Nama Lengkap */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  placeholder="Masukkan nama lengkap Anda"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
                  required
                  minLength={2}
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="contoh@email.com"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Minimal 8 karakter (huruf + angka)"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
                  required
                  minLength={8}
                />
                {/* Password Strength Checklist */}
                {form.password && (
                  <div className="mt-3 space-y-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full transition-all ${i <= strength.level ? strength.color : "bg-white/10"}`}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">
                        Kekuatan:{" "}
                        <span className={`font-semibold ${strength.level <= 1 ? "text-red-400" : strength.level <= 2 ? "text-amber-400" : "text-emerald-400"}`}>
                          {strength.text}
                        </span>
                      </span>
                      {strength.level >= 2 && /[a-zA-Z]/.test(form.password) && /[0-9]/.test(form.password) && (
                        <span className="text-emerald-400 flex items-center gap-1 font-medium">✓ Memenuhi Syarat</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px] p-3 bg-white/5 rounded-xl border border-white/5">
                      <div className="flex items-center gap-1.5">
                        <span className={form.password.length >= 8 ? "text-emerald-400 font-bold" : "text-slate-500"}>
                          {form.password.length >= 8 ? "✓" : "○"}
                        </span>
                        <span className={form.password.length >= 8 ? "text-slate-200" : "text-slate-500"}>
                          Min. 8 Karakter
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={( /[a-zA-Z]/.test(form.password) && /[0-9]/.test(form.password) ) ? "text-emerald-400 font-bold" : "text-slate-500"}>
                          {( /[a-zA-Z]/.test(form.password) && /[0-9]/.test(form.password) ) ? "✓" : "○"}
                        </span>
                        <span className={( /[a-zA-Z]/.test(form.password) && /[0-9]/.test(form.password) ) ? "text-slate-200" : "text-slate-500"}>
                          Huruf & Angka
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 col-span-2">
                        <span className={strength.level >= 2 ? "text-emerald-400 font-bold" : "text-slate-500"}>
                          {strength.level >= 2 ? "✓" : "○"}
                        </span>
                        <span className={strength.level >= 2 ? "text-slate-200" : "text-slate-500"}>
                          Kekuatan Minimal: Cukup / Baik
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Konfirmasi Password
                </label>
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  placeholder="Ulangi password Anda"
                  className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-slate-500 focus:outline-none transition-all ${
                    form.confirmPassword && form.confirmPassword !== form.password
                      ? "border-red-500/50 focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30"
                      : "border-white/10 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30"
                  }`}
                  required
                />
                {form.confirmPassword && form.confirmPassword !== form.password && (
                  <p className="text-xs text-red-400 mt-1">Password tidak sama</p>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={
                  isLoading ||
                  (form.confirmPassword && form.confirmPassword !== form.password) ||
                  form.password.length < 8 ||
                  !/[a-zA-Z]/.test(form.password) ||
                  !/[0-9]/.test(form.password) ||
                  strength.level < 2
                }
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Mengirim kode verifikasi...</span>
                  </>
                ) : (
                  <>
                    <span>📧</span>
                    <span>Daftar & Kirim Kode Verifikasi</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* ═══ STEP 2: OTP Verification ═══ */}
          {step === 2 && (
            <form onSubmit={handleVerifyOTP} className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 space-y-6">

              {/* Email Display */}
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                <p className="text-xs text-emerald-300 mb-1">Email terdaftar</p>
                <p className="text-sm text-white font-mono">{registeredEmail}</p>
              </div>

              {/* OTP Input */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3 text-center">
                  Masukkan 6-Digit Kode Verifikasi
                </label>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 6);
                    setOtpCode(val);
                  }}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white text-center text-3xl font-mono tracking-[0.5em] placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                  required
                  autoFocus
                />
                <p className="text-xs text-slate-500 mt-2 text-center">
                  Kode berlaku selama 10 menit
                </p>
              </div>

              {/* Success Message */}
              {success && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm text-center">
                  ✅ {success}
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading || otpCode.length !== 6}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Memverifikasi...</span>
                  </>
                ) : (
                  <>
                    <span>✅</span>
                    <span>Verifikasi & Buat Akun</span>
                  </>
                )}
              </button>

              {/* Resend & Back */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => { setStep(1); setError(""); setSuccess(""); }}
                  className="text-sm text-slate-400 hover:text-white transition-colors"
                >
                  ← Ubah data
                </button>
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={isLoading}
                  className="text-sm text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-50"
                >
                  Kirim ulang kode
                </button>
              </div>
            </form>
          )}

          {/* Link to Login */}
          <div className="mt-6 p-4 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10">
            <p className="text-xs text-slate-400 text-center">
              Sudah punya akun?{" "}
              <Link href="/login" className="text-amber-400 hover:text-amber-300 underline font-medium">
                Masuk di sini
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-slate-600 text-xs font-mono text-center">
          Nusantara Batik Chain • Data dilindungi enkripsi
        </p>
      </div>
    </div>
  );
}
