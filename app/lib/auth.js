/**
 * AUTH LIBRARY — User Authentication & Session Management
 * 
 * Keamanan:
 * - Password hashing dengan bcrypt (12 salt rounds)
 * - Session token: crypto.randomBytes(48) = 384-bit
 * - Session expiry: 7 hari (sliding window — diperpanjang setiap kunjungan)
 * - Email verification OTP: 6 digit, expiry 10 menit
 */

import bcrypt from "bcryptjs";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data", "users.json");
const SALT_ROUNDS = 12;
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari
const OTP_DURATION_MS = 10 * 60 * 1000; // 10 menit

// ═══════════════════════════════════════
// DATA ACCESS
// ═══════════════════════════════════════

function readData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed.passwordResets) parsed.passwordResets = [];
    return parsed;
  } catch {
    return { users: [], sessions: [], pendingVerifications: [], passwordResets: [] };
  }
}

function writeData(data) {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// ═══════════════════════════════════════
// PASSWORD HASHING
// ═══════════════════════════════════════

export async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// ═══════════════════════════════════════
// SESSION TOKEN
// ═══════════════════════════════════════

export function generateSessionToken() {
  return crypto.randomBytes(48).toString("hex");
}

export function generateOTP() {
  // 6 digit random OTP menggunakan crypto
  const buffer = crypto.randomBytes(3);
  const num = parseInt(buffer.toString("hex"), 16) % 1000000;
  return num.toString().padStart(6, "0");
}

// ═══════════════════════════════════════
// EMAIL VALIDATION
// ═══════════════════════════════════════

export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPassword(password) {
  // Min 8 karakter, harus ada huruf dan angka
  if (password.length < 8) return { valid: false, reason: "Password minimal 8 karakter" };
  if (!/[a-zA-Z]/.test(password)) return { valid: false, reason: "Password harus mengandung huruf" };
  if (!/[0-9]/.test(password)) return { valid: false, reason: "Password harus mengandung angka" };
  return { valid: true };
}

// ═══════════════════════════════════════
// PENDING VERIFICATION (OTP)
// ═══════════════════════════════════════

/**
 * Simpan data registrasi sementara + OTP code
 * Data belum masuk ke users[] sampai OTP diverifikasi
 */
export async function createPendingVerification(nama, email, password) {
  const data = readData();

  // Cek email sudah terdaftar di users
  const existingUser = data.users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );
  if (existingUser) {
    return { success: false, error: "Email sudah terdaftar. Silakan login." };
  }

  // Hapus pending verification lama untuk email ini
  data.pendingVerifications = data.pendingVerifications.filter(
    (p) => p.email.toLowerCase() !== email.toLowerCase()
  );

  const otp = generateOTP();
  const hashedPassword = await hashPassword(password);

  const pending = {
    id: crypto.randomUUID(),
    nama: nama.trim(),
    email: email.toLowerCase().trim(),
    passwordHash: hashedPassword,
    otpCode: otp,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + OTP_DURATION_MS).toISOString(),
  };

  data.pendingVerifications.push(pending);

  // Cleanup expired pendings
  data.pendingVerifications = data.pendingVerifications.filter(
    (p) => new Date(p.expiresAt) > new Date()
  );

  writeData(data);

  return { success: true, otp, pendingId: pending.id };
}

/**
 * Verifikasi OTP dan buat akun user
 */
export function verifyOTPAndCreateUser(email, otpCode) {
  const data = readData();

  const pendingIndex = data.pendingVerifications.findIndex(
    (p) =>
      p.email.toLowerCase() === email.toLowerCase() &&
      p.otpCode === otpCode &&
      new Date(p.expiresAt) > new Date()
  );

  if (pendingIndex === -1) {
    return { success: false, error: "Kode verifikasi salah atau sudah kedaluwarsa" };
  }

  const pending = data.pendingVerifications[pendingIndex];

  // Buat user baru
  const newUser = {
    id: crypto.randomUUID(),
    nama: pending.nama,
    email: pending.email,
    passwordHash: pending.passwordHash,
    verified: true,
    createdAt: new Date().toISOString(),
  };

  data.users.push(newUser);

  // Hapus pending verification
  data.pendingVerifications.splice(pendingIndex, 1);

  // Buat session otomatis
  const token = generateSessionToken();
  const session = {
    token,
    userId: newUser.id,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + SESSION_DURATION_MS).toISOString(),
  };
  data.sessions.push(session);

  // Cleanup expired sessions
  data.sessions = data.sessions.filter(
    (s) => new Date(s.expiresAt) > new Date()
  );

  writeData(data);

  return {
    success: true,
    user: { id: newUser.id, nama: newUser.nama, email: newUser.email },
    token,
  };
}

