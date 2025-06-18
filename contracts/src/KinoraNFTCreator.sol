// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.26;

import "./KinoraLibrary.sol";
import "./KinoraErrors.sol";
import "./KinoraEscrow.sol";
import "./KinoraAccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract KinoraNFTCreator is ERC721Enumerable, Initializable {
  KinoraAccessControl public kinoraAccess;
  address public kinoraEscrow;
  address public kinoraOpenAction;
  uint256 private _tokenSupply;

  mapping(uint256 => string) private _tokenIdURI;

  modifier onlyMaintainer() {
    if (!kinoraAccess.isEnvoker(msg.sender)) {
      revert KinoraErrors.InvalidAddress();
    }
    _;
  }
  modifier onlyMaintainerOrOpenAction() {
    if (!kinoraAccess.isEnvoker(msg.sender) && msg.sender != kinoraOpenAction) {
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

  constructor() ERC721("KinoraNFTCreator", "KNC") {}

  function initialize(
    address kinoraAccessAddress,
    address kinoraOpenActionAddress
  ) public initializer {
    if (address(kinoraAccess) != address(0)) {
      revert KinoraErrors.AlreadyInitialized();
    }
    kinoraAccess = KinoraAccessControl(kinoraAccessAddress);
    kinoraOpenAction = kinoraOpenActionAddress;
    _tokenSupply = 0;
  }

  function mintToken(
    string memory uri,
    address playerAddress
  ) public onlyKinoraEscrow {
    _tokenSupply++;

    _tokenIdURI[_tokenSupply] = uri;

    _safeMint(playerAddress, _tokenSupply);

    emit TokenMinted(playerAddress, _tokenSupply);
  }

  function tokenURI(
    uint256 tokenId
  ) public view virtual override returns (string memory) {
    return _tokenIdURI[tokenId];
  }

  function getTokenSupply() public view returns (uint256) {
    return _tokenSupply;
  }

  function setKinoraEscrowContract(
    address newEscrowContract
  ) external onlyMaintainerOrOpenAction {
    kinoraEscrow = newEscrowContract;
  }

  function setKinoraAccessContract(
    address newAccessContract
  ) external onlyMaintainer {
    kinoraAccess = KinoraAccessControl(newAccessContract);
  }
}
