import type { NextConfig } from "next";

const projectRoot = process.cwd();

const nextConfig: NextConfig = {
  // Keep Next.js file tracing and Turbopack scoped to this app's root.
  outputFileTracingRoot: projectRoot,
  turbopack: {
    root: projectRoot,
  },
  // RENDAH-2: Security Headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Mencegah clickjacking (embed di iframe pihak lain)
          { key: "X-Frame-Options", value: "DENY" },
          // Mencegah MIME type sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Kontrol referrer information
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Force HTTPS (untuk production)
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // Mencegah XSS di browser lama
          { key: "X-XSS-Protection", value: "1; mode=block" },
          // Batasi permissions browser
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
