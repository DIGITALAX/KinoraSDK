// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.19;

import "./KinoraAccessControl.sol";
import "./KinoraEscrow.sol";
import "./KinoraLibrary.sol";
import "./KinoraQuestData.sol";

contract KinoraMetrics {
  // Symbol of the access control contract
  string public symbol;
  // Name of the access control contract
  string public name;
  // Instance of the KinoraAccessControl contract
  KinoraAccessControl public kinoraAccess;
  // Instance of the KinoraQuestData contract
  KinoraQuestData public kinoraQuestData;

  // Event emitted when a player metrics added.
  event AddPlayerMetrics(
    uint256 videoPubId,
    uint256 videoProfileId,
    uint256 playerProfileId
  );
  // Event emitted when player verified to claim milestone.
  event PlayerEligibleToClaimMilestone(
    uint256 questId,
    uint256 milestone,
    uint256 playerProfileId
  );

  // Ensures the player exists.
  modifier onlyPlayer(uint256 _playerProfileId) {
    if (kinoraQuestData.getPlayerActiveSince(_playerProfileId) == 0) {
      KinoraErrors.PlayerNotEligible();
    }
    _;
  }

  // Only the Quest Envoker can call.
  modifier onlyQuestEnvoker() {
    if (kinoraQuestData.getQuestEnvokerAddress() != msg.sender) {
      KinoraErrors.InvalidAddress();
    }
    _;
  }

  // Ensures the caller is the maintainer.
  modifier onlyMaintainer() {
    if (!kinoraAccess.isAdmin(msg.sender)) {
      revert KinoraErrors.InvalidAddress();
    }
    _;
  }

  /**
   * @dev Constructor
   * @param _kinoraAccessAddress Address of the Kinora Access Control
   * @param _kinoraQuestDataAddress Address of the Kinora Quest Data
   */
  constructor(
    address _kinoraAccessAddress,
    address _kinoraQuestDataAddress
  ) public {
    name = "KinoraMetrics";
    symbol = "KME";
    kinoraAccess = KinoraAccessControl(_kinoraAccessAddress);
    kinoraQuestData = KinoraQuestData(_kinoraQuestDataAddress);
  }

  /**  @dev Function to append player metrics, bridged through a designated access control modifier.
   @param _playerProfileId Lens Profile Id.
   @param _videoProfileId Video Profile Id.
   @param _videoPubId Video Pub Id.
   */
  function addPlayerMetrics(
    KinoraLibrary.PlayerVideoMetrics memory _metrics,
    uint256 _playerProfileId,
    uint256 _videoProfileId,
    uint256 _videoPubId
  ) public onlyPlayer(_playerProfileId) {
    kinoraQuestData.updatePlayerMetrics(
      _metrics,
      _videoPubId,
      _videoProfileId,
      _playerProfileId
    );

    emit AddPlayerMetrics(_videoPubId, _videoProfileId, _playerProfileId);
  }

  /** @dev Function to update player's eligibility to claim milestones, access-controlled through custom modifier.
   @param _questId The Quest Id.
   @param _milestone Numeric representation of milestone.
   @param _playerProfileId Lens Profile Id.
   @param _eligibility Boolean flag indicating eligibility status.
  */
  function playerEligibleToClaimMilestone(
    uint256 _questId,
    uint256 _milestone,
    uint256 _playerProfileId,
    bool _eligibility
  ) public onlyQuestEnvoker {
    kinoraQuestData.updatePlayerMilestoneEligibility(
      _playerProfileId,
      _questId,
      _milestone,
      _eligibility
    );

    emit PlayerEligibleToClaimMilestone(_questId, _milestone, _playerProfileId);
  }

  /**
   * @dev Sets a new valid Kinora Quest Data contract.
   * @param _newQuestDataContract The address of the new quest data contract.
   */
  function setKinoraQuestData(
    address _newQuestDataContract
  ) external onlyMaintainer {
    kinoraQuestData = KinoraQuestData(_newQuestDataContract);
  }

  /**
   * @dev Sets a new valid Kinora Access Control contract.
   * @param _newAccessContract The address of the new access contract.
   */
  function setKinoraAccess(address _newAccessContract) external onlyMaintainer {
    kinoraAccess = KinoraAccessControl(_newAccessContract);
  }
}
