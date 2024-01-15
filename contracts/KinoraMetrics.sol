// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.19;

import "./KinoraAccessControl.sol";
import "./KinoraLibrary.sol";
import "./KinoraQuestData.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract KinoraMetrics {
  string public symbol;
  string public name;
  KinoraAccessControl public kinoraAccess;
  KinoraQuestData public kinoraQuestData;

  event AddPlayerMetrics(
    uint256 videoPubId,
    uint256 videoProfileId,
    uint256 playerProfileId
  );
  event PlayerEligibleToClaimMilestone(
    uint256 questId,
    uint256 milestone,
    uint256 playerProfileId
  );

  modifier onlyPlayer() {
    uint256 _playerProfileId = kinoraQuestData.getAddressToProfileId(
      msg.sender
    );
    if (kinoraQuestData.getPlayerActiveSince(_playerProfileId) == 0) {
      revert KinoraErrors.PlayerNotEligible();
    }
    _;
  }

  modifier onlyQuestEnvoker(uint256 _questId) {
    if (kinoraQuestData.getQuestEnvoker(_questId) != msg.sender) {
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
    address _kinoraAccessAddress,
    address _kinoraQuestDataAddress
  ) external {
    if (address(kinoraAccess) != address(0)) {
      revert KinoraErrors.AlreadyInitialized();
    }
    name = "KinoraMetrics";
    symbol = "KME";
    kinoraAccess = KinoraAccessControl(_kinoraAccessAddress);
    kinoraQuestData = KinoraQuestData(_kinoraQuestDataAddress);
  }

  function addPlayerMetrics(
    KinoraLibrary.PlayerVideoMetrics memory _metrics
  ) public onlyPlayer {
    uint256 _playerProfileId = kinoraQuestData.getAddressToProfileId(
      msg.sender
    );
    kinoraQuestData.updatePlayerMetrics(_metrics, _playerProfileId);

    emit AddPlayerMetrics(_metrics.pubId, _metrics.profileId, _playerProfileId);
  }

  function playerEligibleToClaimMilestone(
    uint256 _questId,
    uint256 _milestone,
    uint256 _playerProfileId,
    bool _eligibility
  ) public onlyQuestEnvoker(_questId) {
    kinoraQuestData.playerEligibleToClaim(
      _playerProfileId,
      _questId,
      _milestone,
      _eligibility
    );

    emit PlayerEligibleToClaimMilestone(_questId, _milestone, _playerProfileId);
  }

  function setKinoraQuestData(
    address _newQuestDataContract
  ) external onlyMaintainer {
    kinoraQuestData = KinoraQuestData(_newQuestDataContract);
  }

  function setKinoraAccess(address _newAccessContract) external onlyMaintainer {
    kinoraAccess = KinoraAccessControl(_newAccessContract);
  }
}
