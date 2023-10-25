// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.19;

import "./KinoraLibrary.sol";
import "./KinoraErrors.sol";

contract KinoraQuestData {
  string public name;
  string public symbol;
  address public factoryContract;
  address public kinoraOpenAction;
  uint256 private _questCount;
  uint256 private _playerCount;

  mapping(uint256 => KinoraLibrary.Player) private _allPlayers;
  mapping(uint256 => mapping(uint256 => KinoraLibrary.Quest))
    private _allQuests;
  mapping(uint256 => mapping(uint256 => address)) private _validQuestContract;
  mapping(uint256 => mapping(uint256 => address)) private _validMetricsContract;

  event QuestInstantiated(
    uint256 profileId,
    uint256 pubId,
    uint256 milestoneCount,
    bytes32 joinHash
  );
  event PlayerJoinedQuest(
    uint256 profileId,
    uint256 pubId,
    uint256 playerProfileId
  );
  event PlayerMetricsUpdated(uint256 playerProfileId, string playbackId);
  event QuestStatusUpdated(
    uint256 profileId,
    uint256 pubId,
    KinoraLibrary.Status status
  );
  event QuestContractValidated(
    uint256 profileId,
    uint256 pubId,
    address questContract
  );
  event MetricsContractValidated(
    uint256 profileId,
    uint256 pubId,
    address metricsContract
  );
  event MilestoneCompleted(
    uint256 profileId,
    uint256 pubId,
    uint256 playerProfileId,
    uint256 milestone
  );
  event PlayerMilestoneEligibilityUpdated(
    uint256 playerProfileId,
    uint256 profileId,
    uint256 pubId,
    uint256 milestone,
    bool eligibility
  );

  modifier onlyValidQuestContract(uint256 _profileId, uint256 _pubId) {
    if (_validQuestContract[_profileId][_pubId] != msg.sender) {
      revert KinoraErrors.InvalidContract();
    }
    _;
  }

  modifier onlyActionOrFactory() {
    if (msg.sender != factoryContract || msg.sender != kinoraOpenAction) {
      revert KinoraErrors.InvalidContract();
    }
    _;
  }

  modifier onlyValidMetricsContract(uint256 _profileId, uint256 _pubId) {
    if (_validMetricsContract[_profileId][_pubId] != msg.sender) {
      revert KinoraErrors.InvalidContract();
    }
    _;
  }

  constructor(address _factoryAddress, address _kinoraOpenActionAddress) {
    name = "KinoraQuestData";
    symbol = "KQD";
    _questCount = 0;
    _playerCount = 0;
    factoryContract = _factoryAddress;
    kinoraOpenAction = _kinoraOpenActionAddress;
  }

  function getTotalQuestCount() public view returns (uint256) {
    return _questCount;
  }

  function getTotalPlayerCount() public view returns (uint256) {
    return _playerCount;
  }

  function newQuest(
    KinoraLibrary.Milestone[] memory _milestones,
    bytes32 _joinHash,
    uint256 _maxPlayerCount,
    uint256 _pubId,
    uint256 _profileId
  ) external onlyValidQuestContract(_profileId, _pubId) {
    uint256[] memory _emptyPlayers;

    _allQuests[_profileId][_pubId].pubId = _pubId;
    _allQuests[_profileId][_pubId].profileId = _profileId;
    _allQuests[_profileId][_pubId].joinHash = _joinHash;
    _allQuests[_profileId][_pubId].players = _emptyPlayers;
    _allQuests[_profileId][_pubId].milestoneCount = _milestones.length;
    _allQuests[_profileId][_pubId].status = KinoraLibrary.Status.Open;
    _allQuests[_profileId][_pubId].maxPlayerCount = _maxPlayerCount;

    for (uint256 i = 0; i < _milestones.length; i++) {
      _allQuests[_profileId][_pubId].milestones[i].reward = _milestones[i]
        .reward;
      _allQuests[_profileId][_pubId].milestones[i].completionHash = _milestones[
        i
      ].completionHash;
      _allQuests[_profileId][_pubId].milestones[i].numberOfPoints = _milestones[
        i
      ].numberOfPoints;
      _allQuests[_profileId][_pubId].milestones[i].milestone = _milestones[i]
        .milestone;
    }

    _questCount++;

    emit QuestInstantiated(_profileId, _pubId, _milestones.length, _joinHash);
  }

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

  function completeMilestone(
    uint256 _pubId,
    uint256 _profileId,
    uint256 _playerProfileId,
    uint256 _milestone
  ) external onlyValidQuestContract(_profileId, _pubId) {
    _allPlayers[_playerProfileId].milestonesCompletedPerQuest[_profileId][
        _pubId
      ] = _milestone;
    _allPlayers[_playerProfileId].totalPointCount += _allQuests[_profileId][
      _pubId
    ].milestones[_milestone - 1].numberOfPoints;

    emit MilestoneCompleted(_profileId, _pubId, _playerProfileId, _milestone);
  }

  function setValidMetricsContract(
    uint256 _profileId,
    uint256 _pubId,
    address _newMetricsContract
  ) external onlyActionOrFactory {
    _validMetricsContract[_profileId][_pubId] = _newMetricsContract;

    emit MetricsContractValidated(_profileId, _pubId, _newMetricsContract);
  }

  function setValidQuestContract(
    uint256 _profileId,
    uint256 _pubId,
    address _newQuestContract
  ) external onlyActionOrFactory {
    _validQuestContract[_profileId][_pubId] = _newQuestContract;

    emit QuestContractValidated(_profileId, _pubId, _newQuestContract);
  }

  function updatePlayerMilestoneEligibility(
    uint256 _playerProfileId,
    uint256 _profileId,
    uint256 _pubId,
    uint256 _milestone,
    bool _eligibility
  ) external onlyValidMetricsContract(_profileId, _pubId) {
    _allPlayers[_playerProfileId].elegibleToClaimMilestone[_profileId][_pubId][
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

  function updateQuestStatus(
    uint256 _profileId,
    uint256 _pubId
  ) external onlyValidQuestContract(_profileId, _pubId) {
    _allQuests[_profileId][_pubId].status = KinoraLibrary.Status.Closed;

    emit QuestStatusUpdated(
      _profileId,
      _pubId,
      _allQuests[_profileId][_pubId].status
    );
  }

  function updatePlayerMetrics(
    string memory _playbackId,
    string memory _json,
    uint256 _playerProfileId,
    uint256 _profileId,
    uint256 _pubId,
    bool _encrypted
  ) external onlyValidMetricsContract(_profileId, _pubId) {
    _allPlayers[_playerProfileId].playbackIdMetrics[_profileId][_pubId][
        _playbackId
      ] = KinoraLibrary.PlayerLivePeerMetrics({
      playbackId: _playbackId,
      pubId: _pubId,
      profileId: _profileId,
      metricJSONHash: _json,
      encrypted: _encrypted
    });

    emit PlayerMetricsUpdated(_playerProfileId, _playbackId);
  }

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

  function getPlayerElegibleToClaimMilestone(
    uint256 _playerProfileId,
    uint256 _questProfileId,
    uint256 _pubId,
    uint256 _milestone
  ) public view returns (bool) {
    return
      _allPlayers[_playerProfileId].elegibleToClaimMilestone[_questProfileId][
        _pubId
      ][_milestone];
  }

  function getPlayerPlaybackIdMetricsEncrypted(
    string memory _playbackId,
    uint256 _playerProfileId,
    uint256 _profileId,
    uint256 _pubId
  ) public view returns (bool) {
    return
      _allPlayers[_playerProfileId]
      .playbackIdMetrics[_profileId][_pubId][_playbackId].encrypted;
  }

  function getPlayerPlaybackIdMetricsHash(
    string memory _playbackId,
    uint256 _playerProfileId,
    uint256 _profileId,
    uint256 _pubId
  ) public view returns (string memory) {
    return
      _allPlayers[_playerProfileId]
      .playbackIdMetrics[_profileId][_pubId][_playbackId].metricJSONHash;
  }

  function getPlayerNumberOfPoints(
    uint256 _playerProfileId
  ) public view returns (uint256) {
    return _allPlayers[_playerProfileId].totalPointCount;
  }

  function getPlayerAddress(
    uint256 _playerProfileId
  ) public view returns (address) {
    return _allPlayers[_playerProfileId].playerAddress;
  }

  function getPlayerQuestsJoined(
    uint256 _playerProfileId,
    uint256 _questProfileId
  ) public view returns (uint256[] memory) {
    return _allPlayers[_playerProfileId].questsJoined[_questProfileId];
  }

  function getPlayerHasJoinedQuest(
    uint256 _playerProfileId,
    uint256 _questProfileId,
    uint256 _questPubId
  ) public view returns (bool) {
    return
      _allPlayers[_playerProfileId].joinedQuest[_questProfileId][_questPubId];
  }

  function getQuestJoinHash(
    uint256 _questProfileId,
    uint256 _questPubId
  ) public view returns (bytes32) {
    return _allQuests[_questProfileId][_questPubId].joinHash;
  }

  function getQuestPlayers(
    uint256 _questProfileId,
    uint256 _questPubId
  ) public view returns (uint256[] memory) {
    return _allQuests[_questProfileId][_questPubId].players;
  }

  function getQuestMaxPlayerCount(
    uint256 _questProfileId,
    uint256 _questPubId
  ) public view returns (uint256) {
    return _allQuests[_questProfileId][_questPubId].maxPlayerCount;
  }

  function getQuestStatus(
    uint256 _questProfileId,
    uint256 _questPubId
  ) public view returns (KinoraLibrary.Status) {
    return _allQuests[_questProfileId][_questPubId].status;
  }

  function getQuestPubId(
    uint256 _questProfileId,
    uint256 _questPubId
  ) public view returns (uint256) {
    return _allQuests[_questProfileId][_questPubId].pubId;
  }

  function getQuestProfileId(
    uint256 _questProfileId,
    uint256 _questPubId
  ) public view returns (uint256) {
    return _allQuests[_questProfileId][_questPubId].profileId;
  }

  function getQuestMilestoneCount(
    uint256 _questProfileId,
    uint256 _questPubId
  ) public view returns (uint256) {
    return _allQuests[_questProfileId][_questPubId].milestoneCount;
  }

  function getQuestMilestoneCompletionHash(
    uint256 _questProfileId,
    uint256 _questPubId,
    uint256 _milestone
  ) public view returns (bytes32) {
    return
      _allQuests[_questProfileId][_questPubId]
        .milestones[_milestone - 1]
        .completionHash;
  }

  function getQuestMilestoneNumberOfPoints(
    uint256 _questProfileId,
    uint256 _questPubId,
    uint256 _milestone
  ) public view returns (uint256) {
    return
      _allQuests[_questProfileId][_questPubId]
        .milestones[_milestone - 1]
        .numberOfPoints;
  }

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

  function getValidQuestContract(
    uint256 _profileId,
    uint256 _pubId
  ) public view returns (address) {
    return _validQuestContract[_profileId][_pubId];
  }

  function getValidMetricsContract(
    uint256 _profileId,
    uint256 _pubId
  ) public view returns (address) {
    return _validMetricsContract[_profileId][_pubId];
  }
}
