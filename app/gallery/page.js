"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

// Komponen Logo Gemini
const GeminiLogo = ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M16.4992 2C16.2788 7.10686 19.103 10.5 22 12.0035C18.6665 13.4248 16.389 16.9227 16.4992 22C14.9661 19.7302 11.8267 17.2014 8.5 16.5C10.25 15.5 12 14.2995 12.5 12C10.8333 10.5833 7.5 9.49999 2 9.5C6.29926 8.45971 9.59745 6.55808 11 2.5C12.601 5.52976 14.2707 5.95309 16.4992 2Z" fill="url(#paint0_linear_gallery)" />
        <defs>
            <linearGradient id="paint0_linear_gallery" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                <stop stopColor="#10B981" />
                <stop offset="1" stopColor="#3B82F6" />
            </linearGradient>
        </defs>
    </svg>
);

// Helper: Format tanggal
const formatDate = (dateString) => {
    if (!dateString || dateString === "-") return "-";
    try {
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    } catch {
        return dateString;
    }
};

// Komponen Card NFT
const NFTCard = ({ nft }) => {
    const getAttribute = (traitType) => {
        const attr = nft.attributes?.find(a => a.trait_type === traitType);
        return attr ? attr.value : "-";
    };

    return (
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden hover:border-emerald-500/30 transition-all group">
            {/* Image Preview */}
            <div className="h-40 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 relative overflow-hidden">
                {nft.image && nft.image !== "ipfs://simulasi" ? (
                    <img
                        src={nft.image.startsWith("data:") ? nft.image : nft.image.replace("ipfs://", "https://ipfs.io/ipfs/")}
                        alt={nft.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="text-6xl opacity-30">🎨</span>
                    </div>
                )}

                {/* Token ID Badge */}
                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full">
                    <span className="text-[10px] font-mono text-white">#{nft.tokenId}</span>
                </div>

                {/* Verified Badge */}
                <div className="absolute top-3 right-3 bg-emerald-500/80 backdrop-blur-sm px-2 py-1 rounded-full">
                    <span className="text-[10px] text-white font-bold">✓ VERIFIED</span>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
                <h3 className="text-white font-bold text-sm truncate">{nft.name}</h3>

                <p className="text-slate-400 text-xs line-clamp-2 h-8">
                    {nft.description?.substring(0, 100)}...
                </p>

                {/* Attributes */}
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="bg-white/5 p-2 rounded-lg">
                        <p className="text-slate-500">Verifikator</p>
                        <p className="text-white font-medium truncate">{getAttribute("Verified By")}</p>
                    </div>
                    <div className="bg-white/5 p-2 rounded-lg">
                        <p className="text-slate-500">Tanggal</p>
                        <p className="text-white font-medium">{formatDate(getAttribute("Date"))}</p>
                    </div>
                </div>

                {/* NFC UID */}
                <div className="bg-cyan-500/10 p-2 rounded-lg border border-cyan-500/20">
                    <p className="text-[10px] text-cyan-400 font-mono truncate">
                        🔗 NFC: {nft.nfcUid}
                    </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                    <Link
                        href={nft.verifyUrl}
                        className="flex-1 text-center py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 transition-all"
                    >
                        🔍 LIHAT DETAIL
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default function GalleryPage() {
    const [nfts, setNfts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchGallery = async () => {
            try {
                const res = await fetch("/api/gallery");
                const data = await res.json();

                if (data.success) {
                    setNfts(data.data);
                } else {
                    setError(data.error || "Gagal memuat data");
                }
            } catch (err) {
                setError("Gagal terhubung ke server: " + err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchGallery();
    }, []);

    // Loading State
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 relative overflow-hidden flex flex-col justify-center items-center">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-emerald-950/20 to-slate-950" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />

                <div className="relative z-10 text-center">
                    <GeminiLogo className="w-20 h-20 mx-auto animate-spin" style={{ animationDuration: '3s' }} />
                    <p className="mt-6 text-emerald-400/80 animate-pulse text-sm font-mono tracking-wider">
                        Memuat Koleksi Sertifikat...
                    </p>
                </div>
            </div>
        );
    }

    // Error State
    if (error) {
        return (
            <div className="min-h-screen bg-slate-950 relative overflow-hidden flex justify-center items-center p-4">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-red-950/20 to-slate-950" />

                <div className="relative z-10 bg-red-500/10 backdrop-blur-xl p-8 rounded-3xl border border-red-500/30 text-center max-w-md">
                    <span className="text-5xl">⚠️</span>
                    <h1 className="text-xl font-bold text-red-400 mt-4 mb-2">Gagal Memuat Gallery</h1>
                    <p className="text-red-300/80 text-sm">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 px-6 py-3 bg-white/10 border border-white/10 text-white rounded-xl font-bold text-sm hover:bg-white/20 transition-all"
                    >
                        🔄 COBA LAGI
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-emerald-950/20 to-slate-950" />
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:50px_50px]" />

            {/* Content */}
            <div className="relative z-10 min-h-screen p-4 md:p-8">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl mb-4 shadow-lg shadow-emerald-500/30">
                        <span className="text-3xl">🎨</span>
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight">Gallery Sertifikat</h1>
                    <p className="text-emerald-400/80 font-medium text-sm mt-2 uppercase tracking-[0.2em]">
                        Nusantara Batik Chain
                    </p>

                    {/* Stats */}
                    <div className="mt-6 inline-flex items-center gap-3 bg-white/5 backdrop-blur-sm px-6 py-3 rounded-full border border-white/10">
                        <GeminiLogo className="w-5 h-5" />
                        <span className="text-white font-bold">{nfts.length}</span>
                        <span className="text-slate-400 text-sm">Sertifikat Terverifikasi</span>
                    </div>
                </div>

                {/* Navigation */}
                <div className="max-w-6xl mx-auto mb-8 flex justify-center gap-4">
                    <Link
                        href="/"
                        className="px-6 py-3 bg-white/5 border border-white/10 text-slate-300 rounded-xl font-bold text-sm hover:bg-white/10 transition-all"
                    >
                        🏠 Home
                    </Link>
                    <Link
                        href="/pengrajin"
                        className="px-6 py-3 bg-white/5 border border-white/10 text-slate-300 rounded-xl font-bold text-sm hover:bg-white/10 transition-all"
                    >
                        🎨 Posko Digital
                    </Link>
                    <Link
                        href="/verify"
                        className="px-6 py-3 bg-white/5 border border-white/10 text-slate-300 rounded-xl font-bold text-sm hover:bg-white/10 transition-all"
                    >
                        🔍 Scan QR
                    </Link>
                </div>

                {/* Empty State */}
                {nfts.length === 0 ? (
                    <div className="max-w-md mx-auto text-center py-20">
                        <span className="text-6xl">📭</span>
                        <h2 className="text-xl font-bold text-white mt-6 mb-2">Belum Ada Sertifikat</h2>
                        <p className="text-slate-400 text-sm mb-6">
                            Belum ada sertifikat batik yang dicetak. Mulai dengan mencetak sertifikat pertama Anda!
                        </p>
                        <Link
                            href="/pengrajin"
                            className="inline-block px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition-all"
                        >
                            ✨ CETAK SERTIFIKAT
                        </Link>
                    </div>
                ) : (
                    /* NFT Grid */
                    <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {nfts.map((nft) => (
                            <NFTCard key={nft.tokenId} nft={nft} />
                        ))}
                    </div>
                )}

                {/* Footer */}
                <div className="text-center mt-16 pb-8">
                    <p className="text-slate-500 text-xs">
                        Powered by <span className="text-emerald-400">Polygon</span> •
                        <span className="text-slate-400 ml-1">Batik Chain Protocol v1.0</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
