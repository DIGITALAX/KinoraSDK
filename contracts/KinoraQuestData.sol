// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.19;

import "./KinoraLibrary.sol";
import "./KinoraErrors.sol";
import "./KinoraQuest.sol";

contract KinoraQuestData {
  string public name;
  string public symbol;
  address public kinoraOpenAction;
  address public kinoraQuest;
  uint256 private _questCount;
  uint256 private _playerCount;

  // Mapping to store the data of all players against their Profile Id.
  mapping(uint256 => KinoraLibrary.Player) private _allPlayers;
  // Nested mapping to store the quest data against the Lens Profile id and Lens Pub id.
  mapping(uint256 => mapping(uint256 => KinoraLibrary.Quest))
    private _allQuests;
  // Nested mapping to store the address of valid quest contracts against the Lens Profile id and Lens Pub id.
  mapping(uint256 => mapping(uint256 => address)) private _validQuestContract;
  // Nested mapping to store the address of valid escrow contracts against the Lens Profile id and Lens Pub id.
  mapping(uint256 => mapping(uint256 => address)) private _validEscrowContract;
  // Nested mapping to store the address of valid metrics contracts against the Lens Profile id and Lens Pub id.
  mapping(uint256 => address[]) private _validMetricsContract;

  // Event emitted when a new quest is instantiated.
  event QuestInstantiated(
    uint256 profileId,
    uint256 pubId,
    uint256 milestoneCount
  );
  // Emitted when a player joins a quest.
  event PlayerJoinedQuest(
    uint256 profileId,
    uint256 pubId,
    uint256 playerProfileId
  );
  // Emitted when player metrics are updated.
  event PlayerMetricsUpdated(
    uint256 profileId,
    uint256 playerProfileId,
    string playbackId,
    string metricsJSON,
    bool encrypted
  );
  // Emitted when the status of a quest is updated.
  event QuestStatusUpdated(
    uint256 profileId,
    uint256 pubId,
    KinoraLibrary.Status status
  );
  // Emitted when a quest contract is validated.
  event QuestContractValidated(
    uint256 profileId,
    uint256 pubId,
    address questContract
  );
  // Emitted when an escrow contract is validated.
  event EscrowContractValidated(
    uint256 profileId,
    uint256 pubId,
    address escrowContract
  );
  // Emitted when a metrics contract is validated.
  event MetricsContractValidated(uint256 profileId, address metricsContract);
  // Emitted when the a milestone is completed by a player.
  event MilestoneCompleted(
    uint256 profileId,
    uint256 pubId,
    uint256 playerProfileId,
    uint256 milestone
  );
  // Emitted when the milestone claim eligibility of a player is updated.
  event PlayerMilestoneEligibilityUpdated(
    uint256 playerProfileId,
    uint256 profileId,
    uint256 pubId,
    uint256 milestone,
    bool eligibility
  );

  // Ensures the caller is a valid metrics contract for the specified profile and quest.
  modifier onlyKinoraQuest() {
    if (kinoraQuest != msg.sender) {
      revert KinoraErrors.InvalidContract();
    }
    _;
  }

  // Ensures the caller is either a valid metrics or escrow contract for the specified profile and quest.
  modifier onlyValidQuestOrEscrowContract(uint256 _profileId, uint256 _pubId) {
    if (
      _validQuestContract[_profileId][_pubId] != msg.sender &&
      _validEscrowContract[_profileId][_pubId] != msg.sender
    ) {
      revert KinoraErrors.InvalidContract();
    }
    _;
  }

  // Ensures the caller is either the factory or open action contract.
  modifier onlyActionOrFactory() {
    if (msg.sender != factoryContract && msg.sender != kinoraOpenAction) {
      revert KinoraErrors.InvalidContract();
    }
    _;
  }

  // Ensures the caller is either a valid metrics contract for the specified profile and quest.
  modifier onlyValidMetricsContract(uint256 _profileId) {
    address[] memory _addresses = _validMetricsContract[_profileId];
    bool _valid = false;

    for (uint256 i = 0; i < _addresses.length; i++) {
      if (_addresses[i] == msg.sender) {
        _valid = true;
        return;
      }
    }

    if (!_valid) {
      revert KinoraErrors.InvalidContract();
    }
    _;
  }

  /**
   * @dev Constructor function to initialize contract with a factory address.
   * @param _factoryAddress Address of the factory contract.
   */
  constructor(address _factoryAddress) {
    name = "KinoraQuestData";
    symbol = "KQD";
    _questCount = 0;
    _playerCount = 0;
    factoryContract = _factoryAddress;
    factoryMaintainer = msg.sender;
  }

  /**
   * @dev Function to create a new quest.
   * @param _params NewQuestParams struct from KinoraLibrary contract
   */
  function newQuest(
    KinoraLibrary.NewQuestParams memory _params
  ) external onlyKinoraQuest {
    uint256[] memory _emptyPlayers;

    _allQuests[_profileId][_pubId].pubId = _pubId;
    _allQuests[_profileId][_pubId].profileId = _profileId;
    _allQuests[_profileId][_pubId].players = _emptyPlayers;
    _allQuests[_profileId][_pubId].milestoneCount = _milestones.length;
    _allQuests[_profileId][_pubId].status = KinoraLibrary.Status.Open;
    _allQuests[_profileId][_pubId].maxPlayerCount = _maxPlayerCount;
    _allQuests[_profileId][_pubId].gated = _gated;

    for (uint256 i = 0; i < _milestones.length; i++) {
      KinoraLibrary.Milestone memory newMilestone;
      newMilestone.reward = _milestones[i].reward;
      newMilestone.conditionHash = _milestones[i].conditionHash;
      newMilestone.completionCriteria = _milestones[i].completionCriteria;
      newMilestone.milestone = i + 1;
      newMilestone.gated = _milestones[i].gated;

      _allQuests[_profileId][_pubId].milestones.push(newMilestone);
    }

    _questCount++;

    emit QuestInstantiated(_profileId, _pubId, _milestones.length);
  }

  /**
   * @dev Allows a player to join a quest.
   * @param _playerAddress The address of the player joining the quest.
   * @param _pubId The Lens Pub Id of the quest.
   * @param _profileId The Lens Profile Id of the profile associated with the quest.
   * @param _playerProfileId The Lens Profile Id of the player's profile.
   */
  function joinQuest(
    address _playerAddress,
    uint256 _pubId,
    uint256 _profileId,
    uint256 _playerProfileId
  ) external onlyValidQuestContract(_profileId, _pubId) {
    if (
      _allQuests[_profileId][_pubId].players.length >=
      _allQuests[_profileId][_pubId].maxPlayerCount
    ) {
      revert KinoraErrors.MaxPlayerCountReached();
    }

    if (_allPlayers[_playerProfileId].activeSince == 0) {
      _playerCount++;
      _allPlayers[_playerProfileId].playerAddress = _playerAddress;
      _allPlayers[_playerProfileId].activeSince = block.timestamp;
    }

    _allPlayers[_playerProfileId].questsJoined[_profileId].push(_pubId);
    _allPlayers[_playerProfileId].joinedQuest[_profileId][_pubId] = true;
    _allQuests[_profileId][_pubId].players.push(_playerProfileId);

    emit PlayerJoinedQuest(_profileId, _pubId, _playerProfileId);
  }

  /**
   * @dev Records the completion of a milestone by a player.
   * @param _pubId The Lens Pub Id of the quest.
   * @param _profileId The Lens Profile Id of the profile associated with the quest.
   * @param _playerProfileId The Lens Profile Id of the player's profile.
   * @param _milestone The milestone number that was completed.
   */
  function completeMilestone(
    uint256 _pubId,
    uint256 _profileId,
    uint256 _playerProfileId,
    uint256 _milestone
  ) external onlyValidQuestContract(_profileId, _pubId) {
    _allPlayers[_playerProfileId].milestonesCompletedPerQuest[_profileId][
        _pubId
      ] = _milestone;

    emit MilestoneCompleted(_profileId, _pubId, _playerProfileId, _milestone);
  }

  /**
   * @dev Sets a new valid metrics contract.
   * @param _profileId The Lens Profile Id of the profile associated with the quest.
   * @param _newMetricsContract The address of the new metrics contract.
   */
  function setValidMetricsContract(
    uint256 _profileId,
    address _newMetricsContract
  ) external onlyActionOrFactory {
    _validMetricsContract[_profileId].push(_newMetricsContract);

    emit MetricsContractValidated(_profileId, _newMetricsContract);
  }

  /**
   * @dev Sets a new valid quest contract for a specified quest.
   * @param _profileId The Lens Profile Id of the profile associated with the quest.
   * @param _pubId The Lens Pub Id of the quest.
   * @param _newQuestContract The address of the new quest contract.
   */
  function setValidQuestContract(
    uint256 _profileId,
    uint256 _pubId,
    address _newQuestContract
  ) external onlyActionOrFactory {
    _validQuestContract[_profileId][_pubId] = _newQuestContract;

    emit QuestContractValidated(_profileId, _pubId, _newQuestContract);
  }

  /**
   * @dev Sets a new valid escrow contract for a specified quest.
   * @param _profileId The Lens Profile Id of the profile associated with the quest.
   * @param _pubId The Lens Pub Id of the quest.
   * @param _newEscrowContract The address of the new escrow contract.
   */
  function setValidEscrowContract(
    uint256 _profileId,
    uint256 _pubId,
    address _newEscrowContract
  ) external onlyActionOrFactory {
    _validEscrowContract[_profileId][_pubId] = _newEscrowContract;

    emit EscrowContractValidated(_profileId, _pubId, _newEscrowContract);
  }

  /**
   * @dev Updates the eligibility of a player for a milestone reward.
   * @param _playerProfileId The Lens Profile Id of the player's profile.
   * @param _profileId The Lens Profile Id of the profile associated with the quest.
   * @param _pubId The Lens Pub Id of the quest.
   * @param _milestone The milestone number.
   * @param _eligibility The new eligibility status.
   */
  function updatePlayerMilestoneEligibility(
    uint256 _playerProfileId,
    uint256 _profileId,
    uint256 _pubId,
    uint256 _milestone,
    bool _eligibility
  ) external onlyValidMetricsContract(_profileId) {
    _allPlayers[_playerProfileId].eligibleToClaimMilestone[_profileId][_pubId][
        _milestone
      ] = _eligibility;

    emit PlayerMilestoneEligibilityUpdated(
      _playerProfileId,
      _profileId,
      _pubId,
      _milestone,
      _eligibility
    );
  }

  /**
   * @dev Updates the status of a quest.
   * @param _profileId The Lens Profile Id of the profile associated with the quest.
   * @param _pubId The Lens Pub Id of the quest.
   */
  function updateQuestStatus(
    uint256 _profileId,
    uint256 _pubId
  ) external onlyValidQuestOrEscrowContract(_profileId, _pubId) {
    _allQuests[_profileId][_pubId].status = KinoraLibrary.Status.Closed;

    emit QuestStatusUpdated(
      _profileId,
      _pubId,
      _allQuests[_profileId][_pubId].status
    );
  }

  /**
   * @dev Updates the metrics of a player for a particular quest.
   * @param _playbackId The playback identifier of the metrics.
   * @param _json The JSON hash of the metrics.
   * @param _playerProfileId The Lens Profile Id of the player.
   * @param _profileId The Lens Profile Id of the quest.
   * @param _encrypted Boolean indicating whether the metrics are encrypted.
   */
  function updatePlayerMetrics(
    string memory _playbackId,
    string memory _json,
    uint256 _playerProfileId,
    uint256 _profileId,
    bool _encrypted
  ) external onlyValidMetricsContract(_profileId) {
    if (_allPlayers[_playerProfileId].activeSince == 0) {
      revert KinoraErrors.PlayerNotEligible();
    }
    _allPlayers[_playerProfileId].playbackIdMetrics[_playbackId][
        _profileId
      ] = KinoraLibrary.PlayerLivepeerMetrics({
      playbackId: _playbackId,
      profileId: _profileId,
      metricJSONHash: _json,
      encrypted: _encrypted
    });

    emit PlayerMetricsUpdated(
      _profileId,
      _playerProfileId,
      _playbackId,
      _json,
      _encrypted
    );
  }

  /**
   * @dev Sets the address of the Kinora Open Action.
   * @param _kinoraOpenActionAddress The address to be set.
   */
  function setKinoraOpenAction(address _kinoraOpenActionAddress) public {
    if (msg.sender != factoryMaintainer) {
      revert KinoraErrors.OnlyAdmin();
    }
    kinoraOpenAction = _kinoraOpenActionAddress;
  }

  /**
   * @dev Gets the total count of quests.
   * @return The total count of quests.
   */
  function getTotalQuestCount() public view returns (uint256) {
    return _questCount;
  }

  /**
   * @dev Gets the total count of players.
   * @return The total count of players.
   */
  function getTotalPlayerCount() public view returns (uint256) {
    return _playerCount;
  }

  /**
   * @dev Retrieves the milestones completed by a player in a quest.
   * @param _playerProfileId Lens Profile Id for the player.
   * @param _questProfileId Lens Profile Id for the quest profile.
   * @param _pubId Lens Pub Id for the quest.
   * @return Number of milestones completed by the player in the quest.
   */
  function getPlayerMilestonesCompletedPerQuest(
    uint256 _playerProfileId,
    uint256 _questProfileId,
    uint256 _pubId
  ) public view returns (uint256) {
    return
      _allPlayers[_playerProfileId].milestonesCompletedPerQuest[
        _questProfileId
      ][_pubId];
  }

  /**
   * @dev Checks if a player is eligible to claim a milestone in a quest.
   * @param _playerProfileId Lens Profile Id for the player.
   * @param _questProfileId Lens Profile Id for the quest profile.
   * @param _pubId Lens Pub Id for the quest.
   * @param _milestone Milestone number in the quest.
   * @return True if the player is eligible to claim the milestone, false otherwise.
   */
  function getPlayerEligibleToClaimMilestone(
    uint256 _playerProfileId,
    uint256 _questProfileId,
    uint256 _pubId,
    uint256 _milestone
  ) public view returns (bool) {
    return
      _allPlayers[_playerProfileId].eligibleToClaimMilestone[_questProfileId][
        _pubId
      ][_milestone];
  }

  /**
   * @dev Retrieves the blocktimestamp the player was added.
   * @param _playerProfileId Lens Profile Id for the player profile.
   * @return The blocktimestamp that the player joined.
   */
  function getPlayerActiveSince(
    uint256 _playerProfileId
  ) public view returns (uint256) {
    return _allPlayers[_playerProfileId].activeSince;
  }

  /**
   * @dev Determines whether the metrics associated with a playback ID are encrypted.
   * @param _playbackId The playback ID related to the metrics.
   * @param _playerProfileId Lens Profile Id for the player profile.
   * @param _profileId Lens Profile Id linked to the metrics.
   * @return A boolean value indicating whether the metrics are encrypted.
   */
  function getPlayerPlaybackIdMetricsEncrypted(
    string memory _playbackId,
    uint256 _playerProfileId,
    uint256 _profileId
  ) public view returns (bool) {
    return
      _allPlayers[_playerProfileId]
      .playbackIdMetrics[_playbackId][_profileId].encrypted;
  }

  /**
   * @dev Retrieves the hash of metrics associated with a playback ID.
   * @param _playbackId The playback ID related to the metrics.
   * @param _playerProfileId Lens Profile Id for the player profile.
   * @param _profileId Lens Profile Id linked to the metrics.
   * @return The hash of metrics associated with the specified playback ID.
   */
  function getPlayerPlaybackIdMetricsHash(
    string memory _playbackId,
    uint256 _playerProfileId,
    uint256 _profileId
  ) public view returns (string memory) {
    return
      _allPlayers[_playerProfileId]
      .playbackIdMetrics[_playbackId][_profileId].metricJSONHash;
  }

  /**
   * @dev Retrieves the address of a player.
   * @param _playerProfileId Lens Profile Id for the player profile.
   * @return The address associated with the specified player.
   */
  function getPlayerAddress(
    uint256 _playerProfileId
  ) public view returns (address) {
    return _allPlayers[_playerProfileId].playerAddress;
  }

  /**
   * @dev Retrieves the quests joined by a player.
   * @param _playerProfileId Lens Profile Id for the player profile.
   * @param _questProfileId Lens Profile Id for the quest profile.
   * @return An array of quest identifiers the player has joined.
   */
  function getPlayerQuestsJoined(
    uint256 _playerProfileId,
    uint256 _questProfileId
  ) public view returns (uint256[] memory) {
    return _allPlayers[_playerProfileId].questsJoined[_questProfileId];
  }

  /**
   * @dev Checks if a player has joined a specific quest.
   * @param _playerProfileId Lens Profile Id for the player profile.
   * @param _questProfileId Lens Profile Id for the quest profile.
   * @param _questPubId Lens Pub Id for the quest.
   * @return True if the player has joined the quest, false otherwise.
   */
  function getPlayerHasJoinedQuest(
    uint256 _playerProfileId,
    uint256 _questProfileId,
    uint256 _questPubId
  ) public view returns (bool) {
    return
      _allPlayers[_playerProfileId].joinedQuest[_questProfileId][_questPubId];
  }

  /**
   * @dev Retrieves the players participating in a specific quest.
   * @param _questProfileId Lens Profile Id for the quest profile.
   * @param _questPubId Lens Pub Id for the quest.
   * @return An array of player identifiers participating in the quest.
   */
  function getQuestPlayers(
    uint256 _questProfileId,
    uint256 _questPubId
  ) public view returns (uint256[] memory) {
    return _allQuests[_questProfileId][_questPubId].players;
  }

  /**
   * @dev Retrieves the maximum player count for a specific quest.
   * @param _questProfileId Lens Profile Id for the quest profile.
   * @param _questPubId Lens Pub Id for the quest.
   * @return The maximum number of players allowed in the quest.
   */
  function getQuestMaxPlayerCount(
    uint256 _questProfileId,
    uint256 _questPubId
  ) public view returns (uint256) {
    return _allQuests[_questProfileId][_questPubId].maxPlayerCount;
  }

  /**
   * @dev Retrieves the status of a specific quest.
   * @param _questProfileId Lens Profile Id for the quest profile.
   * @param _questPubId Lens Pub Id for the quest.
   * @return The current status of the quest.
   */
  function getQuestStatus(
    uint256 _questProfileId,
    uint256 _questPubId
  ) public view returns (KinoraLibrary.Status) {
    return _allQuests[_questProfileId][_questPubId].status;
  }

  /**
   * @dev Retrieves the public identifier of a specific quest.
   * @param _questProfileId Lens Profile Id for the quest profile.
   * @param _questPubId Lens Pub Id for the quest.
   * @return The public identifier of the quest.
   */
  function getQuestPubId(
    uint256 _questProfileId,
    uint256 _questPubId
  ) public view returns (uint256) {
    return _allQuests[_questProfileId][_questPubId].pubId;
  }

  /**
   * @dev Retrieves the profile identifier of a specific quest.
   * @param _questProfileId Lens Profile Id for the quest profile.
   * @param _questPubId Lens Pub Id for the quest.
   * @return The profile identifier of the quest.
   */
  function getQuestProfileId(
    uint256 _questProfileId,
    uint256 _questPubId
  ) public view returns (uint256) {
    return _allQuests[_questProfileId][_questPubId].profileId;
  }

  /**
   * @dev Retrieves erc721 contract address gated requirements for the Quest.
   * @param _questProfileId Lens Profile Id for the quest profile.
   * @param _questPubId Lens Pub Id for the quest.
   * @return All erc721 contracts associated with the quest for token gating.
   */
  function getQuestGatedERC721Addresses(
    uint256 _questProfileId,
    uint256 _questPubId
  ) public view returns (address[] memory) {
    return _allQuests[_questProfileId][_questPubId].gated.erc721Addresses;
  }

  /**
   * @dev Retrieves erc721 token Id gated requirements for the Quest.
   * @param _questProfileId Lens Profile Id for the quest profile.
   * @param _questPubId Lens Pub Id for the quest.
   * @return All erc721 tokenIds associated with the quest for token gating.
   */
  function getQuestGatedERC721Tokens(
    uint256 _questProfileId,
    uint256 _questPubId
  ) public view returns (uint256[][] memory) {
    return _allQuests[_questProfileId][_questPubId].gated.erc721TokenIds;
  }

  /**
   * @dev Retrieves whether all gated conditions must be matched or only oneOf.
   * @param _questProfileId Lens Profile Id for the quest profile.
   * @param _questPubId Lens Pub Id for the quest.
   * @return Boolean for oneOf or All.
   */
  function getQuestGatedOneOf(
    uint256 _questProfileId,
    uint256 _questPubId
  ) public view returns (bool) {
    return _allQuests[_questProfileId][_questPubId].gated.oneOf;
  }

  /**
   * @dev Retrieves erc20 contract address gated requirements for the Quest.
   * @param _questProfileId Lens Profile Id for the quest profile.
   * @param _questPubId Lens Pub Id for the quest.
   * @return All erc20 contracts associated with the quest for token gating.
   */
  function getQuestGatedERC20Addresses(
    uint256 _questProfileId,
    uint256 _questPubId
  ) public view returns (address[] memory) {
    return _allQuests[_questProfileId][_questPubId].gated.erc20Addresses;
  }

  /**
   * @dev Retrieves erc20 token thresholds gated requirements for the Quest.
   * @param _questProfileId Lens Profile Id for the quest profile.
   * @param _questPubId Lens Pub Id for the quest.
   * @return All erc20 token thresholds associated with the quest for token gating.
   */
  function getQuestGatedERC20Thresholds(
    uint256 _questProfileId,
    uint256 _questPubId
  ) public view returns (uint256[] memory) {
    return _allQuests[_questProfileId][_questPubId].gated.erc20Thresholds;
  }

  /**
   * @dev Retrieves the milestone count of a specific quest.
   * @param _questProfileId Lens Profile Id for the quest profile.
   * @param _questPubId Lens Pub Id for the quest.
   * @return The count of milestones in the quest.
   */
  function getQuestMilestoneCount(
    uint256 _questProfileId,
    uint256 _questPubId
  ) public view returns (uint256) {
    return _allQuests[_questProfileId][_questPubId].milestoneCount;
  }

  /**
   * @dev Retrieves erc721 contract address gated requirements for the Quest Milestone.
   * @param _questProfileId Lens Profile Id for the quest profile.
   * @param _questPubId Lens Pub Id for the quest.
   * @param _milestone Milestone number in the quest.
   * @return All erc721 contracts associated with the milestone for token gating.
   */
  function getMilestoneGatedERC721Addresses(
    uint256 _questProfileId,
    uint256 _questPubId,
    uint256 _milestone
  ) public view returns (address[] memory) {
    return
      _allQuests[_questProfileId][_questPubId]
        .milestones[_milestone]
        .gated
        .erc721Addresses;
  }

  /**
   * @dev Retrieves erc721 token Id gated requirements for the Quest Milestone.
   * @param _questProfileId Lens Profile Id for the quest profile.
   * @param _questPubId Lens Pub Id for the quest.
   * @param _milestone Milestone number in the quest.
   * @return All erc721 tokenIds associated with the milestone for token gating.
   */
  function getMilestoneGatedERC721Tokens(
    uint256 _questProfileId,
    uint256 _questPubId,
    uint256 _milestone
  ) public view returns (uint256[][] memory) {
    return
      _allQuests[_questProfileId][_questPubId]
        .milestones[_milestone]
        .gated
        .erc721TokenIds;
  }

  /**
   * @dev Retrieves whether all gated conditions must be matched or only oneOf.
   * @param _questProfileId Lens Profile Id for the quest profile.
   * @param _questPubId Lens Pub Id for the quest.
   * @param _milestone Milestone number in the quest.
   * @return Boolean for oneOf or All.
   */
  function getMilestoneGatedOneOf(
    uint256 _questProfileId,
    uint256 _questPubId,
    uint256 _milestone
  ) public view returns (bool) {
    return
      _allQuests[_questProfileId][_questPubId]
        .milestones[_milestone]
        .gated
        .oneOf;
  }

  /**
   * @dev Retrieves erc20 contract address gated requirements for the Quest Milestone.
   * @param _questProfileId Lens Profile Id for the quest profile.
   * @param _questPubId Lens Pub Id for the quest.
   * @param _milestone Milestone number in the quest.
   * @return All erc20 contracts associated with the milestone for token gating.
   */
  function getMilestoneGatedERC20Addresses(
    uint256 _questProfileId,
    uint256 _questPubId,
    uint256 _milestone
  ) public view returns (address[] memory) {
    return
      _allQuests[_questProfileId][_questPubId]
        .milestones[_milestone]
        .gated
        .erc20Addresses;
  }

  /**
   * @dev Retrieves erc20 token thresholds gated requirements for the Quest Milestone.
   * @param _questProfileId Lens Profile Id for the quest profile.
   * @param _questPubId Lens Pub Id for the quest.
   * @param _milestone Milestone number in the quest.
   * @return All erc20 token thresholds associated with the milestone for token gating.
   */
  function getMilestoneGatedERC20Thresholds(
    uint256 _questProfileId,
    uint256 _questPubId,
    uint256 _milestone
  ) public view returns (uint256[] memory) {
    return
      _allQuests[_questProfileId][_questPubId]
        .milestones[_milestone]
        .gated
        .erc20Thresholds;
  }

  /**
   * @dev Retrieves the completion condition hash of a specific milestone in a quest.
   * @param _questProfileId Lens Profile Id for the quest profile.
   * @param _questPubId Lens Pub Id for the quest.
   * @param _milestone Milestone number in the quest.
   * @return Completion condition hash of the specified milestone.
   */
  function getQuestMilestoneCompletionCriteria(
    uint256 _questProfileId,
    uint256 _questPubId,
    uint256 _milestone
  ) public view returns (string memory) {
    return
      _allQuests[_questProfileId][_questPubId]
        .milestones[_milestone - 1]
        .completionCriteria;
  }

  /**
   * @dev Retrieves the condition hash of a specific milestone in a quest.
   * @param _questProfileId Lens Profile Id for the quest profile.
   * @param _questPubId Lens Pub Id for the quest.
   * @param _milestone Milestone number in the quest.
   * @return Condition hash of the specified milestone.
   */
  function getQuestMilestoneConditionHash(
    uint256 _questProfileId,
    uint256 _questPubId,
    uint256 _milestone
  ) public view returns (bytes32) {
    return
      _allQuests[_questProfileId][_questPubId]
        .milestones[_milestone - 1]
        .conditionHash;
  }

  /**
   * @dev Retrieves the reward type of a specific milestone in a quest.
   * @param _questProfileId Lens Profile Id for the quest profile.
   * @param _questPubId Lens Pub Id for the quest.
   * @param _milestone Milestone number in the quest.
   * @return Reward type of the specified milestone.
   */
  function getQuestMilestoneRewardType(
    uint256 _questProfileId,
    uint256 _questPubId,
    uint256 _milestone
  ) public view returns (KinoraLibrary.RewardType) {
    return
      _allQuests[_questProfileId][_questPubId]
        .milestones[_milestone - 1]
        .reward
        .rewardType;
  }

  /**
   * @dev Retrieves the token address associated with the reward for a specific milestone in a quest.
   * @param _questProfileId Lens Profile Id for the quest profile.
   * @param _questPubId Lens Pub Id for the quest.
   * @param _milestone Milestone number in the quest.
   * @return Token address associated with the reward for the specified milestone.
   */
  function getQuestMilestoneRewardTokenAddress(
    uint256 _questProfileId,
    uint256 _questPubId,
    uint256 _milestone
  ) public view returns (address) {
    return
      _allQuests[_questProfileId][_questPubId]
        .milestones[_milestone - 1]
        .reward
        .tokenAddress;
  }

  /**
   * @dev Retrieves the token amount associated with the reward for a specific milestone in a quest.
   * @param _questProfileId Lens Profile Id for the quest profile.
   * @param _questPubId Lens Pub Id for the quest.
   * @param _milestone Milestone number in the quest.
   * @return Token amount associated with the reward for the specified milestone.
   */
  function getQuestMilestoneRewardTokenAmount(
    uint256 _questProfileId,
    uint256 _questPubId,
    uint256 _milestone
  ) public view returns (uint256) {
    return
      _allQuests[_questProfileId][_questPubId]
        .milestones[_milestone - 1]
        .reward
        .amount;
  }

  /**
   * @dev Retrieves the URI associated with the reward for a specific milestone in a quest.
   * @param _questProfileId Lens Profile Id for the quest profile.
   * @param _questPubId Lens Pub Id for the quest.
   * @param _milestone Milestone number in the quest.
   * @return URI associated with the reward for the specified milestone.
   */
  function getQuestMilestoneRewardURI(
    uint256 _questProfileId,
    uint256 _questPubId,
    uint256 _milestone
  ) public view returns (string memory) {
    return
      _allQuests[_questProfileId][_questPubId]
        .milestones[_milestone - 1]
        .reward
        .uri;
  }

  /**
   * @dev Retrieves the address of a valid quest contract for a quest profile and pubId.
   * @param _profileId Lens Profile Id for the quest profile.
   * @param _pubId Lens Pub Id for the quest.
   * @return Address of the valid quest contract.
   */
  function getValidQuestContract(
    uint256 _profileId,
    uint256 _pubId
  ) public view returns (address) {
    return _validQuestContract[_profileId][_pubId];
  }

  /**
   * @dev Retrieves the address of a valid escrow contract for a quest profile and pubId.
   * @param _profileId Lens Profile Id for the quest profile.
   * @param _pubId Lens Pub Id for the quest.
   * @return Address of the valid escrow contract.
   */
  function getValidEscrowContract(
    uint256 _profileId,
    uint256 _pubId
  ) public view returns (address) {
    return _validEscrowContract[_profileId][_pubId];
  }

  /**
   * @dev Retrieves the address of a valid metrics contract for a quest profile and pubId.
   * @param _profileId Lens Profile Id for the quest profile.
   * @return Addresses array of the valid metrics contracts.
   */
  function getValidMetricsContracts(
    uint256 _profileId
  ) public view returns (address[] memory) {
    return _validMetricsContract[_profileId];
  }
}
