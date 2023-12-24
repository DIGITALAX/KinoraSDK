// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.19;

import "./KinoraLibrary.sol";
import "./KinoraErrors.sol";
import "./KinoraEscrow.sol";
import "./KinoraAccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

contract KinoraNFTCreator is ERC721Enumerable {
  // Kinora Escrow
  KinoraEscrow public kinoraEscrow;
  // Kinora Escrow
  KinoraAccessControl public kinoraAccess;
  // Counter for the total token supply
  uint256 private _tokenSupply;

  // Mapping to store URI of each token ID
  mapping(uint256 => string) private _tokenIdURI;

  // Ensures the caller is the maintainer.
  modifier onlyMaintainer() {
    if (!kinoraAccess.isAdmin(msg.sender)) {
      revert KinoraErrors.InvalidAddress();
    }
    _;
  }

  // Ensure the caller is only the Kinora Escrow
  modifier onlyKinoraEscrow() {
    if (address(kinoraEscrow) != msg.sender) {
      revert KinoraErrors.InvalidContract();
    }
    _;
  }

  // Event emitted when a new token is minted
  event TokenMinted(address playerAddress, uint256 tokenId);

  /**
   * @dev Contract constructor.
   * @param _kinoraEscrowAddress Address of the Kinora Escrow contract.
   * @param _kinoraAccessAddress Address of the Kinora Access contract.
   */
  constructor(
    address _kinoraEscrowAddress,
    address _kinoraAccessAddress
  ) ERC721("KinoraNFTCreator", "KNC") {
    kinoraEscrow = _kinoraEscrowAddress;
    kinoraAccess = _kinoraAccessAddress;
    _tokenSupply = 0;
  }

  /**
   * @dev Function to mint a new token.
   * @param _uri URI of the token to be minted.
   * @param _playerAddress Address of the player receiving the minted token.
   * @param _questId The Quest Id.
   */
  function mintToken(
    string memory _uri,
    address _playerAddress,
    uint256 _questId
  ) public onlyKinoraEscrow {
    _tokenSupply++;

    _tokenIdURI[_tokenSupply] = _uri;

    _safeMint(_playerAddress, _tokenSupply);

    emit TokenMinted(_playerAddress, _tokenSupply);
  }

  /**
   * @dev Function to get the URI of a token.
   * @param _tokenId Token ID to get the URI of.
   * @return URI of the token.
   */
  function tokenURI(
    uint256 _tokenId
  ) public view virtual override returns (string memory) {
    return _tokenIdURI[_tokenId];
  }

  /**
   * @dev Function to get the current token supply.
   * @return Current token supply.
   */
  function getTokenSupply() public view returns (uint256) {
    return _tokenSupply;
  }

  /**
   * @dev Sets a new valid escrow contract.
   * @param _newEscrowContract The address of the new escrow contract.
   */
  function setKinoraEscrowContract(
    address _newEscrowContract
  ) external onlyMaintainer {
    kinoraEscrow = KinoraEscrow(_newEscrowContract);
  }

  /**
   * @dev Sets a new valid access contract.
   * @param _newAccessContract The address of the new access contract.
   */
  function setKinoraAccessContract(
    address _newAccessContract
  ) external onlyMaintainer {
    kinoraAccess = KinoraAccessControl(_newAccessContract);
  }
}
