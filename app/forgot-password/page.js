"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: Request Reset (Email), 2: Reset Password (OTP + New Password)
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Password strength logic (matching register page)
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

  const strength = getPasswordStrength(password);

  // Step 1: Request reset code
  const handleRequestReset = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Gagal memproses permintaan");
        setIsLoading(false);
        return;
      }

      setSuccess("Kode reset password telah dikirim ke email Anda!");
      setStep(2);

      // Dev mode fallback
      if (data._devOtp) {
        setOtpCode(data._devOtp);
      }
    } catch {
      setError("Terjadi kesalahan koneksi");
    }
    setIsLoading(false);
  };

  // Step 2: Verify reset OTP & update password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Password dan konfirmasi password tidak sama");
      return;
    }

    if (password.length < 8) {
      setError("Password minimal 8 karakter");
      return;
    }
    if (!/[a-zA-Z]/.test(password)) {
      setError("Password harus mengandung huruf");
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError("Password harus mengandung angka");
      return;
    }
    if (strength.level < 2) {
      setError("Kekuatan password minimal harus 'Cukup'");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email,
          otpCode: otpCode,
          password: password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Reset password gagal");
        setIsLoading(false);
        return;
      }

      setSuccess("Password berhasil diubah! Mengalihkan ke login...");

      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch {
      setError("Terjadi kesalahan koneksi");
    }
    setIsLoading(false);
  };

  // Resend reset OTP
  const handleResendOTP = async () => {
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Gagal mengirim ulang kode");
      } else {
        setSuccess("Kode reset password baru telah dikirim!");
        if (data._devOtp) setOtpCode(data._devOtp);
      }
    } catch {
      setError("Terjadi kesalahan koneksi");
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden font-sans">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950" />
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-red-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1.5s" }} />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col justify-center items-center p-6 text-white">
        
        {/* Back Button */}
        <Link href="/login" className="absolute top-6 left-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <span>←</span>
          <span className="text-sm">Kembali ke Login</span>
        </Link>

        <div className="w-full max-w-md">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="relative inline-block mb-4">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-amber-500 blur-2xl opacity-30 animate-pulse" />
              <span className="relative text-6xl">{step === 1 ? "🔑" : "🔄"}</span>
            </div>
            <h1 className="text-3xl font-bold">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-200 to-amber-400">
                {step === 1 ? "Lupa Password" : "Reset Password"}
              </span>
            </h1>
            <p className="text-slate-400 text-sm mt-2">
              {step === 1
                ? "Masukkan email Anda untuk menerima kode verifikasi reset password"
                : `Masukkan kode OTP dan password baru Anda`}
            </p>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${step === 1 ? "bg-red-500/20 text-red-300 border border-red-500/30" : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"}`}>
              {step > 1 ? "✓" : "1"} Permintaan
            </div>
            <div className="w-8 h-px bg-white/20" />
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${step === 2 ? "bg-red-500/20 text-red-300 border border-red-500/30" : "bg-white/5 text-slate-500 border border-white/10"}`}>
              2 Reset Password
            </div>
          </div>

          {/* ═══ STEP 1: Email Form ═══ */}
          {step === 1 && (
            <form onSubmit={handleRequestReset} className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 space-y-5">
              
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email Akun
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Masukkan email terdaftar Anda"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all"
                  required
                />
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
                disabled={isLoading || !email}
                className="w-full py-3 bg-gradient-to-r from-red-500 to-amber-600 hover:from-red-600 hover:to-amber-700 text-white font-semibold rounded-xl shadow-lg shadow-red-500/20 hover:shadow-red-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Mengirim kode...</span>
                  </>
                ) : (
                  <>
                    <span>📧</span>
                    <span>Kirim Kode Reset</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* ═══ STEP 2: Reset Password Form ═══ */}
          {step === 2 && (
            <form onSubmit={handleResetPassword} className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 space-y-5">
              
              {/* Email Display */}
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
                <p className="text-xs text-red-300 mb-1">Email untuk Reset</p>
                <p className="text-sm text-white font-mono">{email}</p>
              </div>

              {/* OTP Code */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Kode Verifikasi (6 Digit)
                </label>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 6);
                    setOtpCode(val);
                  }}
                  placeholder="000000"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all font-mono text-center text-lg tracking-widest"
                  required
                />
              </div>

              {/* Password Baru */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Password Baru
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 8 karakter (huruf + angka)"
                    className="w-full pl-4 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-white transition-colors focus:outline-none"
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Password Strength Checklist */}
                {password && (
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
                      {strength.level >= 2 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password) && (
                        <span className="text-emerald-400 flex items-center gap-1 font-medium">✓ Memenuhi Syarat</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px] p-3 bg-white/5 rounded-xl border border-white/5">
                      <div className="flex items-center gap-1.5">
                        <span className={password.length >= 8 ? "text-emerald-400 font-bold" : "text-slate-500"}>
                          {password.length >= 8 ? "✓" : "○"}
                        </span>
                        <span className={password.length >= 8 ? "text-slate-200" : "text-slate-500"}>
                          Min. 8 Karakter
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={( /[a-zA-Z]/.test(password) && /[0-9]/.test(password) ) ? "text-emerald-400 font-bold" : "text-slate-500"}>
                          {( /[a-zA-Z]/.test(password) && /[0-9]/.test(password) ) ? "✓" : "○"}
                        </span>
                        <span className={( /[a-zA-Z]/.test(password) && /[0-9]/.test(password) ) ? "text-slate-200" : "text-slate-500"}>
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

              {/* Konfirmasi Password Baru */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Konfirmasi Password Baru
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password baru Anda"
                    className={`w-full pl-4 pr-12 py-3 bg-white/5 border rounded-xl text-white placeholder-slate-500 focus:outline-none transition-all ${
                      confirmPassword && confirmPassword !== password
                        ? "border-red-500/50 focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30"
                        : "border-white/10 focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30"
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-white transition-colors focus:outline-none"
                    aria-label={showConfirmPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showConfirmPassword ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== password && (
                  <p className="text-xs text-red-400 mt-1">Password tidak sama</p>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
                  {error}
                </div>
              )}

              {/* Success Info (jika sukses reset) */}
              {success && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm text-center">
                  {success}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={
                  isLoading ||
                  (confirmPassword && confirmPassword !== password) ||
                  password.length < 8 ||
                  !/[a-zA-Z]/.test(password) ||
                  !/[0-9]/.test(password) ||
                  strength.level < 2 ||
                  otpCode.length !== 6
                }
                className="w-full py-3 bg-gradient-to-r from-red-500 to-amber-600 hover:from-red-600 hover:to-amber-700 text-white font-semibold rounded-xl shadow-lg shadow-red-500/20 hover:shadow-red-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Mengubah password...</span>
                  </>
                ) : (
                  <>
                    <span>💾</span>
                    <span>Reset & Simpan Password</span>
                  </>
                )}
              </button>

              {/* Resend Link */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={isLoading}
                  className="text-xs text-slate-400 hover:text-white transition-colors underline focus:outline-none"
                >
                  Kirim ulang kode verifikasi
                </button>
              </div>
            </form>
          )}

          {/* Footer Info */}
          <div className="mt-6 p-4 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10">
            <p className="text-xs text-slate-400 text-center">
              Ingat password Anda?{" "}
              <Link href="/login" className="text-emerald-400 hover:text-emerald-300 underline font-medium">
                Masuk di sini
              </Link>
            </p>
          </div>
        </div>

        {/* Footer Accent */}
        <p className="mt-8 text-slate-600 text-xs font-mono text-center">
          Nusantara Batik Chain • Portal Keamanan Akun
        </p>
      </div>
    </div>
  );
}
