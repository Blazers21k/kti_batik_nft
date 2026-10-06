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
import { readAuthState, updateAuthState } from "./auth-state";

const SALT_ROUNDS = 12;
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari
const OTP_DURATION_MS = 10 * 60 * 1000; // 10 menit

// ═══════════════════════════════════════
// DATA ACCESS
// ═══════════════════════════════════════

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
  const otp = generateOTP();
  const hashedPassword = await hashPassword(password);
  const normalizedEmail = email.toLowerCase().trim();
  const pending = {
    id: crypto.randomUUID(),
    nama: nama.trim(),
    email: normalizedEmail,
    passwordHash: hashedPassword,
    otpCode: otp,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + OTP_DURATION_MS).toISOString(),
  };

  return updateAuthState((data) => {
    const existingUser = data.users.find(
      (user) => user.email.toLowerCase() === normalizedEmail
    );
    if (existingUser) {
      return { success: false, error: "Email sudah terdaftar. Silakan login." };
    }

    data.pendingVerifications = data.pendingVerifications.filter(
      (entry) => entry.email.toLowerCase() !== normalizedEmail && new Date(entry.expiresAt) > new Date()
    );
    data.pendingVerifications.push(pending);

    return { success: true, otp, pendingId: pending.id };
  });
}

/**
 * Verifikasi OTP dan buat akun user
 */
export async function verifyOTPAndCreateUser(email, otpCode) {
  const normalizedEmail = email.toLowerCase();
  return updateAuthState((data) => {
    const pendingIndex = data.pendingVerifications.findIndex(
      (entry) =>
        entry.email.toLowerCase() === normalizedEmail &&
        entry.otpCode === otpCode &&
        new Date(entry.expiresAt) > new Date()
    );

    if (pendingIndex === -1) {
      return { success: false, error: "Kode verifikasi salah atau sudah kedaluwarsa" };
    }

    const pending = data.pendingVerifications[pendingIndex];
    const newUser = {
      id: crypto.randomUUID(),
      nama: pending.nama,
      email: pending.email,
      passwordHash: pending.passwordHash,
      verified: true,
      createdAt: new Date().toISOString(),
    };

    data.users.push(newUser);
    data.pendingVerifications.splice(pendingIndex, 1);

    const token = generateSessionToken();
    data.sessions.push({
      token,
      userId: newUser.id,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + SESSION_DURATION_MS).toISOString(),
    });
    data.sessions = data.sessions.filter((session) => new Date(session.expiresAt) > new Date());

    return {
      success: true,
      user: { id: newUser.id, nama: newUser.nama, email: newUser.email },
      token,
    };
  });
}

// ═══════════════════════════════════════
// USER AUTH (LOGIN)
// ═══════════════════════════════════════

export async function authenticateUser(email, password) {
  const data = await readAuthState();
  const normalizedEmail = email.toLowerCase();

  const user = data.users.find(
    (entry) => entry.email.toLowerCase() === normalizedEmail
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

  await updateAuthState((current) => {
    current.sessions.push(session);
    current.sessions = current.sessions.filter(
      (entry) => new Date(entry.expiresAt) > new Date()
    );
  });

  return {
    success: true,
    user: { id: user.id, nama: user.nama, email: user.email },
    token,
  };
}

// ═══════════════════════════════════════
// SESSION MANAGEMENT
// ═══════════════════════════════════════

export async function getSessionUser(token) {
  if (!token) return null;

  const data = await readAuthState();

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
export async function refreshSession(token) {
  if (!token) return false;

  return updateAuthState((data) => {
    const session = data.sessions.find(
      (entry) => entry.token === token && new Date(entry.expiresAt) > new Date()
    );
    if (!session) return false;

    session.expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
    return true;
  });
}

export async function destroySession(token) {
  if (!token) return false;

  return updateAuthState((data) => {
    const initialLength = data.sessions.length;
    data.sessions = data.sessions.filter((entry) => entry.token !== token);
    return data.sessions.length < initialLength;
  });
}

// ═══════════════════════════════════════
// PASSWORD RESET SUPPORT
// ═══════════════════════════════════════

export async function createPasswordReset(email) {
  const otp = generateOTP();
  const normalizedEmail = email.toLowerCase().trim();
  const resetRequest = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    otpCode: otp,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + OTP_DURATION_MS).toISOString(),
  };

  return updateAuthState((data) => {
    const user = data.users.find(
      (entry) => entry.email.toLowerCase() === normalizedEmail
    );
    if (!user) return { success: false, error: "Email tidak terdaftar" };

    data.passwordResets = data.passwordResets.filter(
      (entry) => entry.email.toLowerCase() !== normalizedEmail && new Date(entry.expiresAt) > new Date()
    );
    data.passwordResets.push(resetRequest);

    return { success: true, otp, nama: user.nama };
  });
}

export async function resetPassword(email, otpCode, newPassword) {
  const validation = isValidPassword(newPassword);
  if (!validation.valid) {
    return { success: false, error: validation.reason };
  }

  const hashedPassword = await hashPassword(newPassword);
  const normalizedEmail = email.toLowerCase();
  return updateAuthState((data) => {
    const resetIndex = data.passwordResets.findIndex(
      (entry) =>
        entry.email.toLowerCase() === normalizedEmail &&
        entry.otpCode === otpCode &&
        new Date(entry.expiresAt) > new Date()
    );
    if (resetIndex === -1) {
      return { success: false, error: "Kode verifikasi salah atau sudah kedaluwarsa" };
    }

    const user = data.users.find((entry) => entry.email.toLowerCase() === normalizedEmail);
    if (!user) return { success: false, error: "User tidak ditemukan" };

    user.passwordHash = hashedPassword;
    data.passwordResets.splice(resetIndex, 1);
    data.sessions = data.sessions.filter((session) => session.userId !== user.id);
    data.passwordResets = data.passwordResets.filter(
      (entry) => new Date(entry.expiresAt) > new Date()
    );
    return { success: true };
  });
}
