// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.19;

import "./KinoraLibrary.sol";
import "./KinoraErrors.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

contract KinoraNFTCreator is ERC721Enumerable {
  address public factoryContract;
  address public kinoraOpenAction;
  uint256 private _tokenSupply;

  mapping(uint256 => string) private _tokenIdURI;
  mapping(uint256 => mapping(uint256 => address)) private _validEscrowContract;

  event TokenMinted(address playerAddress, uint256 tokenId);
  event EscrowContractValidated(
    uint256 profileId,
    uint256 pubId,
    address escrowContract
  );

  constructor(
    address _factoryAddress,
    address _kinoraOpenActionAddress
  ) ERC721("KinoraNFTCreator", "KNC") {
    factoryContract = _factoryAddress;
    kinoraOpenAction = _kinoraOpenActionAddress;
    _tokenSupply = 0;
  }

  function mintToken(
    string memory _uri,
    address _playerAddress,
    uint256 _profileId,
    uint256 _pubId
  ) public {
    if (_validEscrowContract[_profileId][_pubId] != msg.sender) {
      revert KinoraErrors.InvalidContract();
    }
    _tokenSupply++;

    _tokenIdURI[_tokenSupply] = _uri;

    _safeMint(_playerAddress, _tokenSupply);

    emit TokenMinted(_playerAddress, _tokenSupply);
  }

  function setValidEscrowContract(
    uint256 _profileId,
    uint256 _pubId,
    address _newEscrowContract
  ) external {
    if (msg.sender != factoryContract && msg.sender != kinoraOpenAction) {
      revert KinoraErrors.InvalidAddress();
    }
    _validEscrowContract[_profileId][_pubId] = _newEscrowContract;

    emit EscrowContractValidated(_profileId, _pubId, _newEscrowContract);
  }

  function tokenURI(
    uint256 _tokenId
  ) public view virtual override returns (string memory) {
    return _tokenIdURI[_tokenId];
  }

  function getTokenSupply() public view returns (uint256) {
    return _tokenSupply;
  }

  function getValidEscrowContract(
    uint256 _profileId,
    uint256 _pubId
  ) public view returns (address) {
    return _validEscrowContract[_profileId][_pubId];
  }
}
