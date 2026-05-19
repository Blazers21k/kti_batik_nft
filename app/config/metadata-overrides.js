/**
 * METADATA OVERRIDES
 * Override foto/deskripsi NFT tanpa ubah blockchain.
 * Dipakai saat foto yang di-mint salah dan kontrak belum support updateTokenURI.
 * 
 * Cara pakai:
 * 1. Taruh foto pengganti di /public/ atau upload ke IPFS
 * 2. Tambahkan entry di bawah dengan tokenId sebagai key
 * 3. Push ke Vercel
 */

const METADATA_OVERRIDES = {
  // Token #2: Batik Karya Fattah - foto asli salah, diganti dengan foto batik yang benar
  "2": {
    image: "/batik-fattah.jpg",
  },
};

export default METADATA_OVERRIDES;
