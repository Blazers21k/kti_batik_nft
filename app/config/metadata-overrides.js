/**
 * METADATA OVERRIDES
 * Override foto/deskripsi NFT tanpa ubah blockchain.
 * Dipakai saat foto yang di-mint salah dan kontrak belum support updateTokenURI.
 */

const METADATA_OVERRIDES = {
  // Token #2: Batik Karya Fattah - foto & deskripsi di-override
  "2": {
    image: "/batik-fattah.jpg",
    description: "Mahakarya saudara Fattah ini memancarkan pesona motif kreasi kontemporer yang elok, di mana sulur flora berpadu harmoni dengan siluet sepasang fauna bersayap dalam simetri yang membelah kelam. Dominasi rona hitam pekat dan abu-abu, yang diselingi pendar aksen putih, secara brilian menerjemahkan esensi filosofis sang pemilik: sebuah keanggunan absolut dan kekuatan yang tak tergoyahkan. Ini bukan sekadar tekstil. Ia adalah wasiat kasih; anugerah sakral dari seorang ibu yang terajut abadi. Karya ini tidak hanya merayakan keluhuran seni budaya Nusantara, tetapi juga mengabadikan narasi personal yang melampaui kefanaan waktu.",
  },
};

export default METADATA_OVERRIDES;
