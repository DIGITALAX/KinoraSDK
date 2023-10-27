// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.19;

import "./KinoraLibrary.sol";
import "./KinoraErrors.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

contract KinoraNFTCreator is ERC721Enumerable {
  // Address of the factory contract
  address public factoryContract;
  // Address of the kinora open action contract
  address public kinoraOpenAction;
  // Counter for the total token supply
  uint256 private _tokenSupply;

  // Mapping to store URI of each token ID
  mapping(uint256 => string) private _tokenIdURI;
  // Mapping to store valid escrow contracts for each Lens Profile Id and Lens Pub Id
  mapping(uint256 => mapping(uint256 => address)) private _validEscrowContract;

  // Event emitted when a new token is minted
  event TokenMinted(address playerAddress, uint256 tokenId);
  // Event emitted when a new escrow contract is validated
  event EscrowContractValidated(
    uint256 profileId,
    uint256 pubId,
    address escrowContract
  );

  /**
   * @dev Contract constructor.
   * @param _factoryAddress Address of the factory contract.
   * @param _kinoraOpenActionAddress Address of the kinora open action contract.
   */
  constructor(
    address _factoryAddress,
    address _kinoraOpenActionAddress
  ) ERC721("KinoraNFTCreator", "KNC") {
    factoryContract = _factoryAddress;
    kinoraOpenAction = _kinoraOpenActionAddress;
    _tokenSupply = 0;
  }

  /**
   * @dev Function to mint a new token.
   * @param _uri URI of the token to be minted.
   * @param _playerAddress Address of the player receiving the minted token.
   * @param _profileId Lens Profile Id associated with the minting process.
   * @param _pubId Lens Pub Id associated with the minting process.
   */
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

  /**
   * @dev Function to set a valid escrow contract.
   * @param _profileId Lens Profile Id associated with the escrow contract.
   * @param _pubId Lens Pub Id associated with the escrow contract.
   * @param _newEscrowContract Address of the new escrow contract.
   */
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
   * @dev Function to get the valid escrow contract for a given Lens Profile Id and Lens Pub Id.
   * @param _profileId Lens Profile Id to get the valid escrow contract of.
   * @param _pubId Lens Pub Id to get the valid escrow contract of.
   * @return Address of the valid escrow contract.
   */
  function getValidEscrowContract(
    uint256 _profileId,
    uint256 _pubId
  ) public view returns (address) {
    return _validEscrowContract[_profileId][_pubId];
  }
}
