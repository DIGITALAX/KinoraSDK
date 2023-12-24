// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.19;

import "./KinoraLibrary.sol";
import "./KinoraErrors.sol";
import "./KinoraQuest.sol";
import "./KinoraEscrow.sol";
import "./KinoraMetrics.sol";
import "./KinoraAccessControl.sol";

contract KinoraQuestData {
  KinoraQuest public kinoraQuest;
  KinoraAccessControl public kinoraAccess;
  KinoraMetrics public kinoraMetrics;
  KinoraEscrow public kinoraEscrow;
  string public name;
  string public symbol;
  address public kinoraOpenAction;
  uint256 private _questCount;
  uint256 private _playerCount;

  // Mapping to store the data of all players against their Profile Id.
  mapping(uint256 => KinoraLibrary.Player) private _allPlayers;
  // Nested mapping to store the quest data against the Quest Id.
  mapping(uint256 => KinoraLibrary.Quest) private _allQuests;
  // Lens Pub and Profile Id to Quest Id
  mapping(uint256 => mapping(uint256 => uint256)) _lensToQuestId;

  // Event emitted when a new quest is instantiated.
  event QuestInstantiated(uint256 questId, uint256 milestoneCount);
  // Emitted when a player joins a quest.
  event PlayerJoinedQuest(uint256 questId, uint256 playerProfileId);
  // Emitted when player metrics are updated.
  event PlayerMetricsUpdated(
    uint256 playerProfileId,
    uint256 videoPubId,
    uint256 videoProfileId
  );
  // Emitted when the status of a quest is updated.
  event QuestStatusUpdated(uint256 questId, KinoraLibrary.Status status);
  // Emitted when the a milestone is completed by a player.
  event MilestoneCompleted(
    uint256 questId,
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
    if (address(kinoraQuest) != msg.sender) {
      revert KinoraErrors.InvalidContract();
    }
    _;
  }

  // Ensures the caller is a valid escrow contract for the specified profile and quest.
  modifier onlyKinoraEscrow() {
    if (address(kinoraEscrow) != msg.sender) {
      revert KinoraErrors.InvalidContract();
    }
    _;
  }

  // Ensures the caller is a valid metrics contract for the specified profile and quest.
  modifier onlyMetricsContract() {
    if (address(kinoraMetrics) != msg.sender) {
      revert KinoraErrors.InvalidContract();
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
   * @dev Constructor function to initialize related Kinora contracts.
   */
  constructor(
    address _metricsAddress,
    address _escrowAddress,
    address _questAddress,
    address _accessAddress
  ) {
    name = "KinoraQuestData";
    symbol = "KQD";
    _questCount = 0;
    _playerCount = 0;
    kinoraAccess = KinoraAccessControl(_accessAddress);
    kinoraQuest = KinoraQuest(_questAddress);
    kinoraMetrics = KinoraMetrics(_metricsAddress);
    kinoraEscrow = KinoraEscrow(_escrowAddress);
  }

  /**
   * @dev Function to create a new quest.
   * @param _params NewQuestParams struct from KinoraLibrary contract
   * @param _questId Quest Id
   */
  function newQuest(
    KinoraLibrary.NewQuestParams memory _params,
    uint256 _questId
  ) external onlyKinoraQuest {
    uint256[] memory _emptyPlayers;
    _questCount++;

    _allQuests[_questId] = KinoraLibrary.Quest({
      questId: _questCount,
      pubId: _params.pubId,
      profileId: _params.profileId,
      players: _emptyPlayers,
      status: KinoraLibrary.Status.Open,
      maxPlayerCount: _params.maxPlayerCount,
      gated: _params.gated,
      milestones: _params.milestones
    });

    _lensToQuestId[_params.pubId][_params.profileId] = _questCount;

    emit QuestInstantiated(_questId, _params.milestones.length);
  }

  /**
   * @dev Allows a player to join a quest.
   * @param _playerAddress The address of the player joining the quest.
   * @param _questId The Quest Id
   * @param _playerProfileId The Lens Profile Id of the player's profile.
   */
  function joinQuest(
    address _playerAddress,
    uint256 _questId,
    uint256 _playerProfileId
  ) external onlyKinoraQuest {
    if (_allPlayers[_playerProfileId].activeSince == 0) {
      _playerCount++;
      _allPlayers[_playerProfileId].playerAddress = _playerAddress;
      _allPlayers[_playerProfileId].activeSince = block.timestamp;
    }

    _allPlayers[_playerProfileId].questsJoined.push(_questId);
    _allPlayers[_playerProfileId].joinedQuest[_questId] = true;
    _allQuests[_questId].players.push(_playerProfileId);

    emit PlayerJoinedQuest(_questId, _playerProfileId);
  }

  /**
   * @dev Records the completion of a milestone by a player.
   * @param _questId The Lens Pub Id of the quest.
   * @param _playerProfileId The Lens Profile Id of the player's profile.
   */
  function completeMilestone(
    uint256 _questId,
    uint256 _playerProfileId
  ) external onlyKinoraQuest {
    uint256 _milestone = _allPlayers[_playerProfileId]
      .milestonesCompletedPerQuest + 1;

    _allPlayers[_playerProfileId].milestonesCompletedPerQuest[
      _questId
    ] = _milestone;

    emit MilestoneCompleted(_questId, _playerProfileId, _milestone);
  }

  /**
   * @dev Sets a new valid metrics contract.
   * @param _newMetricsContract The address of the new metrics contract.
   */
  function setKinoraMetricsContract(
    address _newMetricsContract
  ) external onlyMaintainer {
    kinoraMetrics = KinoraMetrics(_newMetricsContract);
  }

  /**
   * @dev Sets a new valid open action contract.
   * @param _newOpenActionContract The address of the new open action contract.
   */
  function setKinoraMetricsContract(
    address _newOpenActionContract
  ) external onlyMaintainer {
    kinoraOpenAction = _newOpenActionContract;
  }

  /**
   * @dev Sets a new valid access contract.
   * @param _newAccessContract The address of the new access
   */
  function setKinoraAccessContract(
    address _newAccessContract
  ) external onlyMaintainer {
    kinoraAccess = KinoraAccessControl(_newAccessContract);
  }

  /**
   * @dev Sets a new valid quest contract.
   * @param _newQuestContract The address of the new quest contract.
   */
  function setKinoraQuestContract(
    address _newQuestContract
  ) external onlyMaintainer {
    kinoraQuest = KinoraQuest(_newQuestContract);
  }

  /**
   * @dev Sets a new valid escrow contract.
   * @param _newEscrowContract The address of the new escrow contract.
   */
  function setKinoraEscrowContract(
    address _newEscrowContract
  ) external onlyMaintainer {
    kinoraEscrow = KinoraEscrow(_newEscrowContract);
  }

  /**
   * @dev Updates the status of a quest.
   * @param _questId The Quest Id
   */
  function updateQuestStatus(uint256 _questId) external onlyKinoraEscrow {
    _allQuests[_questId].status = KinoraLibrary.Status.Closed;

    emit QuestStatusUpdated(_questId, _allQuests[_questId].status);
  }

  /**
   * @dev Updates the metrics of a player for a particular video.
   * @param _metrics The Player Video metrics object.
   * @param _videoPubId The Video pub Id for metrics to update.
   * @param _videoProfileId The Video profile Id for metrics to update.
   * @param _playerProfileId The Lens Profile Id of the player.
   */
  function updatePlayerMetrics(
    KinoraLibrary.PlayerVideoMetrics memory _metrics,
    uint256 _videoPubId,
    uint256 _videoProfileId,
    uint256 _playerProfileId
  ) external onlyMetricsContract {
    if (_allPlayers[_playerProfileId].activeSince == 0) {
      revert KinoraErrors.PlayerNotEligible();
    }
    _allPlayers[_playerProfileId].videoMetrics[_videoPubId][
      _videoProfileId
    ] = _metrics;

    emit PlayerMetricsUpdated(_playerProfileId, _videoPubId, _videoProfileId);
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
}
