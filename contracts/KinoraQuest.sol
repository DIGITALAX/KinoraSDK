// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.19;

import "./KinoraAccessControl.sol";
import "./KinoraEscrow.sol";
import "./KinoraLibrary.sol";
import "./KinoraQuestData.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract KinoraQuest is Initializable {
  string public name;
  string public symbol;
  KinoraAccessControl public accessControl;
  KinoraQuestData public kinoraQuestData;
  KinoraEscrow public escrow;
  address public kinoraOpenAction;

  modifier onlyDeveloperPKP() {
    if (msg.sender != accessControl.getAssignedPKPAddress()) {
      revert KinoraErrors.OnlyPKP();
    }
    _;
  }

  modifier onlyDeveloperPKPOrAdmin() {
    if (
      msg.sender != accessControl.getAssignedPKPAddress() &&
      !accessControl.isAdmin(msg.sender)
    ) {
      revert KinoraErrors.InvalidAddress();
    }
    _;
  }

  modifier onlyOpenAction() {
    if (kinoraOpenAction != msg.sender) {
      revert KinoraErrors.InvalidAddress();
    }
    _;
  }

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

  event NewQuestCreated(
    uint256 profileId,
    uint256 pubId,
    uint256 milestoneCount,
    bytes32 joinHash
  );
  event PlayerCompleteQuestMilestone(
    uint256 pubId,
    uint256 milestone,
    uint256 playerProfileId
  );
  event QuestTerminated(uint256 profileId, uint256 pubId);
  event PlayerJoinQuest(uint256 pubId, uint256 playerProfileId);

  function initialize(
    address _accessControlAddress,
    address _escrowAddress,
    address _kinoraQuestData
  ) public {
    name = "KinoraQuest";
    symbol = "KQU";
    accessControl = KinoraAccessControl(_accessControlAddress);
    escrow = KinoraEscrow(_escrowAddress);
  }

  function instantiateNewQuest(
    KinoraLibrary.Milestone[] memory _milestones,
    bytes32 _joinHash,
    uint256 _maxPlayerCount,
    uint256 _pubId,
    uint256 _profileId
  ) public onlyOpenAction {
    kinoraQuestData.newQuest(
      _milestones,
      _joinHash,
      _maxPlayerCount,
      _pubId,
      _profileId
    );

    emit NewQuestCreated(_profileId, _pubId, _milestones.length, _joinHash);
  }

  function terminateQuest(
    uint256 _pubId
  ) public onlyDeveloperPKPOrAdmin questOpen(_pubId) {
    uint256 _profileId = accessControl.getProfileId();

    kinoraQuestData.updateQuestStatus(_profileId, _pubId);

    emit QuestTerminated(_profileId, _pubId);
  }

  function playerJoinQuest(
    address _playerAddress,
    uint256 _pubId,
    uint256 _playerProfileId
  ) public onlyOpenAction questOpen(_pubId) {
    uint256 _profileId = accessControl.getProfileId();
    kinoraQuestData.joinQuest(
      _playerAddress,
      _pubId,
      _profileId,
      _playerProfileId
    );

    emit PlayerJoinQuest(_pubId, _playerProfileId);
  }

  function playerCompleteMilestone(
    uint256 _pubId,
    uint256 _milestone,
    uint256 _playerProfileId
  ) public onlyOpenAction questOpen(_pubId) {
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

    if (
      _joined &&
      kinoraQuestData.getPlayerMilestonesCompletedPerQuest(
        _playerProfileId,
        _profileId,
        _pubId
      ) <
      _milestone &&
      kinoraQuestData.getPlayerMilestonesCompletedPerQuest(
        _playerProfileId,
        _profileId,
        _pubId
      ) +
        1 ==
      _milestone
    ) {
      if (
        kinoraQuestData.getQuestMilestoneRewardType(
          _profileId,
          _pubId,
          _milestone
        ) == KinoraLibrary.RewardType.ERC20
      ) {
        escrow.withdrawERC20(_playerAddress, _pubId, _milestone);
      } else {
        escrow.mintERC721(_playerAddress, _profileId, _pubId, _milestone);
      }

      kinoraQuestData.completeMilestone(
        _pubId,
        _profileId,
        _playerProfileId,
        _milestone
      );
    } else {
      revert KinoraErrors.PlayerNotEligible();
    }

    emit PlayerCompleteQuestMilestone(_pubId, _milestone, _playerProfileId);
  }
}
