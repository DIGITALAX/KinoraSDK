// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.19;

import "./KinoraAccessControl.sol";
import "./KinoraQuest.sol";
import "./KinoraLibrary.sol";
import "./KinoraNFTCreator.sol";
import "./KinoraQuestData.sol";
import "./KinoraErrors.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @title KinoraEscrow
 * @dev This contract manages deposits and withdrawals for quests and milestones.
 */
contract KinoraEscrow is Initializable {
  // Name of the escrow contract
  string public name;
  // Symbol of the escrow contract
  string public symbol;
  // Instance of the KinoraAccessControl contract
  KinoraAccessControl public accessControl;
  // Instance of the KinoraQuest contract
  KinoraQuest public quest;
  // Instance of the KinoraQuestData contract
  KinoraQuestData public kinoraQuestData;
  // Instance of the KinoraNFTCreator contract
  KinoraNFTCreator public kinoraNFTCreator;
  // Address of the factory contract
  address public factory;
  // Address of the KinoraOpenAction contract
  address public kinoraOpenAction;

  // Mapping to store ERC20 deposits for quest milestones
  mapping(uint256 => mapping(uint256 => mapping(address => uint256)))
    private _questMilestoneERC20Deposit;
  // Mapping to store ERC721 deposits for quest milestones
  mapping(uint256 => mapping(uint256 => string))
    private _questMilestoneERC721Deposit;

  // Modifier to ensure only KinoraOpenAction can call a function
  modifier onlyOpenAction() {
    if (msg.sender != kinoraOpenAction) {
      revert KinoraErrors.InvalidContract();
    }
    _;
  }

  // Modifier to ensure only KinoraQuest can call a function
  modifier onlyKinoraQuest() {
    if (msg.sender != address(quest)) {
      revert KinoraErrors.InvalidContract();
    }
    _;
  }

  // Modifier to ensure only the Factory contract can call a function
  modifier onlyFactory() {
    if (msg.sender != factory) {
      revert KinoraErrors.InvalidContract();
    }
    _;
  }

  // Event emitted when ERC20 tokens are deposited
  event ERC20Deposited(
    address tokenAddress,
    uint256 amount,
    uint256 pubId,
    uint256 milestone
  );
  // Event emitted when ERC721 URI is set for a milestone
  event ERC721URISet(string uri, uint256 pubId, uint256 milestone);
  // Event emitted when ERC20 tokens are withdrawn
  event ERC20Withdrawn(address toAddress, uint256 pubId, uint256 milestone);
  // Event emitted during emergency withdrawal of ERC20 tokens
  event EmergencyERC20Withdrawn(
    address toAddress,
    uint256 pubId,
    uint256 milestone
  );
  // Event emitted when ERC721 token is minted
  event ERC721Minted(address playerAddress, uint256 pubId, uint256 milestone);

  /**
   * @dev Initializes the contract with the necessary contract instances and addresses
   * @param _accessControlAddress Address of the KinoraAccessControl contract
   * @param _factoryAddress Address of the Factory contract
   * @param _kinoraQuestDataAddress Address of the KinoraQuestData contract
   * @param _kinoraNFTCreatorAddress Address of the KinoraNFTCreator contract
   * @param _kinoraOpenActionAddress Address of the KinoraOpenAction contract
   */
  function initialize(
    address _accessControlAddress,
    address _factoryAddress,
    address _kinoraQuestDataAddress,
    address _kinoraNFTCreatorAddress,
    address _kinoraOpenActionAddress
  ) public {
    name = "KinoraEscrow";
    symbol = "KES";
    accessControl = KinoraAccessControl(_accessControlAddress);
    factory = _factoryAddress;
    kinoraQuestData = KinoraQuestData(_kinoraQuestDataAddress);
    kinoraNFTCreator = KinoraNFTCreator(_kinoraNFTCreatorAddress);
    kinoraOpenAction = _kinoraOpenActionAddress;
  }

  /**
   * @dev Deposits ERC20 tokens for a specific quest milestone
   * @param _tokenAddress Address of the ERC20 token contract
   * @param _fromAddress Address from where the tokens are transferred
   * @param _amount Amount of tokens to deposit
   * @param _pubId Lens Pub Id of the quest
   * @param _milestone Id of the milestone
   */
  function depositERC20(
    address _tokenAddress,
    address _fromAddress,
    uint256 _amount,
    uint256 _pubId,
    uint256 _milestone
  ) external onlyOpenAction {
    IERC20(_tokenAddress).transferFrom(_fromAddress, address(this), _amount);

    _questMilestoneERC20Deposit[_pubId][_milestone][_tokenAddress] = _amount;

    emit ERC20Deposited(_tokenAddress, _amount, _pubId, _milestone);
  }

  /**
   * @dev Withdraws ERC20 tokens for a specific quest milestone
   * @param _toAddress Address to which the tokens are transferred
   * @param _pubId Lens Pub Id of the quest
   * @param _milestone ID of the milestone
   */
  function withdrawERC20(
    address _toAddress,
    uint256 _pubId,
    uint256 _milestone
  ) external onlyKinoraQuest {
    uint256 _profileId = accessControl.getProfileId();
    if (
      kinoraQuestData.getQuestStatus(_profileId, _pubId) !=
      KinoraLibrary.Status.Open
    ) {
      revert KinoraErrors.QuestClosed();
    }

    _erc20Transfer(_toAddress, _pubId, _milestone, _profileId);

    emit ERC20Withdrawn(_toAddress, _pubId, _milestone);
  }

  /**
   * @dev Allows for emergency withdrawal of ERC20 tokens by an admin
   * @param _toAddress The address to send the withdrawn tokens
   * @param _pubId The Lens Pub Id of the quest
   * @param _milestone The milestone number for which the withdrawal is being made
   */
  function emergencyWithdrawERC20(
    address _toAddress,
    uint256 _pubId,
    uint256 _milestone
  ) public {
    if (!accessControl.isAdmin(msg.sender)) {
      revert KinoraErrors.OnlyAdmin();
    }
    uint256 _profileId = accessControl.getProfileId();

    _erc20Transfer(_toAddress, _pubId, _milestone, _profileId);

    kinoraQuestData.updateQuestStatus(_profileId, _pubId);

    emit EmergencyERC20Withdrawn(_toAddress, _pubId, _milestone);
  }

  /**
   * @dev Deposits an ERC721 URI for a specific quest milestone
   * @param _uri The URI of the ERC721 token
   * @param _pubId The Lens Pub Id of the quest
   * @param _milestone The milestone number for which the deposit is being made
   */
  function depositERC721(
    string memory _uri,
    uint256 _pubId,
    uint256 _milestone
  ) external onlyOpenAction {
    _questMilestoneERC721Deposit[_pubId][_milestone] = _uri;

    emit ERC721URISet(_uri, _pubId, _milestone);
  }

  /**
   * @dev Mints an ERC721 token for a player upon completion of a milestone
   * @param _playerAddress The address of the player
   * @param _profileId The Lens Profile Id of the player
   * @param _pubId The Lens Pub Id of the quest
   * @param _milestone The milestone number for which the token is being minted
   */
  function mintERC721(
    address _playerAddress,
    uint256 _profileId,
    uint256 _pubId,
    uint256 _milestone
  ) external onlyKinoraQuest {
    kinoraNFTCreator.mintToken(
      _questMilestoneERC721Deposit[_pubId][_milestone],
      _playerAddress,
      _profileId,
      _pubId
    );

    emit ERC721Minted(_playerAddress, _pubId, _milestone);
  }

  /**
   * @dev Sets the KinoraQuest contract address
   * @param _questContract The address of the KinoraQuest contract
   */
  function setKinoraQuest(address _questContract) public onlyFactory {
    quest = KinoraQuest(_questContract);
  }

  /**
   * @dev Internal function to handle ERC20 token transfers
   * @param _toAddress The address to send the tokens
   * @param _pubId The Lens Pub Id of the quest
   * @param _milestone The milestone number for which the transfer is being made
   * @param _profileId The Lens Profile Id of the player
   */
  function _erc20Transfer(
    address _toAddress,
    uint256 _pubId,
    uint256 _milestone,
    uint256 _profileId
  ) internal {
    uint256 _amount = kinoraQuestData.getQuestMilestoneRewardTokenAmount(
      _profileId,
      _pubId,
      _milestone
    );
    address _tokenAddress = kinoraQuestData.getQuestMilestoneRewardTokenAddress(
      _profileId,
      _pubId,
      _milestone
    );

    if (
      _questMilestoneERC20Deposit[_pubId][_milestone][_tokenAddress] < _amount
    ) {
      revert KinoraErrors.InsufficientBalance();
    }

    IERC20(_tokenAddress).transfer(_toAddress, _amount);

    _questMilestoneERC20Deposit[_pubId][_milestone][_tokenAddress] -= _amount;
  }

  /**
   * @dev Gets the amount of ERC20 tokens deposited for a specific quest milestone
   * @param _tokenAddress The address of the ERC20 token contract
   * @param _pubId The Lens Pub Id of the quest
   * @param _milestone The milestone number for which the deposit is being queried
   * @return The amount of tokens deposited
   */
  function getQuestMilestoneERC20Amount(
    address _tokenAddress,
    uint256 _pubId,
    uint256 _milestone
  ) public view returns (uint256) {
    return _questMilestoneERC20Deposit[_pubId][_milestone][_tokenAddress];
  }

  /**
   * @dev Gets the URI of the ERC721 token deposited for a specific quest milestone
   * @param _pubId The Lens Pub Id of the quest
   * @param _milestone The milestone number for which the deposit is being queried
   * @return The URI of the ERC721 token
   */
  function getQuestMilestoneERC721URI(
    uint256 _pubId,
    uint256 _milestone
  ) public view returns (string memory) {
    return _questMilestoneERC721Deposit[_pubId][_milestone];
  }
}
