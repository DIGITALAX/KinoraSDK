// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.19;

import "./KinoraLibrary.sol";
import "./KinoraErrors.sol";
import "./KinoraEscrow.sol";
import "./KinoraAccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

contract KinoraNFTCreator is ERC721Enumerable {
  address public kinoraEscrow;
  KinoraAccessControl public kinoraAccess;
  uint256 private _tokenSupply;

  mapping(uint256 => string) private _tokenIdURI;

  modifier onlyMaintainer() {
    if (!kinoraAccess.isAdmin(msg.sender)) {
      revert KinoraErrors.InvalidAddress();
    }
    _;
  }
  modifier onlyKinoraEscrow() {
    if (kinoraEscrow != msg.sender) {
      revert KinoraErrors.InvalidContract();
    }
    _;
  }

  event TokenMinted(address playerAddress, uint256 tokenId);

  constructor(
    address _kinoraEscrowAddress,
    address _kinoraAccessAddress
  ) ERC721("KinoraNFTCreator", "KNC") {
    kinoraEscrow = (_kinoraEscrowAddress);
    kinoraAccess = KinoraAccessControl(_kinoraAccessAddress);
    _tokenSupply = 0;
  }

  function mintToken(
    string memory _uri,
    address _playerAddress
  ) public onlyKinoraEscrow {
    _tokenSupply++;

    _tokenIdURI[_tokenSupply] = _uri;

    _safeMint(_playerAddress, _tokenSupply);

    emit TokenMinted(_playerAddress, _tokenSupply);
  }

  function tokenURI(
    uint256 _tokenId
  ) public view virtual override returns (string memory) {
    return _tokenIdURI[_tokenId];
  }

  function getTokenSupply() public view returns (uint256) {
    return _tokenSupply;
  }

  function setKinoraEscrowContract(
    address _newEscrowContract
  ) external onlyMaintainer {
    kinoraEscrow = _newEscrowContract;
  }

  function setKinoraAccessContract(
    address _newAccessContract
  ) external onlyMaintainer {
    kinoraAccess = KinoraAccessControl(_newAccessContract);
  }
}
