#  Nusantara Batik Chain

Sistem sertifikasi keaslian batik berbasis Blockchain, NFC, dan Kecerdasan Buatan.

> **Karya Tulis Ilmiah** — Batik Authenticity Verification System

---

##  Fitur Utama

| Fitur | Deskripsi |
|-------|-----------|
|  **NFC Integration** | Tag fisik yang terhubung dengan sertifikat digital di blockchain |
|  **Polygon Blockchain** | Penyimpanan sertifikat yang immutable di Polygon Mainnet |
|  **AI Analysis** | Analisis motif batik otomatis menggunakan Google Gemini 2.5 Flash |
|  **IPFS Storage** | Penyimpanan gambar dan metadata terdesentralisasi via Pinata |
|  **QR Verification** | Verifikasi keaslian melalui scan QR code atau NFC |
|  **ECDSA Signature** | Verifikasi desentralisasi — siapapun bisa verify tanpa server |

##  Arsitektur Sistem

```
┌──────────────────────────────────────────────────┐
│               USER INTERFACE                      │
│          Next.js 14 (App Router)                  │
├──────────────────────────────────────────────────┤
│                API LAYER                          │
│  /api/mint  /api/verify  /api/gallery             │
│  /api/ai-preview  /api/ipfs-upload                │
│  /api/estimate-gas                                │
├──────────────────────────────────────────────────┤
│            EXTERNAL SERVICES                      │
│  Polygon RPC  │  Pinata IPFS  │  Gemini AI        │
├──────────────────────────────────────────────────┤
│              BLOCKCHAIN                           │
│  SertifikatBatik.sol (ERC-721) - Polygon Mainnet  │
└──────────────────────────────────────────────────┘
```

##  Tech Stack

| Teknologi | Versi | Fungsi |
|-----------|-------|--------|
| Next.js | 16 | Frontend & API routes |
| React | 19 | UI framework |
| Ethers.js | v6 | Interaksi blockchain |
| Solidity | ^0.8.20 | Smart contract (ERC-721) |
| Tailwind CSS | v4 | Styling |
| Pinata | - | IPFS storage |
| Google Gemini | 2.5 Flash | AI analisis motif |
| Polygon | Mainnet | Blockchain network |

##  Prasyarat

- Node.js >= 18
- npm atau yarn
- MetaMask (opsional, untuk testing)
- NFC-compatible Android device (untuk fitur NFC)

##  Instalasi

1. **Clone repository:**
   ```bash
   git clone https://github.com/Blazers21k/kti_batik_nft.git
   cd kti_batik_nft
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Setup environment variables:**
   ```bash
   cp .env.example .env.local
   ```

4. **Isi API keys** di `.env.local` (lihat bagian Environment Variables)

5. **Jalankan development server:**
   ```bash
   npm run dev
   ```

6. Buka [http://localhost:3000](http://localhost:3000)

##  Environment Variables

Buat file `.env.local` berdasarkan `.env.example`:

| Variable | Deskripsi | Sumber |
|----------|-----------|--------|
| `ADMIN_PRIVATE_KEY` | Private key wallet admin untuk minting | MetaMask |
| `NEXT_PUBLIC_ADMIN_ADDRESS` | Public address wallet admin | MetaMask |
| `ALCHEMY_RPC_URL` | Polygon RPC endpoint | [Alchemy](https://www.alchemy.com/) |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Alamat smart contract yang di-deploy | Hasil deploy |
| `GEMINI_API_KEY` | API key Google AI | [Google AI Studio](https://aistudio.google.com/) |
| `PINATA_API_KEY` | Pinata IPFS API key | [Pinata](https://pinata.cloud/) |
| `PINATA_SECRET_KEY` | Pinata IPFS secret key | [Pinata](https://pinata.cloud/) |

> ⚠️ **Jangan pernah commit file `.env.local`!** File ini sudah ada di `.gitignore`.

##  Halaman

| Route | Deskripsi |
|-------|-----------|
| `/` | Landing page |
| `/pengrajin` | Halaman pengrajin — cetak sertifikat baru |
| `/gallery` | Lihat semua sertifikat NFT yang sudah dicetak |
| `/verify` | Verifikasi keaslian via QR scan/upload |

##  Alur Kerja

```
1. Pengrajin scan NFC tag          → mendapat UID unik
2. Upload foto batik               → disimpan ke IPFS
3. AI menganalisis motif           → generate deskripsi otomatis
4. Admin mint NFT ke blockchain    → sertifikat immutable
5. ECDSA signature di-generate     → untuk QR code
6. NFC tag ditulis                 → berisi URL verifikasi
7. Konsumen scan NFC/QR            → verifikasi keaslian
```

##  Struktur Project

```
kti_batik_nft/
├── app/
│   ├── api/
│   │   ├── ai-preview/      # AI analisis motif (Gemini)
│   │   ├── estimate-gas/     # Estimasi biaya gas
│   │   ├── gallery/          # Ambil data gallery NFT
│   │   ├── ipfs-upload/      # Upload gambar ke IPFS
│   │   ├── mint/             # Cetak sertifikat NFT
│   │   └── verify/           # Verifikasi keaslian
│   ├── gallery/              # Halaman gallery
│   ├── pengrajin/            # Halaman pengrajin
│   ├── verify/               # Halaman verifikasi
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   └── page.js               # Landing page
├── contracts/
│   └── SertifikatBatik.sol   # Smart contract ERC-721
├── public/                    # Static assets
├── .env.example               # Template environment variables
├── package.json
└── README.md
```

##  Smart Contract

**Contract:** `SertifikatBatik.sol`
- Standard: ERC-721 (NFT) dengan ERC721Enumerable dan ERC721URIStorage
- Network: Polygon Mainnet
- Fitur: NFC UID mapping, duplikasi prevention, QR status management
- Access Control: `Ownable` (hanya admin bisa mint)

##  Deployment

### Vercel (Rekomendasi)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Blazers21k/kti_batik_nft)

> Pastikan menambahkan semua environment variables di Vercel Project Settings.

### Build Manual

```bash
npm run build
npm start
```

##  Catatan

- Sistem ini merupakan **proof of concept** untuk penelitian KTI
- Smart contract sudah di-deploy di **Polygon Mainnet** (production)
- Fitur NFC hanya tersedia di **Chrome Android** (Web NFC API)
- Verifikasi ECDSA bersifat **desentralisasi** — tidak memerlukan server

##  Lisensi

MIT License — Lihat [LICENSE](LICENSE) untuk detail.

##  Author

Dikembangkan untuk **Karya Tulis Ilmiah (KTI)** — Sistem Sertifikasi Keaslian Batik Nusantara.
