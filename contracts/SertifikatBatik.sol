// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SertifikatBatik
 * @dev Smart contract untuk sertifikat keaslian batik - Nusantara Batik Chain
 * @notice Deploy di Polygon Mainnet untuk biaya gas rendah
 */
contract SertifikatBatik is ERC721, ERC721URIStorage, ERC721Enumerable, Ownable {
    
    uint256 private _tokenIds;
    
    // Mapping NFC UID ke Token ID (untuk mencegah duplikasi)
    mapping(string => uint256) private _nfcToToken;
    
    // Mapping Token ID ke NFC UID
    mapping(uint256 => string) private _tokenNfcUid;
    
    // Mapping Token ID ke status QR (1 = aktif, 0 = tidak aktif)
    mapping(uint256 => uint8) private _statusQr;
    
    // Event untuk tracking
    event SertifikatDicetak(uint256 indexed tokenId, address indexed penerima, string nfcUid);
    event StatusQrDiubah(uint256 indexed tokenId, uint8 status);
    
    constructor() ERC721("Sertifikat Batik Nusantara", "BATIK") Ownable(msg.sender) {}
    
    /**
     * @dev Cetak sertifikat baru (hanya owner/admin)
     * @param penerima Alamat penerima NFT
     * @param tokenURI Metadata URI (base64 JSON)
     * @param uidNfc UID dari NFC tag fisik
     */
    function cetakSertifikat(
        address penerima,
        string memory tokenURI,
        string memory uidNfc
    ) public onlyOwner returns (uint256) {
        // Validasi NFC UID belum pernah digunakan
        require(_nfcToToken[uidNfc] == 0, "NFC UID sudah terdaftar!");
        require(bytes(uidNfc).length > 0, "NFC UID tidak boleh kosong!");
        
        _tokenIds++;
        uint256 newTokenId = _tokenIds;
        
        // Mint NFT
        _safeMint(penerima, newTokenId);
        _setTokenURI(newTokenId, tokenURI);
        
        // Simpan mapping NFC
        _nfcToToken[uidNfc] = newTokenId;
        _tokenNfcUid[newTokenId] = uidNfc;
        
        // Set status QR aktif
        _statusQr[newTokenId] = 1;
        
        emit SertifikatDicetak(newTokenId, penerima, uidNfc);
        
        return newTokenId;
    }
    
    /**
     * @dev Ambil NFC UID dari Token ID
     */
    function getUidNfc(uint256 tokenId) public view returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token tidak ditemukan");
        return _tokenNfcUid[tokenId];
    }
    
    /**
     * @dev Alias untuk getUidNfc (backward compatibility)
     */
    function nfcUid(uint256 tokenId) public view returns (string memory) {
        return getUidNfc(tokenId);
    }
    
    /**
     * @dev Cek status QR
     */
    function statusQr(uint256 tokenId) public view returns (uint8) {
        require(_ownerOf(tokenId) != address(0), "Token tidak ditemukan");
        return _statusQr[tokenId];
    }
    
    /**
     * @dev Ubah status QR (hanya owner)
     */
    function setStatusQr(uint256 tokenId, uint8 status) public onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Token tidak ditemukan");
        _statusQr[tokenId] = status;
        emit StatusQrDiubah(tokenId, status);
    }
    
    /**
     * @dev Cek apakah NFC UID sudah terdaftar
     */
    function isNfcRegistered(string memory uidNfc) public view returns (bool) {
        return _nfcToToken[uidNfc] != 0;
    }
    
    /**
     * @dev Ambil Token ID dari NFC UID
     */
    function getTokenByNfc(string memory uidNfc) public view returns (uint256) {
        return _nfcToToken[uidNfc];
    }
    
    // Override required functions
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