// ═══════════════════════════════════════
// USER AUTH (LOGIN)
// ═══════════════════════════════════════

export async function authenticateUser(email, password) {
  const data = readData();

  const user = data.users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );

  if (!user) {
    return { success: false, error: "Email atau password salah" };
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return { success: false, error: "Email atau password salah" };
  }

  // Buat session
  const token = generateSessionToken();
  const session = {
    token,
    userId: user.id,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + SESSION_DURATION_MS).toISOString(),
  };

  data.sessions.push(session);

  // Cleanup expired sessions
  data.sessions = data.sessions.filter(
    (s) => new Date(s.expiresAt) > new Date()
  );

  writeData(data);

  return {
    success: true,
    user: { id: user.id, nama: user.nama, email: user.email },
    token,
  };
}

// ═══════════════════════════════════════
// SESSION MANAGEMENT
// ═══════════════════════════════════════

export function getSessionUser(token) {
  if (!token) return null;

  const data = readData();

  const session = data.sessions.find(
    (s) => s.token === token && new Date(s.expiresAt) > new Date()
  );

  if (!session) return null;

  const user = data.users.find((u) => u.id === session.userId);
  if (!user) return null;

  return { id: user.id, nama: user.nama, email: user.email };
}

/**
 * Perpanjang session expiry (sliding window).
 * Dipanggil setiap kali user mengakses /api/auth/me
 * sehingga session tetap aktif selama user masih aktif.
 */
export function refreshSession(token) {
  if (!token) return false;

  const data = readData();
  const session = data.sessions.find(
    (s) => s.token === token && new Date(s.expiresAt) > new Date()
  );

  if (!session) return false;

  // Perpanjang expiry 7 hari dari sekarang
  session.expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
  writeData(data);
  return true;
}

export function destroySession(token) {
  if (!token) return false;

  const data = readData();
  const initialLength = data.sessions.length;
  data.sessions = data.sessions.filter((s) => s.token !== token);

  if (data.sessions.length < initialLength) {
    writeData(data);
    return true;
  }

  return false;
}

// ═══════════════════════════════════════
// PASSWORD RESET SUPPORT
// ═══════════════════════════════════════

export async function createPasswordReset(email) {
  const data = readData();

  const user = data.users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );
  if (!user) {
    return { success: false, error: "Email tidak terdaftar" };
  }

  // Hapus request reset lama untuk email ini
  data.passwordResets = data.passwordResets.filter(
    (r) => r.email.toLowerCase() !== email.toLowerCase()
  );

  const otp = generateOTP();

  const resetRequest = {
    id: crypto.randomUUID(),
    email: email.toLowerCase().trim(),
    otpCode: otp,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + OTP_DURATION_MS).toISOString(),
  };

  data.passwordResets.push(resetRequest);

  // Cleanup expired resets
  data.passwordResets = data.passwordResets.filter(
    (r) => new Date(r.expiresAt) > new Date()
  );

  writeData(data);

  return { success: true, otp, nama: user.nama };
}

export async function resetPassword(email, otpCode, newPassword) {
  const data = readData();

  // Cari request reset yang aktif dan valid
  const resetIndex = data.passwordResets.findIndex(
    (r) =>
      r.email.toLowerCase() === email.toLowerCase() &&
      r.otpCode === otpCode &&
      new Date(r.expiresAt) > new Date()
  );

  if (resetIndex === -1) {
    return { success: false, error: "Kode verifikasi salah atau sudah kedaluwarsa" };
  }

  const user = data.users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );
  if (!user) {
    return { success: false, error: "User tidak ditemukan" };
  }

  // Validasi password baru
  const validation = isValidPassword(newPassword);
  if (!validation.valid) {
    return { success: false, error: validation.reason };
  }

  // Hash password baru dan update
  const hashedPassword = await hashPassword(newPassword);
  user.passwordHash = hashedPassword;

  // Hapus OTP reset yang sudah terpakai
  data.passwordResets.splice(resetIndex, 1);

  // Revoke all sessions for this user (force logout everywhere)
  data.sessions = data.sessions.filter((s) => s.userId !== user.id);

  // Cleanup expired resets
  data.passwordResets = data.passwordResets.filter(
    (r) => new Date(r.expiresAt) > new Date()
  );

  writeData(data);

  return { success: true };
}
