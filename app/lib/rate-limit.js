/**
 * RATE LIMITER — In-Memory per IP
 * Melindungi API dari spam/abuse.
 * Untuk production besar, ganti dengan Redis.
 */

const rateLimitMap = new Map();

// Auto-cleanup setiap 5 menit untuk mencegah memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap) {
    if (now > record.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Cek apakah request masih dalam batas rate limit
 * @param {string} ip - IP address atau identifier unik
 * @param {object} options - { windowMs, max }
 * @returns {{ allowed: boolean, remaining: number, resetAt: number }}
 */
export function checkRateLimit(ip, options = {}) {
  const { windowMs = 60000, max = 10 } = options;
  const now = Date.now();
  const key = ip;

  let record = rateLimitMap.get(key);

  if (!record || now > record.resetAt) {
    record = { count: 0, resetAt: now + windowMs };
  }

  record.count++;
  rateLimitMap.set(key, record);

  return {
    allowed: record.count <= max,
    remaining: Math.max(0, max - record.count),
    resetAt: record.resetAt,
  };
}

/**
 * Helper: Ambil IP dari request Next.js
 */
export function getClientIP(request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
