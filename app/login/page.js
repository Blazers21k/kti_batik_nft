"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Login User (email + password)
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login gagal");
        setIsLoading(false);
        return;
      }

      // Simpan token dan user data di localStorage
      localStorage.setItem("user_token", data.token);
      localStorage.setItem("user_data", JSON.stringify(data.user));

      router.push("/dashboard");
    } catch (err) {
      setError("Terjadi kesalahan koneksi");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden font-sans">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950" />
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col justify-center items-center p-6 text-white">

        {/* Back Button */}
        <Link href="/" className="absolute top-6 left-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <span>←</span>
          <span className="text-sm">Kembali</span>
        </Link>

        {/* Login Card */}
        <div className="w-full max-w-md">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="relative inline-block mb-4">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-600 blur-2xl opacity-30 animate-pulse" />
              <span className="relative text-6xl">🔐</span>
            </div>
            <h1 className="text-3xl font-bold">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-200 to-teal-400">
                Masuk
              </span>
            </h1>
            <p className="text-slate-400 text-sm mt-2">
              Masuk untuk melihat dan mengelola karya batik Anda
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 space-y-6">

            {/* Info untuk pengrajin baru */}
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <p className="text-xs text-emerald-300 text-center leading-relaxed">
                🎨 <strong>Pengrajin baru?</strong> Daftar akun dulu, lalu Anda bisa langsung masuk ke Area Pengrajin untuk mendaftarkan karya batik.
              </p>
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
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all"
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
                placeholder="Masukkan password Anda"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                required
              />
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
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
                  <span>🔓</span>
                  <span>Masuk</span>
                </>
              )}
            </button>
          </form>

          {/* Links */}
          <div className="mt-6 p-4 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10">
            <p className="text-xs text-slate-400 text-center">
              <span className="text-amber-400">📝</span> Belum punya akun?{" "}
              <Link href="/register" className="text-amber-400 hover:text-amber-300 underline font-medium">
                Daftar di sini
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-slate-600 text-xs font-mono text-center">
          Nusantara Batik Chain • Portal Akses Aman
        </p>
      </div>
    </div>
  );
}
