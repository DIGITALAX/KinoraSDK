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

/**
 * @title KinoraEscrow
 * @dev This contract manages deposits and withdrawals for quests and milestones.
 */
contract KinoraEscrow {
  string public name;
  string public symbol;
  KinoraAccessControl public accessControl;
  KinoraQuest public quest;
  KinoraQuestData public kinoraQuestData;
  KinoraNFTCreator public kinoraNFTCreator;
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

  // Event emitted when ERC20 tokens are deposited
  event ERC20Deposited(
    address tokenAddress,
    uint256 amount,
    uint256 questId,
    uint256 milestone
  );
  // Event emitted when ERC721 URI is set for a milestone
  event ERC721URISet(string uri, uint256 questId, uint256 milestone);
  // Event emitted when ERC20 tokens are withdrawn
  event ERC20Withdrawn(address toAddress, uint256 questId, uint256 milestone);
  // Event emitted during emergency withdrawal of ERC20 tokens
  event EmergencyERC20Withdrawn(
    address toAddress,
    uint256 questId,
    uint256 milestone
  );
  // Event emitted when ERC721 token is minted
  event ERC721Minted(address playerAddress, uint256 questId, uint256 milestone);

  /**
   * @dev Constructor
   * @param _accessControlAddress Address of the KinoraAccessControl contract
   * @param _kinoraQuestDataAddress Address of the KinoraQuestData contract
   * @param _kinoraNFTCreatorAddress Address of the KinoraNFTCreator contract
   * @param _kinoraOpenActionAddress Address of the KinoraOpenAction contract
   */
  constructor(
    address _accessControlAddress,
    address _kinoraQuestDataAddress,
    address _kinoraNFTCreatorAddress,
    address _kinoraOpenActionAddress
  ) {
    name = "KinoraEscrow";
    symbol = "KES";
    accessControl = KinoraAccessControl(_accessControlAddress);
    kinoraQuestData = KinoraQuestData(_kinoraQuestDataAddress);
    kinoraNFTCreator = KinoraNFTCreator(_kinoraNFTCreatorAddress);
    kinoraOpenAction = _kinoraOpenActionAddress;
  }

  /**
   * @dev Deposits ERC20 tokens for a specific quest milestone
   * @param _tokenAddress Address of the ERC20 token contract
   * @param _fromAddress Address from where the tokens are transferred
   * @param _amount Amount of tokens to deposit
   * @param _questId Quest Id
   * @param _milestone Id of the milestone
   */
  function depositERC20(
    address _tokenAddress,
    address _fromAddress,
    uint256 _amount,
    uint256 _questId,
    uint256 _milestone
  ) external onlyOpenAction {
    IERC20(_tokenAddress).transferFrom(_fromAddress, address(this), _amount);

    _questMilestoneERC20Deposit[_questId][_milestone][_tokenAddress] = _amount;

    emit ERC20Deposited(_tokenAddress, _amount, _questId, _milestone);
  }

  /**
   * @dev Withdraws ERC20 tokens for a specific quest milestone
   * @param _toAddress Address to which the tokens are transferred
   * @param _questId Quest ID
   * @param _milestone ID of the milestone
   */
  function withdrawERC20(
    address _toAddress,
    uint256 _questId,
    uint256 _milestone
  ) external onlyKinoraQuest {
    if (kinoraQuestData.getQuestStatus(_questId) != KinoraLibrary.Status.Open) {
      revert KinoraErrors.QuestClosed();
    }

    _erc20Transfer(_toAddress, _questId, _milestone);

    emit ERC20Withdrawn(_toAddress, _questId, _milestone);
  }

  /**
   * @dev Allows for emergency withdrawal of ERC20 tokens by an admin
   * @param _toAddress The address to send the withdrawn tokens
   * @param _questId The Quest Id
   */
  function emergencyWithdrawERC20(
    address _toAddress,
    uint256 _questId
  ) public onlyQuestEnvoker {
    uint256 _milestoneCount = kinoraQuestData.getQuestMilestoneCount();

    for (uint256 = 0; i < _milestoneCount.length; i++) {
      _erc20Transfer(_toAddress, _questId, i + 1);
    }

    kinoraQuestData.updateQuestStatus(_questId);

    emit EmergencyERC20Withdrawn(_toAddress, _questId, _milestone);
  }

  /**
   * @dev Deposits an ERC721 URI for a specific quest milestone
   * @param _uri The URI of the ERC721 token
   * @param _questId The Quest Id
   * @param _milestone The milestone number for which the deposit is being made
   */
  function depositERC721(
    string memory _uri,
    uint256 _questId,
    uint256 _milestone
  ) external onlyOpenAction {
    _questMilestoneERC721Deposit[_questId][_milestone] = _uri;

    emit ERC721URISet(_uri, _questId, _milestone);
  }

  /**
   * @dev Mints an ERC721 token for a player upon completion of a milestone
   * @param _playerAddress The address of the player
   * @param _questId The Quest Id
   * @param _milestone The milestone number for which the token is being minted
   */
  function mintERC721(
    address _playerAddress,
    uint256 _questId,
    uint256 _milestone
  ) external onlyKinoraQuest {
    kinoraNFTCreator.mintToken(
      _questMilestoneERC721Deposit[_questId][_milestone],
      _playerAddress,
      _questId
    );

    emit ERC721Minted(_playerAddress, _pubId, _milestone);
  }

  /**
   * @dev Internal function to handle ERC20 token transfers
   * @param _toAddress The address to send the tokens
   * @param _questId The Quest Id
   * @param _milestone The Milestone Id */
  function _erc20Transfer(
    address _toAddress,
    uint256 _questId,
    uint256 _milestone
  ) internal {
    uint256 _amount = kinoraQuestData.getQuestMilestoneRewardTokenAmount(
      _questId,
      _milestone
    );

    address _tokenAddress = kinoraQuestData.getQuestMilestoneRewardTokenAddress(
      _questId,
      _milestone
    );

    IERC20(_tokenAddress).transfer(_toAddress, _amount);

    _questMilestoneERC20Deposit[_questId][_milestone][_tokenAddress] -= _amount;
  }

  /**
   * @dev Gets the amount of ERC20 tokens deposited for a specific quest milestone
   * @param _tokenAddress The address of the ERC20 token contract
   * @param _questId The Quest Id
   * @param _milestone The milestone number for which the deposit is being queried
   * @return The amount of tokens deposited
   */
  function getQuestMilestoneERC20Amount(
    address _tokenAddress,
    uint256 _questId,
    uint256 _milestone
  ) public view returns (uint256) {
    return _questMilestoneERC20Deposit[_questId][_milestone][_tokenAddress];
  }

  /**
   * @dev Gets the URI of the ERC721 token deposited for a specific quest milestone
   * @param _questId The Quest Id
   * @param _milestone The milestone number for which the deposit is being queried
   * @return The URI of the ERC721 token
   */
  function getQuestMilestoneERC721URI(
    uint256 _questId,
    uint256 _milestone
  ) public view returns (string memory) {
    return _questMilestoneERC721Deposit[_questId][_milestone];
  }
}
