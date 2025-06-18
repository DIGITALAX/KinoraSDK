// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.26;

import "./KinoraAccessControl.sol";
import "./KinoraLibrary.sol";
import "./KinoraQuestData.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./Lens/Ownable.sol";

contract KinoraMetrics is Initializable {
  KinoraAccessControl public kinoraAccess;
  KinoraQuestData public kinoraQuestData;

  event AddPlayerMetrics(address playerProfile, uint256 videoPostId);
  event PlayerEligibleToClaimMilestone(
    address playerProfile,
    uint256 questId,
    uint256 milestone
  );

  modifier onlyPlayer() {
    address _playerProfile = kinoraQuestData.getAddressToProfile(msg.sender);
    if (kinoraQuestData.getPlayerActiveSince(_playerProfile) == 0) {
      revert KinoraErrors.PlayerNotEligible();
    }
    _;
  }

  modifier onlyQuestEnvoker(uint256 questId) {
    if (kinoraQuestData.getQuestEnvoker(questId) != msg.sender) {
      revert KinoraErrors.InvalidAddress();
    }
    _;
  }

  modifier onlyMaintainer() {
    if (!kinoraAccess.isEnvoker(msg.sender)) {
      revert KinoraErrors.InvalidAddress();
    }
    _;
  }

  function initialize(
    address kinoraAccessAddress,
    address kinoraQuestDataAddress
  ) public initializer {
    if (address(kinoraAccess) != address(0)) {
      revert KinoraErrors.AlreadyInitialized();
    }

    kinoraAccess = KinoraAccessControl(kinoraAccessAddress);
    kinoraQuestData = KinoraQuestData(kinoraQuestDataAddress);
  }

  function addPlayerMetrics(
    KinoraLibrary.PlayerVideoMetrics memory metrics
  ) public onlyPlayer {
    address _playerProfile = kinoraQuestData.getAddressToProfile(msg.sender);
    kinoraQuestData.updatePlayerMetrics(metrics, _playerProfile);

    emit AddPlayerMetrics(_playerProfile, metrics.postId);
  }

  function playerEligibleToClaimMilestone(
    address playerProfile,
    uint256 questId,
    uint256 milestone,
    bool eligibility
  ) public onlyQuestEnvoker(questId) {
    kinoraQuestData.playerEligibleToClaim(
      playerProfile,
      questId,
      milestone,
      eligibility
    );

    emit PlayerEligibleToClaimMilestone(playerProfile, questId, milestone);
  }

  function setKinoraQuestData(
    address newQuestDataContract
  ) external onlyMaintainer {
    kinoraQuestData = KinoraQuestData(newQuestDataContract);
  }

  function setKinoraAccess(address newAccessContract) external onlyMaintainer {
    kinoraAccess = KinoraAccessControl(newAccessContract);
  }

  function symbol() public pure returns (string memory) {
    return "KME";
  }

  function name() public pure returns (string memory) {
    return "KinoraMetrics";
  }
}
