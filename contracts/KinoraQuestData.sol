// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.19;

import "./KinoraLibrary.sol";
import "./KinoraErrors.sol";
import "./KinoraEscrow.sol";
import "./KinoraMetrics.sol";
import "./KinoraAccessControl.sol";
import "hardhat/console.sol";

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
  mapping(uint256 => mapping(uint256 => string)) private _postToPlayback;
  mapping(address => uint256) private _addressToProfile;
  mapping(uint256 => mapping(uint256 => uint256)) _questIdFromLensData;

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
  event QuestCompleted(uint256 questId, uint256 playerProfileId);
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

  constructor(address _accessAddress) {
    name = "KinoraQuestData";
    symbol = "KQD";
    _questCount = 0;
    _playerCount = 0;
    kinoraAccess = KinoraAccessControl(_accessAddress);
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
    newQuest.uri = _params.uri;

    _setMilestones(_params.milestones, newQuest, _questCount);

    _questIdFromLensData[_params.profileId][_params.pubId] = _questCount;

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
      _addressToProfile[_playerAddress] = _playerProfileId;
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
        _milestone - 1
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

    if (_milestone == _allQuests[_questId].milestoneCount) {
      _allPlayers[_playerProfileId].questsCompleted.push(_questId);
      emit QuestCompleted(_questId, _playerProfileId);
    }
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
    uint256 _playerProfileId
  ) external onlyKinoraMetrics {
    if (_allPlayers[_playerProfileId].activeSince == 0) {
      revert KinoraErrors.PlayerNotEligible();
    }

    if (
      _allPlayers[_playerProfileId]
      .videoMetrics[_metrics.profileId][_metrics.pubId].profileId ==
      0 &&
      _allPlayers[_playerProfileId]
      .videoMetrics[_metrics.profileId][_metrics.pubId].pubId ==
      0
    ) {
      string memory _playback = _postToPlayback[_metrics.profileId][
        _metrics.pubId
      ];

      _allPlayers[_playerProfileId].videoBytes.push(
        _idsToVideos[_playback].videoBytes
      );
    }

    _allPlayers[_playerProfileId].videoMetrics[_metrics.profileId][
      _metrics.pubId
    ] = _metrics;

    emit PlayerMetricsUpdated(
      _playerProfileId,
      _metrics.pubId,
      _metrics.profileId
    );
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
      _newMilestone.uri = _milestones[i].uri;

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
    string[] memory _videoBytes = new string[](_paramsMilestone.videos.length);

    for (uint j = 0; j < _paramsMilestone.videos.length; j++) {
      KinoraLibrary.Video memory video = _paramsMilestone.videos[j];
      _newMilestone.videos[video.profileId][video.pubId] = video;
      _idsToQuests[video.playerId].push(_questId);
      _idsToVideos[video.playerId] = KinoraLibrary.VideoPost({
        pubId: video.pubId,
        profileId: video.profileId,
        videoBytes: video.videoBytes
      });
      _postToPlayback[video.profileId][video.pubId] = video.playerId;
      _videoBytes[j] = video.videoBytes;
    }

    _newMilestone.videoBytes = _videoBytes;
  }

  function getTotalQuestCount() public view returns (uint256) {
    return _questCount;
  }

  function getTotalPlayerCount() public view returns (uint256) {
    return _playerCount;
  }

  function getPlayerQuestsCompleted(
    uint256 _playerProfileId
  ) public view returns (uint256[] memory) {
    return _allPlayers[_playerProfileId].questsCompleted;
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

  function getPlayerVideoSecondaryCommentOnComment(
    uint256 _playerProfileId,
    uint256 _videoPubId,
    uint256 _videoProfileId
  ) public view returns (uint256) {
    return
      _allPlayers[_playerProfileId]
      .videoMetrics[_videoProfileId][_videoPubId].secondaryCommentOnComment;
  }

  function getPlayerVideoSecondaryReactOnComment(
    uint256 _playerProfileId,
    uint256 _videoPubId,
    uint256 _videoProfileId
  ) public view returns (uint256) {
    return
      _allPlayers[_playerProfileId]
      .videoMetrics[_videoProfileId][_videoPubId].secondaryReactOnComment;
  }

  function getPlayerVideoSecondaryCollectOnComment(
    uint256 _playerProfileId,
    uint256 _videoPubId,
    uint256 _videoProfileId
  ) public view returns (uint256) {
    return
      _allPlayers[_playerProfileId]
      .videoMetrics[_videoProfileId][_videoPubId].secondaryCollectOnComment;
  }

  function getPlayerVideoSecondaryMirrorOnComment(
    uint256 _playerProfileId,
    uint256 _videoPubId,
    uint256 _videoProfileId
  ) public view returns (uint256) {
    return
      _allPlayers[_playerProfileId]
      .videoMetrics[_videoProfileId][_videoPubId].secondaryMirrorOnComment;
  }

  function getPlayerVideoSecondaryQuoteOnComment(
    uint256 _playerProfileId,
    uint256 _videoPubId,
    uint256 _videoProfileId
  ) public view returns (uint256) {
    return
      _allPlayers[_playerProfileId]
      .videoMetrics[_videoProfileId][_videoPubId].secondaryQuoteOnComment;
  }

  function getPlayerVideoSecondaryCollectOnQuote(
    uint256 _playerProfileId,
    uint256 _videoPubId,
    uint256 _videoProfileId
  ) public view returns (uint256) {
    return
      _allPlayers[_playerProfileId]
      .videoMetrics[_videoProfileId][_videoPubId].secondaryCollectOnQuote;
  }

  function getPlayerVideoSecondaryReactOnQuote(
    uint256 _playerProfileId,
    uint256 _videoPubId,
    uint256 _videoProfileId
  ) public view returns (uint256) {
    return
      _allPlayers[_playerProfileId]
      .videoMetrics[_videoProfileId][_videoPubId].secondaryReactOnQuote;
  }

  function getPlayerVideoSecondaryMirrorOnQuote(
    uint256 _playerProfileId,
    uint256 _videoPubId,
    uint256 _videoProfileId
  ) public view returns (uint256) {
    return
      _allPlayers[_playerProfileId]
      .videoMetrics[_videoProfileId][_videoPubId].secondaryMirrorOnQuote;
  }

  function getPlayerVideoSecondaryCommentOnQuote(
    uint256 _playerProfileId,
    uint256 _videoPubId,
    uint256 _videoProfileId
  ) public view returns (uint256) {
    return
      _allPlayers[_playerProfileId]
      .videoMetrics[_videoProfileId][_videoPubId].secondaryCommentOnQuote;
  }

  function getPlayerVideoSecondaryQuoteOnQuote(
    uint256 _playerProfileId,
    uint256 _videoPubId,
    uint256 _videoProfileId
  ) public view returns (uint256) {
    return
      _allPlayers[_playerProfileId]
      .videoMetrics[_videoProfileId][_videoPubId].secondaryQuoteOnQuote;
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

  function getPlayerVideoDuration(
    uint256 _playerProfileId,
    uint256 _videoPubId,
    uint256 _videoProfileId
  ) public view returns (uint256) {
    return
      _allPlayers[_playerProfileId]
      .videoMetrics[_videoProfileId][_videoPubId].duration;
  }

  function getPlayerVideoBytes(
    uint256 _playerProfileId
  ) public view returns (string[] memory) {
    return _allPlayers[_playerProfileId].videoBytes;
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

  function getPlayerVideoPlayCount(
    uint256 _playerProfileId,
    uint256 _videoPubId,
    uint256 _videoProfileId
  ) public view returns (uint256) {
    return
      _allPlayers[_playerProfileId]
      .videoMetrics[_videoProfileId][_videoPubId].playCount;
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
        _milestone - 1
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

  function getQuestURI(uint256 _questId) public view returns (string memory) {
    return _allQuests[_questId].uri;
  }

  function getQuestGatedERC721Addresses(
    uint256 _questId
  ) public view returns (address[] memory) {
    return _allQuests[_questId].gated.erc721Addresses;
  }

  function getQuestGatedERC721TokenIds(
    uint256 _questId
  ) public view returns (uint256[][] memory) {
    return _allQuests[_questId].gated.erc721TokenIds;
  }

  function getQuestGatedERC721TokenURIs(
    uint256 _questId
  ) public view returns (string[][] memory) {
    return _allQuests[_questId].gated.erc721TokenURIs;
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

  function getMilestoneURI(
    uint256 _questId,
    uint256 _milestone
  ) public view returns (string memory) {
    return _allQuests[_questId].milestones[_milestone - 1].uri;
  }

  function getMilestoneGatedERC721Addresses(
    uint256 _questId,
    uint256 _milestone
  ) public view returns (address[] memory) {
    return
      _allQuests[_questId].milestones[_milestone - 1].gated.erc721Addresses;
  }

  function getMilestoneGatedERC721TokenIds(
    uint256 _questId,
    uint256 _milestone
  ) public view returns (uint256[][] memory) {
    return _allQuests[_questId].milestones[_milestone - 1].gated.erc721TokenIds;
  }

  function getMilestoneGatedERC721TokenURIs(
    uint256 _questId,
    uint256 _milestone
  ) public view returns (string[][] memory) {
    return
      _allQuests[_questId].milestones[_milestone - 1].gated.erc721TokenURIs;
  }

  function getMilestoneVideoLength(
    uint256 _questId,
    uint256 _milestone
  ) public view returns (uint256) {
    return _allQuests[_questId].milestones[_milestone - 1].videoLength;
  }

  function getMilestoneRewardsLength(
    uint256 _questId,
    uint256 _milestone
  ) public view returns (uint256) {
    return _allQuests[_questId].milestones[_milestone - 1].rewardsLength;
  }

  function getMilestoneVideos(
    uint256 _questId,
    uint256 _milestone
  ) public view returns (string[] memory) {
    return _allQuests[_questId].milestones[_milestone - 1].videoBytes;
  }

  function getMilestoneVideoMinPlayCount(
    uint256 _questId,
    uint256 _milestone,
    uint256 _videoProfileId,
    uint256 _videoPubId
  ) public view returns (uint256) {
    return
      _allQuests[_questId]
      .milestones[_milestone - 1]
      .videos[_videoProfileId][_videoPubId].minPlayCount;
  }

  function getMilestoneVideoMinDuration(
    uint256 _questId,
    uint256 _milestone,
    uint256 _videoProfileId,
    uint256 _videoPubId
  ) public view returns (uint256) {
    return
      _allQuests[_questId]
      .milestones[_milestone - 1]
      .videos[_videoProfileId][_videoPubId].minDuration;
  }

  function getMilestoneVideoMinSecondaryQuoteOnQuote(
    uint256 _questId,
    uint256 _milestone,
    uint256 _videoProfileId,
    uint256 _videoPubId
  ) public view returns (uint256) {
    return
      _allQuests[_questId]
      .milestones[_milestone - 1]
      .videos[_videoProfileId][_videoPubId].minSecondaryQuoteOnQuote;
  }

  function getMilestoneVideoMinSecondaryCollectOnQuote(
    uint256 _questId,
    uint256 _milestone,
    uint256 _videoProfileId,
    uint256 _videoPubId
  ) public view returns (uint256) {
    return
      _allQuests[_questId]
      .milestones[_milestone - 1]
      .videos[_videoProfileId][_videoPubId].minSecondaryCollectOnQuote;
  }

  function getMilestoneVideoMinSecondaryCommentOnQuote(
    uint256 _questId,
    uint256 _milestone,
    uint256 _videoProfileId,
    uint256 _videoPubId
  ) public view returns (uint256) {
    return
      _allQuests[_questId]
      .milestones[_milestone - 1]
      .videos[_videoProfileId][_videoPubId].minSecondaryCommentOnQuote;
  }

  function getMilestoneVideoMinSecondaryReactOnQuote(
    uint256 _questId,
    uint256 _milestone,
    uint256 _videoProfileId,
    uint256 _videoPubId
  ) public view returns (uint256) {
    return
      _allQuests[_questId]
      .milestones[_milestone - 1]
      .videos[_videoProfileId][_videoPubId].minSecondaryReactOnQuote;
  }

  function getMilestoneVideoMinSecondaryMirrorOnQuote(
    uint256 _questId,
    uint256 _milestone,
    uint256 _videoProfileId,
    uint256 _videoPubId
  ) public view returns (uint256) {
    return
      _allQuests[_questId]
      .milestones[_milestone - 1]
      .videos[_videoProfileId][_videoPubId].minSecondaryMirrorOnQuote;
  }

  function getMilestoneVideoMinSecondaryCommentOnComment(
    uint256 _questId,
    uint256 _milestone,
    uint256 _videoProfileId,
    uint256 _videoPubId
  ) public view returns (uint256) {
    return
      _allQuests[_questId]
      .milestones[_milestone - 1]
      .videos[_videoProfileId][_videoPubId].minSecondaryCommentOnComment;
  }

  function getMilestoneVideoMinSecondaryMirrorOnComment(
    uint256 _questId,
    uint256 _milestone,
    uint256 _videoProfileId,
    uint256 _videoPubId
  ) public view returns (uint256) {
    return
      _allQuests[_questId]
      .milestones[_milestone - 1]
      .videos[_videoProfileId][_videoPubId].minSecondaryMirrorOnComment;
  }

  function getMilestoneVideoMinSecondaryQuoteOnComment(
    uint256 _questId,
    uint256 _milestone,
    uint256 _videoProfileId,
    uint256 _videoPubId
  ) public view returns (uint256) {
    return
      _allQuests[_questId]
      .milestones[_milestone - 1]
      .videos[_videoProfileId][_videoPubId].minSecondaryQuoteOnComment;
  }

  function getMilestoneVideoMinSecondaryReactOnComment(
    uint256 _questId,
    uint256 _milestone,
    uint256 _videoProfileId,
    uint256 _videoPubId
  ) public view returns (uint256) {
    return
      _allQuests[_questId]
      .milestones[_milestone - 1]
      .videos[_videoProfileId][_videoPubId].minSecondaryReactOnComment;
  }

  function getMilestoneVideoMinSecondaryCollectOnComment(
    uint256 _questId,
    uint256 _milestone,
    uint256 _videoProfileId,
    uint256 _videoPubId
  ) public view returns (uint256) {
    return
      _allQuests[_questId]
      .milestones[_milestone - 1]
      .videos[_videoProfileId][_videoPubId].minSecondaryCollectOnComment;
  }

  function getMilestoneVideoQuote(
    uint256 _questId,
    uint256 _milestone,
    uint256 _videoProfileId,
    uint256 _videoPubId
  ) public view returns (bool) {
    return
      _allQuests[_questId]
      .milestones[_milestone - 1]
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
      .milestones[_milestone - 1]
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
      .milestones[_milestone - 1]
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
      .milestones[_milestone - 1]
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
      .milestones[_milestone - 1]
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
      .milestones[_milestone - 1]
      .videos[_videoProfileId][_videoPubId].minAVD;
  }

  function getMilestoneGatedOneOf(
    uint256 _questId,
    uint256 _milestone
  ) public view returns (bool) {
    return _allQuests[_questId].milestones[_milestone - 1].gated.oneOf;
  }

  function getMilestoneGatedERC20Addresses(
    uint256 _questId,
    uint256 _milestone
  ) public view returns (address[] memory) {
    return _allQuests[_questId].milestones[_milestone - 1].gated.erc20Addresses;
  }

  function getMilestoneGatedERC20Thresholds(
    uint256 _questId,
    uint256 _milestone
  ) public view returns (uint256[] memory) {
    return
      _allQuests[_questId].milestones[_milestone - 1].gated.erc20Thresholds;
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

  function getVideoBytesFromPlaybackId(
    string memory _playbackId
  ) public view returns (string memory) {
    return _idsToVideos[_playbackId].videoBytes;
  }

  function getVideoPlaybackId(
    uint256 _pubId,
    uint256 _profileId
  ) public view returns (string memory) {
    return _postToPlayback[_profileId][_pubId];
  }

  function getAddressToProfileId(
    address _playerAddress
  ) public view returns (uint256) {
    return _addressToProfile[_playerAddress];
  }

  function getQuestIdFromLensData(
    uint256 _profileId,
    uint256 _pubId
  ) public view returns (uint256) {
    return _questIdFromLensData[_profileId][_pubId];
  }
}
