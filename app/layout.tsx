import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nusantara Batik Chain — Sertifikasi Batik Berbasis Blockchain",
  description: "Platform sertifikasi keaslian batik Indonesia menggunakan teknologi Blockchain (Polygon), AI (Gemini), dan NFC. Lindungi karya batik asli dengan sertifikat digital yang terverifikasi.",
  keywords: ["batik", "blockchain", "NFT", "sertifikasi", "keaslian", "NFC", "polygon", "Indonesia"],
  authors: [{ name: "Nusantara Batik Chain" }],
  openGraph: {
    title: "Nusantara Batik Chain",
    description: "Sertifikasi keaslian batik Indonesia dengan Blockchain & AI",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
