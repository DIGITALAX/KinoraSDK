// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.19;

import "./KinoraLibrary.sol";
import "./KinoraErrors.sol";
import "./KinoraEscrow.sol";
import "./KinoraMetrics.sol";
import "./KinoraAccessControl.sol";

contract KinoraQuestData {
  KinoraAccessControl public kinoraAccess;
  KinoraMetrics public kinoraMetrics;
  KinoraEscrow public kinoraEscrow;
  string public name;
  string public symbol;
  address public kinoraOpenAction;
  uint256 private _questCount;
  uint256 private _playerCount;

  mapping(uint256 => KinoraLibrary.Player) private _allPlayers;
  mapping(uint256 => KinoraLibrary.Quest) private _allQuests;
  mapping(string => uint256[]) private _idsToQuests;
  mapping(string => KinoraLibrary.VideoPost) private _idsToVideos;

  event QuestInstantiated(uint256 questId, uint256 milestoneCount);
  event PlayerJoinedQuest(uint256 questId, uint256 playerProfileId);
  event PlayerMetricsUpdated(
    uint256 playerProfileId,
    uint256 videoPubId,
    uint256 videoProfileId
  );
  event QuestStatusUpdated(uint256 questId, KinoraLibrary.Status status);
  event MilestoneCompleted(
    uint256 questId,
    uint256 playerProfileId,
    uint256 milestone
  );
  event PlayerEligibleToClaimMilestone(
    uint256 playerProfileId,
    uint256 questId,
    uint256 milestone,
    bool eligibility
  );

  modifier onlyKinoraOpenAction() {
    if (kinoraOpenAction != msg.sender) {
      revert KinoraErrors.InvalidContract();
    }
    _;
  }
  modifier onlyKinoraEscrow() {
    if (address(kinoraEscrow) != msg.sender) {
      revert KinoraErrors.InvalidContract();
    }
    _;
  }
  modifier onlyKinoraMetrics() {
    if (address(kinoraMetrics) != msg.sender) {
      revert KinoraErrors.InvalidContract();
    }
    _;
  }
  modifier onlyMaintainer() {
    if (!kinoraAccess.isAdmin(msg.sender)) {
      revert KinoraErrors.InvalidAddress();
    }
    _;
  }

  constructor(
    address _metricsAddress,
    address _escrowAddress,
    address _accessAddress
  ) {
    name = "KinoraQuestData";
    symbol = "KQD";
    _questCount = 0;
    _playerCount = 0;
    kinoraAccess = KinoraAccessControl(_accessAddress);
    kinoraMetrics = KinoraMetrics(_metricsAddress);
    kinoraEscrow = KinoraEscrow(_escrowAddress);
  }

  function configureNewQuest(
    KinoraLibrary.NewQuestParams memory _params
  ) external onlyKinoraOpenAction {
    _questCount++;
    KinoraLibrary.Quest storage newQuest = _allQuests[_questCount];
    newQuest.questId = _questCount;
    newQuest.pubId = _params.pubId;
    newQuest.profileId = _params.profileId;
    newQuest.envoker = _params.envokerAddress;
    newQuest.maxPlayerCount = _params.maxPlayerCount;
    newQuest.status = KinoraLibrary.Status.Open;
    newQuest.gated = _params.gateLogic;
    newQuest.milestoneCount = _params.milestones.length;

    _setMilestones(_params.milestones, newQuest, _questCount);

    emit QuestInstantiated(_questCount, _params.milestones.length);
  }

  function joinQuest(
    address _playerAddress,
    uint256 _questId,
    uint256 _playerProfileId
  ) external onlyKinoraOpenAction {
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

  function playerEligibleToClaim(
    uint256 _playerProfileId,
    uint256 _questId,
    uint256 _milestone,
    bool _eligible
  ) external onlyKinoraMetrics {
    _allPlayers[_playerProfileId].eligibleToClaimMilestone[_questId][
        _milestone
      ] = _eligible;

    emit PlayerEligibleToClaimMilestone(
      _playerProfileId,
      _questId,
      _milestone,
      _eligible
    );
  }

  function completeMilestone(
    uint256 _questId,
    uint256 _playerProfileId
  ) external onlyKinoraOpenAction {
    uint256 _milestone = _allPlayers[_playerProfileId]
      .milestonesCompletedPerQuest[_questId] + 1;

    _allPlayers[_playerProfileId].milestonesCompletedPerQuest[
      _questId
    ] = _milestone;

    emit MilestoneCompleted(_questId, _playerProfileId, _milestone);
  }

  function setKinoraMetricsContract(
    address _newMetricsContract
  ) external onlyMaintainer {
    kinoraMetrics = KinoraMetrics(_newMetricsContract);
  }

  function setKinoraOpenActionContract(
    address _newOpenActionContract
  ) external onlyMaintainer {
    kinoraOpenAction = _newOpenActionContract;
  }

  function setKinoraAccessContract(
    address _newAccessContract
  ) external onlyMaintainer {
    kinoraAccess = KinoraAccessControl(_newAccessContract);
  }

  function setKinoraEscrowContract(
    address _newEscrowContract
  ) external onlyMaintainer {
    kinoraEscrow = KinoraEscrow(_newEscrowContract);
  }

  function updateQuestStatus(uint256 _questId) external onlyKinoraEscrow {
    _allQuests[_questId].status = KinoraLibrary.Status.Closed;

    emit QuestStatusUpdated(_questId, _allQuests[_questId].status);
  }

  function updatePlayerMetrics(
    KinoraLibrary.PlayerVideoMetrics memory _metrics,
    uint256 _videoPubId,
    uint256 _videoProfileId,
    uint256 _playerProfileId
  ) external onlyKinoraMetrics {
    if (_allPlayers[_playerProfileId].activeSince == 0) {
      revert KinoraErrors.PlayerNotEligible();
    }
    _allPlayers[_playerProfileId].videoMetrics[_videoPubId][
      _videoProfileId
    ] = _metrics;

    emit PlayerMetricsUpdated(_playerProfileId, _videoPubId, _videoProfileId);
  }

  function _setMilestones(
    KinoraLibrary.MilestoneParameter[] memory _milestones,
    KinoraLibrary.Quest storage _newQuest,
    uint256 _questId
  ) private {
    for (uint256 i = 0; i < _milestones.length; i++) {
      KinoraLibrary.Milestone storage _newMilestone = _newQuest
        .milestones
        .push();
      _newMilestone.milestone = i + 1;
      _newMilestone.gated = _milestones[i].gated;
      _newMilestone.videoLength = _milestones[i].videos.length;
      _newMilestone.rewardsLength = _milestones[i].rewards.length;

      _setRewards(_newMilestone, _milestones[i]);
      _setVideos(_newMilestone, _milestones[i], _questId);
    }
  }

  function _setRewards(
    KinoraLibrary.Milestone storage _newMilestone,
    KinoraLibrary.MilestoneParameter memory _paramsMilestone
  ) private {
    for (uint j = 0; j < _paramsMilestone.rewards.length; j++) {
      KinoraLibrary.Reward memory rewardMemory = _paramsMilestone.rewards[j];
      KinoraLibrary.Reward storage rewardStorage = _newMilestone.rewards.push();
      rewardStorage.rewardType = rewardMemory.rewardType;
      rewardStorage.uri = rewardMemory.uri;
      rewardStorage.tokenAddress = rewardMemory.tokenAddress;
      rewardStorage.amount = rewardMemory.amount;
    }
  }

  function _setVideos(
    KinoraLibrary.Milestone storage _newMilestone,
    KinoraLibrary.MilestoneParameter memory _paramsMilestone,
    uint256 _questId
  ) private {
    for (uint j = 0; j < _paramsMilestone.videos.length; j++) {
      KinoraLibrary.Video memory video = _paramsMilestone.videos[j];
      _newMilestone.videos[video.pubId][video.profileId] = video;
      _idsToQuests[video.playerId].push(_questId);
      _idsToVideos[video.playerId] = KinoraLibrary.VideoPost({
        pubId: video.pubId,
        profileId: video.profileId
      });
    }
  }

  function getTotalQuestCount() public view returns (uint256) {
    return _questCount;
  }

  function getTotalPlayerCount() public view returns (uint256) {
    return _playerCount;
  }

  function getPlayerVideoAVD(
    uint256 _playerProfileId,
    uint256 _videoPubId,
    uint256 _videoProfileId
  ) public view returns (uint256) {
    return
      _allPlayers[_playerProfileId]
      .videoMetrics[_videoProfileId][_videoPubId].avd;
  }

  function getPlayerVideoCTR(
    uint256 _playerProfileId,
    uint256 _videoPubId,
    uint256 _videoProfileId
  ) public view returns (uint256) {
    return
      _allPlayers[_playerProfileId]
      .videoMetrics[_videoProfileId][_videoPubId].ctr;
  }

  function getPlayerVideoImpressionCount(
    uint256 _playerProfileId,
    uint256 _videoPubId,
    uint256 _videoProfileId
  ) public view returns (uint256) {
    return
      _allPlayers[_playerProfileId]
      .videoMetrics[_videoProfileId][_videoPubId].impressionCount;
  }

  function getPlayerVideoPlayCount(
    uint256 _playerProfileId,
    uint256 _videoPubId,
    uint256 _videoProfileId
  ) public view returns (uint256) {
    return
      _allPlayers[_playerProfileId]
      .videoMetrics[_videoProfileId][_videoPubId].playCount;
  }

  function getPlayerVideoMostViewedSegment(
    uint256 _playerProfileId,
    uint256 _videoPubId,
    uint256 _videoProfileId
  ) public view returns (uint256) {
    return
      _allPlayers[_playerProfileId]
      .videoMetrics[_videoProfileId][_videoPubId].mostViewedSegment;
  }

  function getPlayerVideoInteractionRate(
    uint256 _playerProfileId,
    uint256 _videoPubId,
    uint256 _videoProfileId
  ) public view returns (uint256) {
    return
      _allPlayers[_playerProfileId]
      .videoMetrics[_videoProfileId][_videoPubId].interactionRate;
  }

  function getPlayerVideoMostReplayedArea(
    uint256 _playerProfileId,
    uint256 _videoPubId,
    uint256 _videoProfileId
  ) public view returns (uint256) {
    return
      _allPlayers[_playerProfileId]
      .videoMetrics[_videoProfileId][_videoPubId].mostReplayedArea;
  }

  function getPlayerVideoEngagementRate(
    uint256 _playerProfileId,
    uint256 _videoPubId,
    uint256 _videoProfileId
  ) public view returns (uint256) {
    return
      _allPlayers[_playerProfileId]
      .videoMetrics[_videoProfileId][_videoPubId].engagementRate;
  }

  function getPlayerVideoDuration(
    uint256 _playerProfileId,
    uint256 _videoPubId,
    uint256 _videoProfileId
  ) public view returns (uint256) {
    return
      _allPlayers[_playerProfileId]
      .videoMetrics[_videoProfileId][_videoPubId].duration;
  }

  function getPlayerVideoBookmark(
    uint256 _playerProfileId,
    uint256 _videoPubId,
    uint256 _videoProfileId
  ) public view returns (bool) {
    return
      _allPlayers[_playerProfileId]
      .videoMetrics[_videoProfileId][_videoPubId].hasBookmarked;
  }

  function getPlayerVideoComment(
    uint256 _playerProfileId,
    uint256 _videoPubId,
    uint256 _videoProfileId
  ) public view returns (bool) {
    return
      _allPlayers[_playerProfileId]
      .videoMetrics[_videoProfileId][_videoPubId].hasCommented;
  }

  function getPlayerVideoQuote(
    uint256 _playerProfileId,
    uint256 _videoPubId,
    uint256 _videoProfileId
  ) public view returns (bool) {
    return
      _allPlayers[_playerProfileId]
      .videoMetrics[_videoProfileId][_videoPubId].hasQuoted;
  }

  function getPlayerVideoMirror(
    uint256 _playerProfileId,
    uint256 _videoPubId,
    uint256 _videoProfileId
  ) public view returns (bool) {
    return
      _allPlayers[_playerProfileId]
      .videoMetrics[_videoProfileId][_videoPubId].hasMirrored;
  }

  function getPlayerVideoReact(
    uint256 _playerProfileId,
    uint256 _videoPubId,
    uint256 _videoProfileId
  ) public view returns (bool) {
    return
      _allPlayers[_playerProfileId]
      .videoMetrics[_videoProfileId][_videoPubId].hasReacted;
  }

  function getPlayerMilestonesCompletedPerQuest(
    uint256 _playerProfileId,
    uint256 _questId
  ) public view returns (uint256) {
    return _allPlayers[_playerProfileId].milestonesCompletedPerQuest[_questId];
  }

  function getPlayerEligibleToClaimMilestone(
    uint256 _playerProfileId,
    uint256 _questId,
    uint256 _milestone
  ) public view returns (bool) {
    return
      _allPlayers[_playerProfileId].eligibleToClaimMilestone[_questId][
        _milestone
      ];
  }

  function getPlayerActiveSince(
    uint256 _playerProfileId
  ) public view returns (uint256) {
    return _allPlayers[_playerProfileId].activeSince;
  }

  function getPlayerAddress(
    uint256 _playerProfileId
  ) public view returns (address) {
    return _allPlayers[_playerProfileId].playerAddress;
  }

  function getPlayerQuestsJoined(
    uint256 _playerProfileId
  ) public view returns (uint256[] memory) {
    return _allPlayers[_playerProfileId].questsJoined;
  }

  function getPlayerHasJoinedQuest(
    uint256 _playerProfileId,
    uint256 _questId
  ) public view returns (bool) {
    return _allPlayers[_playerProfileId].joinedQuest[_questId];
  }

  function getQuestEnvoker(uint256 _questId) public view returns (address) {
    return _allQuests[_questId].envoker;
  }

  function getQuestPlayers(
    uint256 _questId
  ) public view returns (uint256[] memory) {
    return _allQuests[_questId].players;
  }

  function getQuestMaxPlayerCount(
    uint256 _questId
  ) public view returns (uint256) {
    return _allQuests[_questId].maxPlayerCount;
  }

  function getQuestStatus(
    uint256 _questId
  ) public view returns (KinoraLibrary.Status) {
    return _allQuests[_questId].status;
  }

  function getMilestoneCount(uint256 _questId) public view returns (uint256) {
    return _allQuests[_questId].milestoneCount;
  }

  function getQuestPubId(uint256 _questId) public view returns (uint256) {
    return _allQuests[_questId].pubId;
  }

  function getQuestProfileId(uint256 _questId) public view returns (uint256) {
    return _allQuests[_questId].profileId;
  }

  function getQuestGatedERC721Addresses(
    uint256 _questId
  ) public view returns (address[] memory) {
    return _allQuests[_questId].gated.erc721Addresses;
  }

  function getQuestGatedERC721Tokens(
    uint256 _questId
  ) public view returns (KinoraLibrary.TokenData[] memory) {
    return _allQuests[_questId].gated.erc721TokenIds;
  }

  function getQuestGatedOneOf(uint256 _questId) public view returns (bool) {
    return _allQuests[_questId].gated.oneOf;
  }

  function getQuestGatedERC20Addresses(
    uint256 _questId
  ) public view returns (address[] memory) {
    return _allQuests[_questId].gated.erc20Addresses;
  }

  function getQuestGatedERC20Thresholds(
    uint256 _questId
  ) public view returns (uint256[] memory) {
    return _allQuests[_questId].gated.erc20Thresholds;
  }

  function getMilestoneGatedERC721Addresses(
    uint256 _questId,
    uint256 _milestone
  ) public view returns (address[] memory) {
    return _allQuests[_questId].milestones[_milestone].gated.erc721Addresses;
  }

  function getMilestoneGatedERC721Tokens(
    uint256 _questId,
    uint256 _milestone
  ) public view returns (KinoraLibrary.TokenData[] memory) {
    return _allQuests[_questId].milestones[_milestone].gated.erc721TokenIds;
  }

  function getMilestoneVideoLength(
    uint256 _questId,
    uint256 _milestone
  ) public view returns (uint256) {
    return _allQuests[_questId].milestones[_milestone].videoLength;
  }

  function getMilestoneRewardsLength(
    uint256 _questId,
    uint256 _milestone
  ) public view returns (uint256) {
    return _allQuests[_questId].milestones[_milestone].rewardsLength;
  }

  function getMilestoneVideoMinPlayCount(
    uint256 _questId,
    uint256 _milestone,
    uint256 _videoProfileId,
    uint256 _videoPubId
  ) public view returns (uint256) {
    return
      _allQuests[_questId]
      .milestones[_milestone]
      .videos[_videoProfileId][_videoPubId].minPlayCount;
  }

  function getMilestoneVideoMinCTR(
    uint256 _questId,
    uint256 _milestone,
    uint256 _videoProfileId,
    uint256 _videoPubId
  ) public view returns (uint256) {
    return
      _allQuests[_questId]
      .milestones[_milestone]
      .videos[_videoProfileId][_videoPubId].minCTR;
  }

  function getMilestoneVideoMinImpressionCount(
    uint256 _questId,
    uint256 _milestone,
    uint256 _videoProfileId,
    uint256 _videoPubId
  ) public view returns (uint256) {
    return
      _allQuests[_questId]
      .milestones[_milestone]
      .videos[_videoProfileId][_videoPubId].minImpressionCount;
  }

  function getMilestoneVideoMinEngagementRate(
    uint256 _questId,
    uint256 _milestone,
    uint256 _videoProfileId,
    uint256 _videoPubId
  ) public view returns (uint256) {
    return
      _allQuests[_questId]
      .milestones[_milestone]
      .videos[_videoProfileId][_videoPubId].minEngagementRate;
  }

  function getMilestoneVideoMinDuration(
    uint256 _questId,
    uint256 _milestone,
    uint256 _videoProfileId,
    uint256 _videoPubId
  ) public view returns (uint256) {
    return
      _allQuests[_questId]
      .milestones[_milestone]
      .videos[_videoProfileId][_videoPubId].minDuration;
  }

  function getMilestoneVideoQuote(
    uint256 _questId,
    uint256 _milestone,
    uint256 _videoProfileId,
    uint256 _videoPubId
  ) public view returns (bool) {
    return
      _allQuests[_questId]
      .milestones[_milestone]
      .videos[_videoProfileId][_videoPubId].quote;
  }

  function getMilestoneVideoMirror(
    uint256 _questId,
    uint256 _milestone,
    uint256 _videoProfileId,
    uint256 _videoPubId
  ) public view returns (bool) {
    return
      _allQuests[_questId]
      .milestones[_milestone]
      .videos[_videoProfileId][_videoPubId].mirror;
  }

  function getMilestoneVideoBookmark(
    uint256 _questId,
    uint256 _milestone,
    uint256 _videoProfileId,
    uint256 _videoPubId
  ) public view returns (bool) {
    return
      _allQuests[_questId]
      .milestones[_milestone]
      .videos[_videoProfileId][_videoPubId].bookmark;
  }

  function getMilestoneVideoReact(
    uint256 _questId,
    uint256 _milestone,
    uint256 _videoProfileId,
    uint256 _videoPubId
  ) public view returns (bool) {
    return
      _allQuests[_questId]
      .milestones[_milestone]
      .videos[_videoProfileId][_videoPubId].react;
  }

  function getMilestoneVideoComment(
    uint256 _questId,
    uint256 _milestone,
    uint256 _videoProfileId,
    uint256 _videoPubId
  ) public view returns (bool) {
    return
      _allQuests[_questId]
      .milestones[_milestone]
      .videos[_videoProfileId][_videoPubId].comment;
  }

  function getMilestoneVideoMinAVD(
    uint256 _questId,
    uint256 _milestone,
    uint256 _videoProfileId,
    uint256 _videoPubId
  ) public view returns (uint256) {
    return
      _allQuests[_questId]
      .milestones[_milestone]
      .videos[_videoProfileId][_videoPubId].minAVD;
  }

  function getMilestoneGatedOneOf(
    uint256 _questId,
    uint256 _milestone
  ) public view returns (bool) {
    return _allQuests[_questId].milestones[_milestone].gated.oneOf;
  }

  function getMilestoneGatedERC20Addresses(
    uint256 _questId,
    uint256 _milestone
  ) public view returns (address[] memory) {
    return _allQuests[_questId].milestones[_milestone].gated.erc20Addresses;
  }

  function getMilestoneGatedERC20Thresholds(
    uint256 _questId,
    uint256 _milestone
  ) public view returns (uint256[] memory) {
    return _allQuests[_questId].milestones[_milestone].gated.erc20Thresholds;
  }

  function getMilestoneRewardType(
    uint256 _questId,
    uint256 _rewardIndex,
    uint256 _milestone
  ) public view returns (KinoraLibrary.RewardType) {
    return
      _allQuests[_questId]
        .milestones[_milestone - 1]
        .rewards[_rewardIndex]
        .rewardType;
  }

  function getMilestoneRewardTokenAddress(
    uint256 _questId,
    uint256 _rewardIndex,
    uint256 _milestone
  ) public view returns (address) {
    return
      _allQuests[_questId]
        .milestones[_milestone - 1]
        .rewards[_rewardIndex]
        .tokenAddress;
  }

  function getMilestoneRewardTokenAmount(
    uint256 _questId,
    uint256 _rewardIndex,
    uint256 _milestone
  ) public view returns (uint256) {
    return
      _allQuests[_questId]
        .milestones[_milestone - 1]
        .rewards[_rewardIndex]
        .amount;
  }

  function getMilestoneRewardURI(
    uint256 _questId,
    uint256 _rewardIndex,
    uint256 _milestone
  ) public view returns (string memory) {
    return
      _allQuests[_questId].milestones[_milestone - 1].rewards[_rewardIndex].uri;
  }

  function getQuestIdsToVideoPlaybackId(
    string memory _playbackId
  ) public view returns (uint256[] memory) {
    return _idsToQuests[_playbackId];
  }

  function getVideoPubIdFromPlaybackId(
    string memory _playbackId
  ) public view returns (uint256) {
    return _idsToVideos[_playbackId].pubId;
  }

  function getVideoProfileIdFromPlaybackId(
    string memory _playbackId
  ) public view returns (uint256) {
    return _idsToVideos[_playbackId].profileId;
  }
}
