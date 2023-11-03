// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.19;

import "./KinoraAccessControl.sol";
import "./KinoraEscrow.sol";
import "./KinoraLibrary.sol";
import "./KinoraQuestData.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract KinoraMetrics is Initializable {
  // Symbol of the access control contract
  string public symbol;
  // Name of the access control contract
  string public name;
  // Instance of the KinoraAccessControl contract
  KinoraAccessControl public accessControl;
  // Instance of the KinoraQuestData contract
  KinoraQuestData public kinoraQuestData;
  // Lens Hub address
  address public lensHub;

  // Mappings to store the relationship between Livepeer Playback Ids and player metrics
  mapping(address => mapping(string => KinoraLibrary.PlayerLivepeerMetrics))
    private _playerLivepeerMetricsByPlaybackId;

  // Event emitted when a player metrics added.
  event AddPlayerMetrics(
    string playbackId,
    string metricJSON,
    uint256 playerProfileId,
    bool encrypted
  );
  // Event emitted when player verified to claim milestone.
  event PlayerEligibleToClaimMilestone(
    uint256 pubId,
    uint256 milestone,
    uint256 playerProfileId
  );

  modifier onlyQuestEnvokerPKP() {
    if (msg.sender != accessControl.getAssignedPKPAddress()) {
      revert KinoraErrors.OnlyPKP();
    }
    _;
  }

  /**
   * @dev Initializes the contract with initial values
   * @param _accessControlAddress Address of the Kinora Access Control
   * @param _kinoraQuestDataAddress Address of the Kinora Quest Data
   * @param _lensHub Address of the Lens Hub
   */
  function initialize(
    address _accessControlAddress,
    address _kinoraQuestDataAddress,
    address _lensHub
  ) public {
    name = "KinoraMetrics";
    symbol = "KME";
    accessControl = KinoraAccessControl(_accessControlAddress);
    kinoraQuestData = KinoraQuestData(_kinoraQuestDataAddress);
    lensHub = _lensHub;
  }

  /**  @dev Function to append player metrics, bridged through a designated access control modifier.
   @param _playbackId A unique identifier for playback sessions.
   @param _json JSON string containing metric data.
   @param _playerAddress Address of the Player associated with their Lens Profile.
   @param _playerProfileId Lens Profile Id.
   @param _pubId Lens Pub Id.
   @param _encrypted Boolean flag indicating encryption status of the metric data. */
  function addPlayerMetrics(
    string memory _playbackId,
    string memory _json,
    address _playerAddress,
    uint256 _playerProfileId,
    uint256 _pubId,
    bool _encrypted
  ) public onlyQuestEnvokerPKP {
    if (IERC721(lensHub).ownerOf(_playerProfileId) != _playerAddress) {
      revert KinoraErrors.InvalidAddress();
    }

    uint256 _profileId = accessControl.getProfileId();

    kinoraQuestData.updatePlayerMetrics(
      _playbackId,
      _json,
      _playerProfileId,
      _profileId,
      _pubId,
      _encrypted
    );

    emit AddPlayerMetrics(_playbackId, _json, _playerProfileId, _encrypted);
  }

  /**  @dev Function to update player's eligibility to claim milestones, access-controlled through custom modifier.
   @param _pubId Unique identifier correlating to some public entity.
   @param _milestone Numeric representation of milestone.
   @param _playerProfileId Lens Profile Id.
   @param _eligibility Boolean flag indicating eligibility status.
  */
  function playerEligibleToClaimMilestone(
    uint256 _pubId,
    uint256 _milestone,
    uint256 _playerProfileId,
    bool _eligibility
  ) public onlyQuestEnvokerPKP {
    uint256 _profileId = accessControl.getProfileId();

    kinoraQuestData.updatePlayerMilestoneEligibility(
      _playerProfileId,
      _profileId,
      _pubId,
      _milestone,
      _eligibility
    );

    emit PlayerEligibleToClaimMilestone(_pubId, _milestone, _playerProfileId);
  }
}
