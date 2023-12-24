// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.19;

import "./KinoraAccessControl.sol";
import "./KinoraEscrow.sol";
import "./KinoraLibrary.sol";
import "./KinoraQuestData.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC721.sol";

contract KinoraQuest {
  string public name;
  string public symbol;
  KinoraAccessControl public accessControl;
  KinoraQuestData public kinoraQuestData;
  KinoraEscrow public kinoraEscrow;
  address public kinoraOpenAction;

  /**
   * @dev Modifier to ensure function caller is the open action address.
   */
  modifier onlyOpenAction() {
    if (kinoraOpenAction != msg.sender) {
      revert KinoraErrors.InvalidAddress();
    }
    _;
  }

  /**
   * @dev Modifier to only the Quest Envoker can call.
   */
  modifier onlyQuestEnvoker() {
    if (kinoraQuestData.getQuestEnvokerAddress() != msg.sender) {
      KinoraErrors.InvalidAddress();
    }
    _;
  }

  /**
   * @dev Modifier to ensure the quest associated with the provided pubId is open.
   * @param _pubId The Lens Pub Id of the quest.
   */
  modifier questOpen(uint256 _pubId) {
    uint256 _profileId = accessControl.getProfileId();
    if (
      kinoraQuestData.getQuestStatus(_profileId, _pubId) ==
      KinoraLibrary.Status.Closed
    ) {
      revert KinoraErrors.QuestClosed();
    }
    _;
  }

  // Event emitted when a new quest is created.
  event NewQuestCreated(
    uint256 profileId,
    uint256 pubId,
    uint256 milestoneCount
  );
  // Event emitted when a player completes a quest milestone.
  event PlayerCompleteQuestMilestone(
    uint256 pubId,
    uint256 milestone,
    uint256 playerProfileId
  );
  // Event emitted when a quest is terminated.
  event QuestTerminated(uint256 profileId, uint256 pubId);
  // Event emitted when a player joins a quest.
  event PlayerJoinQuest(uint256 pubId, uint256 playerProfileId);

  /**
   * @dev Constructor
   * @param _accessControlAddress Address of the AccessControl contract.
   * @param _escrowAddress Address of the Escrow contract.
   * @param _kinoraQuestDataAddress Address of the QuestData contract.
   * @param _kinoraOpenActionAddress Address of the OpenAction contract.
   */
  constructor(
    address _accessControlAddress,
    address _escrowAddress,
    address _kinoraQuestDataAddress,
    address _kinoraOpenActionAddress
  ) {
    name = "KinoraQuest";
    symbol = "KQU";
    accessControl = KinoraAccessControl(_accessControlAddress);
    kinoraEscrow = KinoraEscrow(_escrowAddress);
    kinoraQuestData = KinoraQuestData(_kinoraQuestDataAddress);
    kinoraOpenAction = _kinoraOpenActionAddress;
  }

  /**
   * @dev Instantiates a new quest with provided details.
   * @param _encodedMilestones Encoded milestones data.
   * @param _maxPlayerCount Maximum number of players that can join the quest.
   * @param _pubId Lens Pub Id of the quest.
   * @param _profileId Lens Profile Id of the quest creator.
   */
  function instantiateNewQuest(
    bytes memory _encodedMilestones,
    uint256 _maxPlayerCount,
    uint256 _pubId,
    uint256 _profileId
  ) external onlyOpenAction {
    (
      KinoraLibrary.Milestone[] memory _milestones,
      KinoraLibrary.GatingLogic memory _gated
    ) = abi.decode(
        _encodedMilestones,
        (KinoraLibrary.Milestone[], KinoraLibrary.GatingLogic)
      );
    kinoraQuestData.newQuest(
      _milestones,
      _gated,
      _maxPlayerCount,
      _pubId,
      _profileId
    );

    emit NewQuestCreated(_profileId, _pubId, _milestones.length);
  }

  /**
   * @dev Terminates an ongoing quest.
   * @param _pubId Lens Pub Id of the quest to terminate.
   */
  function terminateQuest(
    uint256 _pubId
  ) public onlyQuestEnvoker questOpen(_pubId) {
    uint256 _profileId = accessControl.getProfileId();

    kinoraQuestData.updateQuestStatus(_profileId, _pubId);

    emit QuestTerminated(_profileId, _pubId);
  }

  /**
   * @dev Allows a player to join a quest.
   * @param _playerAddress Address of the joining player.
   * @param _pubId Lens Pub Id of the quest.
   * @param _playerProfileId Lens Profile Id of the joining player.
   */
  function playerJoinQuest(
    address _playerAddress,
    uint256 _pubId,
    uint256 _playerProfileId
  ) external onlyOpenAction questOpen(_pubId) {
    uint256 _profileId = accessControl.getProfileId();

    address[] memory _erc20s = kinoraQuestData.getQuestGatedERC20Addresses(
      _profileId,
      _pubId
    );
    address[] memory _erc721s = kinoraQuestData.getQuestGatedERC721Addresses(
      _profileId,
      _pubId
    );
    uint256[] memory _thresholds = kinoraQuestData.getQuestGatedERC20Thresholds(
      _profileId,
      _pubId
    );
    uint256[][] memory _tokens = kinoraQuestData.getQuestGatedERC721Tokens(
      _profileId,
      _pubId
    );
    bool _oneOf = kinoraQuestData.getQuestGatedOneOf(_profileId, _pubId);

    if (
      !_isEligible(
        _erc721s,
        _erc20s,
        _tokens,
        _thresholds,
        _playerAddress,
        _oneOf
      )
    ) {
      revert KinoraErrors.PlayerNotEligible();
    }

    kinoraQuestData.joinQuest(
      _playerAddress,
      _pubId,
      _profileId,
      _playerProfileId
    );

    emit PlayerJoinQuest(_pubId, _playerProfileId);
  }

  /**
   * @dev Allows a player to complete a milestone of a quest.
   * @param _pubId Lens Pub Id of the quest.
   * @param _milestone Milestone number to be completed.
   * @param _playerProfileId Lens Profile Id of the completing player.
   */
  function playerCompleteMilestone(
    uint256 _pubId,
    uint256 _profileId,
    uint256 _milestone,
    uint256 _playerProfileId
  ) external onlyOpenAction questOpen(_pubId) {
    uint256 _profileId = accessControl.getProfileId();
    address _playerAddress = kinoraQuestData.getPlayerAddress(_playerProfileId);
    if (
      _milestone == 0 ||
      _milestone > kinoraQuestData.getQuestMilestoneCount(_profileId, _pubId)
    ) {
      revert KinoraErrors.MilestoneInvalid();
    }

    bool _joined = kinoraQuestData.getPlayerHasJoinedQuest(
      _playerProfileId,
      _profileId,
      _pubId
    );

    address[] memory _erc20s = kinoraQuestData.getMilestoneGatedERC20Addresses(
      _profileId,
      _pubId,
      _milestone
    );
    address[] memory _erc721s = kinoraQuestData
      .getMilestoneGatedERC721Addresses(_profileId, _pubId, _milestone);
    uint256[] memory _thresholds = kinoraQuestData
      .getMilestoneGatedERC20Thresholds(_profileId, _pubId, _milestone);
    uint256[][] memory _tokens = kinoraQuestData.getMilestoneGatedERC721Tokens(
      _profileId,
      _pubId,
      _milestone
    );
    bool _oneOf = kinoraQuestData.getQuestGatedOneOf(_profileId, _pubId);

    if (
      _milestoneVerify(
        KinoraLibrary.MilestoneVerify({
          tokens: _tokens,
          erc721s: _erc721s,
          erc20s: _erc20s,
          thresholds: _thresholds,
          playerAddress: _playerAddress,
          playerProfileId: _playerProfileId,
          profileId: _profileId,
          pubId: _pubId,
          milestone: _milestone,
          joined: _joined,
          oneOf: _oneOf
        })
      )
    ) {
      _transferReward(
        KinoraLibrary.TransferReward({
          playerAddress: _playerAddress,
          profileId: _profileId,
          playerProfileId: _playerProfileId,
          pubId: _pubId,
          milestone: _milestone
        })
      );
    } else {
      revert KinoraErrors.PlayerNotEligible();
    }

    emit PlayerCompleteQuestMilestone(_pubId, _milestone, _playerProfileId);
  }

  /**
   * Evaluates the eligibility of a player based on the specified ERC-721 and ERC-20 conditions.
   *
   * @param _erc721s - An array of addresses of ERC-721 contracts.
   * @param _erc20s - An array of addresses of ERC-20 contracts.
   * @param _tokens - An array of token IDs for the ERC-721 contracts.
   * @param _thresholds - An array of threshold values for the ERC-20 contracts.
   * @param _playerAddress - The Ethereum address of the player.
   * @param _oneOf - A boolean indicating whether the player must meet at least one of the conditions or all of them.
   * @return A boolean indicating whether the player meets the specified conditions.
   */
  function _isEligible(
    address[] memory _erc721s,
    address[] memory _erc20s,
    uint256[][] memory _tokens,
    uint256[] memory _thresholds,
    address _playerAddress,
    bool _oneOf
  ) internal view returns (bool) {
    bool eligible;

    if (_oneOf) {
      eligible = (_checkERC721Conditions(_erc721s, _tokens, _playerAddress) ||
        _checkERC20Conditions(_erc20s, _thresholds, _playerAddress));
    } else {
      eligible = (_checkERC721Conditions(_erc721s, _tokens, _playerAddress) &&
        _checkERC20Conditions(_erc20s, _thresholds, _playerAddress));
    }

    return eligible;
  }

  /**
   * Checks the specified ERC-721 conditions for a player.
   *
   * @param _erc721Addresses - An array of addresses of ERC-721 contracts.
   * @param _erc721TokenIds - An array of an array of token IDs for the ERC-721 contracts.
   * @param _playerAddress - The Ethereum address of the player.
   * @return A boolean indicating whether the player meets any of the specified ERC-721 conditions.
   */
  function _checkERC721Conditions(
    address[] memory _erc721Addresses,
    uint256[][] memory _erc721TokenIds,
    address _playerAddress
  ) internal view returns (bool) {
    for (uint256 i = 0; i < _erc721Addresses.length; i++) {
      IERC721 _erc721Contract = IERC721(_erc721Addresses[i]);
      if (_erc721TokenIds[i].length != 0) {
        bool tokenOwned;
        for (uint256 j = 0; j < _erc721TokenIds[i].length; j++) {
          if (
            _erc721Contract.ownerOf(_erc721TokenIds[i][j]) == _playerAddress
          ) {
            tokenOwned = true;
            break;
          }
        }
        if (!tokenOwned) return false;
      } else {
        if (_erc721Contract.balanceOf(_playerAddress) == 0) return false;
      }
    }
    return true;
  }

  /**
   * Checks the specified ERC-20 conditions for a player.
   *
   * @param _erc20Addresses - An array of addresses of ERC-20 contracts.
   * @param _erc20Thresholds - An array of threshold values for the ERC-20 contracts.
   * @param _playerAddress - The Ethereum address of the player.
   * @return A boolean indicating whether the player meets any of the specified ERC-20 conditions.
   */
  function _checkERC20Conditions(
    address[] memory _erc20Addresses,
    uint256[] memory _erc20Thresholds,
    address _playerAddress
  ) internal view returns (bool) {
    for (uint256 i = 0; i < _erc20Addresses.length; i++) {
      if (
        IERC20(_erc20Addresses[i]).balanceOf(_playerAddress) >=
        _erc20Thresholds[i]
      ) return true;
    }
    return false;
  }

  /**
   * Checks if the milestone is eligible to pass.
   *
   * @param  _params - Milestone Verify interface
   * @return A boolean indicating whether the player has passed the milestone.
   */
  function _milestoneVerify(
    KinoraLibrary.MilestoneVerify memory _params
  ) internal view returns (bool) {
    return (_params.joined &&
      kinoraQuestData.getPlayerMilestonesCompletedPerQuest(
        _params.playerProfileId,
        _params.profileId,
        _params.pubId
      ) <
      _params.milestone &&
      (kinoraQuestData.getPlayerMilestonesCompletedPerQuest(
        _params.playerProfileId,
        _params.profileId,
        _params.pubId
      ) +
        1 ==
        _params.milestone) &&
      kinoraQuestData.getPlayerEligibleToClaimMilestone(
        _params.playerProfileId,
        _params.profileId,
        _params.pubId,
        _params.milestone
      ) &&
      _isEligible(
        _params.erc721s,
        _params.erc20s,
        _params.tokens,
        _params.thresholds,
        _params.playerAddress,
        _params.oneOf
      ));
  }

  /**
   * Transfers the ERC20 or ERC721 reward to the player.
   *
   * @param  _params - Transfer Reward interface
   */
  function _transferReward(
    KinoraLibrary.TransferReward memory _params
  ) internal {
    if (
      kinoraQuestData.getQuestMilestoneRewardType(
        _params.profileId,
        _params.pubId,
        _params.milestone
      ) == KinoraLibrary.RewardType.ERC20
    ) {
      kinoraEscrow.withdrawERC20(
        _params.playerAddress,
        _params.pubId,
        _params.milestone
      );
    } else {
      kinoraEscrow.mintERC721(
        _params.playerAddress,
        _params.profileId,
        _params.pubId,
        _params.milestone
      );
    }

    kinoraQuestData.completeMilestone(
      _params.pubId,
      _params.profileId,
      _params.playerProfileId,
      _params.milestone
    );
  }
}
