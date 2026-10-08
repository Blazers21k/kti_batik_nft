import { ethers } from "ethers";

const CONTRACT_ABI = [
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function statusQr(uint256 tokenId) view returns (uint8)",
  "function getUidNfc(uint256 tokenId) view returns (string)",
  "function nfcUid(uint256 tokenId) view returns (string)",
  "function getTokenByNfc(string uidNfc) view returns (uint256)",
  "function isNfcRegistered(string uidNfc) view returns (bool)",
  "function totalSupply() view returns (uint256)"
];

export function getReadContract() {
  const rpcUrl = process.env.ALCHEMY_RPC_URL;
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (!rpcUrl || !contractAddress) throw new Error("Konfigurasi blockchain tidak lengkap.");
  return new ethers.Contract(contractAddress, CONTRACT_ABI, new ethers.JsonRpcProvider(rpcUrl));
}

export async function decodeTokenMetadata(uri) {
  if (!uri) return { name: "Unknown", description: "-", attributes: [] };
  try {
    if (uri.startsWith("data:application/json;base64,")) {
      return JSON.parse(Buffer.from(uri.split(",")[1], "base64").toString("utf8"));
    }

    const url = uri.startsWith("ipfs://")
      ? `https://gateway.pinata.cloud/ipfs/${uri.slice("ipfs://".length)}`
      : uri;
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`Metadata gateway returned ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn("Gagal membaca metadata sertifikat:", error.message);
    return { name: "Unknown", description: "-", attributes: [] };
  }
}

export function getAttributeValue(metadata, traitTypes) {
  const wanted = new Set(traitTypes.map((type) => type.toLowerCase()));
  const attribute = metadata?.attributes?.find((item) => wanted.has(String(item.trait_type || "").toLowerCase()));
  return attribute?.value ?? null;
}

export function getMetadataMaterials(metadata) {
  const directMaterials = metadata?.materials;
  if (Array.isArray(directMaterials) && directMaterials.length > 0) {
    const materials = [...new Set(directMaterials.map((item) => String(item || "").trim()).filter(Boolean))];
    if (materials.length > 0) return materials;
  }

  const attributes = (metadata?.attributes || [])
    .filter((item) => ["bahan", "bahan yang digunakan", "material"].includes(String(item.trait_type || "").toLowerCase()))
    .flatMap((item) => Array.isArray(item.value) ? item.value : [item.value])
    .flatMap((value) => String(value || "").split(","))
    .map((value) => value.trim())
    .filter(Boolean);
  return [...new Set(attributes)];
}

export function getMetadataTechnique(metadata) {
  const directTechnique = metadata?.technique
    ?? metadata?.jenisBatik
    ?? metadata?.batikTechnique;
  if (directTechnique !== undefined && directTechnique !== null && String(directTechnique).trim()) {
    return String(directTechnique).trim();
  }
  return getAttributeValue(metadata, ["Jenis Batik", "Teknik Batik", "Teknik Pembuatan"]);
}

export function getMetadataIssueDate(metadata) {
  const directDate = metadata?.issuedAt
    ?? metadata?.issueDate
    ?? metadata?.tanggalTerbit
    ?? metadata?.Date
    ?? metadata?.date;
  if (directDate !== undefined && directDate !== null && String(directDate).trim()) {
    return directDate;
  }
  return getAttributeValue(metadata, ["Tanggal Terbit", "Date", "Tanggal Sertifikasi"]);
}

export async function findTokenByNfcUid(uid) {
  const contract = getReadContract();
  try {
    const tokenId = await contract.getTokenByNfc(uid);
    if (tokenId > 0n) return tokenId.toString();
    return null;
  } catch {
    // Kontrak lama mungkin belum menyediakan mapping UID langsung.
  }

  try {
    const totalSupply = Number(await contract.totalSupply());
    for (let index = 1; index <= totalSupply; index += 1) {
      let registeredUid;
      try {
        registeredUid = await contract.getUidNfc(index);
      } catch {
        try {
          registeredUid = await contract.nfcUid(index);
        } catch {
          continue;
        }
      }
      if (registeredUid === uid) return String(index);
    }
  } catch (error) {
    console.warn("Gagal mencari UID NFC pada blockchain:", error.message);
  }
  return null;
}

export async function readCertificateFromChain(tokenId) {
  const contract = getReadContract();
  const [owner, uri] = await Promise.all([
    contract.ownerOf(tokenId),
    contract.tokenURI(tokenId)
  ]);

  let nfcUid = "-";
  try {
    nfcUid = await contract.getUidNfc(tokenId);
  } catch {
    try {
      nfcUid = await contract.nfcUid(tokenId);
    } catch {
      nfcUid = "-";
    }
  }

  let statusText = "TERDAFTAR";
  try {
    const status = await contract.statusQr(tokenId);
    statusText = status.toString() === "1" ? "AKTIF" : "NONAKTIF";
  } catch {
    // Token pada kontrak lama mungkin tidak menyediakan status.
  }

  return {
    id: String(tokenId),
    owner,
    uri,
    nfcUid,
    status: statusText,
    metadata: await decodeTokenMetadata(uri)
  };
}
