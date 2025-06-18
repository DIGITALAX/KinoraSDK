// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.26;

import "./KinoraLibrary.sol";
import "./KinoraErrors.sol";
import "./KinoraEscrow.sol";
import "./KinoraMetrics.sol";
import "./KinoraAccessControl.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract KinoraQuestData is Initializable {
  KinoraAccessControl public kinoraAccess;
  KinoraMetrics public kinoraMetrics;
  KinoraEscrow public kinoraEscrow;
  address public kinoraOpenAction;
  uint256 private _questCount;
  uint256 private _playerCount;

  mapping(address => KinoraLibrary.Player) private _allPlayers;
  mapping(uint256 => KinoraLibrary.Quest) private _allQuests;
  mapping(string => uint256[]) private _idsToQuests;
  mapping(string => uint256) private _idsToVideos;
  mapping(uint256 => string) private _postToPlayback;
  mapping(uint256 => uint256) _questIdFromLensData;
  mapping(address => address) private _addressToProfile;

  event QuestInstantiated(uint256 questId, uint256 milestoneCount);
  event PlayerJoinedQuest(address playerProfile, uint256 questId);
  event PlayerMetricsUpdated(address playerProfile, uint256 videoPostId);
  event QuestDeleted(uint256 questId);
  event QuestStatusUpdated(uint256 questId, KinoraLibrary.Status status);
  event MilestoneCompleted(
    address playerProfile,
    uint256 questId,
    uint256 milestone
  );
  event QuestCompleted(address playerProfile, uint256 questId);
  event PlayerEligibleToClaimMilestone(
    address playerProfile,
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
    if (!kinoraAccess.isEnvoker(msg.sender)) {
      revert KinoraErrors.InvalidAddress();
    }
    _;
  }
  modifier onlyMaintainerOrOpenAction() {
    if (!kinoraAccess.isEnvoker(msg.sender) && msg.sender != kinoraOpenAction) {
      revert KinoraErrors.InvalidAddress();
    }
    _;
  }

  function initialize(
    address kinoraAccessAddress,
    address kinoraOpenActionAddress
  ) public initializer {
    if (address(kinoraAccess) != address(0)) {
      revert KinoraErrors.AlreadyInitialized();
    }
    _questCount = 0;
    _playerCount = 0;
    kinoraAccess = KinoraAccessControl(kinoraAccessAddress);
    kinoraOpenAction = kinoraOpenActionAddress;
  }

  function configureNewQuest(
    KinoraLibrary.NewQuestParams memory params
  ) external onlyKinoraOpenAction {
    _questCount++;
    KinoraLibrary.Quest storage newQuest = _allQuests[_questCount];
    newQuest.questId = _questCount;
    newQuest.postId = params.postId;
    newQuest.envoker = params.envokerAddress;
    newQuest.maxPlayerCount = params.maxPlayerCount;
    newQuest.status = KinoraLibrary.Status.Open;
    newQuest.gated = params.gateLogic;
    newQuest.milestoneCount = params.milestones.length;
    newQuest.uri = params.uri;

    _setMilestones(params.milestones, newQuest, _questCount);

    _questIdFromLensData[params.postId] = _questCount;

    emit QuestInstantiated(_questCount, params.milestones.length);
  }

  function joinQuest(
    address playerProfile,
    address playerAddress,
    uint256 questId
  ) external onlyKinoraOpenAction {
    if (_allPlayers[playerProfile].activeSince == 0) {
      _playerCount++;
      _allPlayers[playerProfile].playerAddress = playerAddress;
      _allPlayers[playerProfile].activeSince = block.timestamp;
      _addressToProfile[playerAddress] = playerProfile;
    }

    _allPlayers[playerProfile].questsJoined.push(questId);
    _allPlayers[playerProfile].joinedQuest[questId] = true;

    _allQuests[questId].players.push(playerProfile);

    emit PlayerJoinedQuest(playerProfile, questId);
  }

  function playerEligibleToClaim(
    address playerProfile,
    uint256 questId,
    uint256 milestone,
    bool eligible
  ) external onlyKinoraMetrics {
    _allPlayers[playerProfile].eligibleToClaimMilestone[questId][
      milestone - 1
    ] = eligible;

    emit PlayerEligibleToClaimMilestone(
      playerProfile,
      questId,
      milestone,
      eligible
    );
  }

  function completeMilestone(
    address playerProfile,
    uint256 questId
  ) external onlyKinoraOpenAction {
    uint256 _milestone = _allPlayers[playerProfile].milestonesCompletedPerQuest[
      questId
    ] + 1;

    _allPlayers[playerProfile].milestonesCompletedPerQuest[
      questId
    ] = _milestone;

    emit MilestoneCompleted(playerProfile, questId, _milestone);

    if (_milestone == _allQuests[questId].milestoneCount) {
      _allPlayers[playerProfile].questsCompleted.push(questId);
      emit QuestCompleted(playerProfile, questId);
    }
  }

  function setKinoraMetricsContract(
    address newMetricsContract
  ) external onlyMaintainerOrOpenAction {
    kinoraMetrics = KinoraMetrics(newMetricsContract);
  }

  function setKinoraOpenActionContract(
    address newOpenActionContract
  ) external onlyMaintainer {
    kinoraOpenAction = newOpenActionContract;
  }

  function setKinoraAccessContract(
    address newAccessContract
  ) external onlyMaintainer {
    kinoraAccess = KinoraAccessControl(newAccessContract);
  }

  function setKinoraEscrowContract(
    address newEscrowContract
  ) external onlyMaintainerOrOpenAction {
    kinoraEscrow = KinoraEscrow(newEscrowContract);
  }

  function updateQuestStatus(uint256 questId) external onlyKinoraEscrow {
    _allQuests[questId].status = KinoraLibrary.Status.Closed;

    emit QuestStatusUpdated(questId, _allQuests[questId].status);
  }

  function updatePlayerMetrics(
    KinoraLibrary.PlayerVideoMetrics memory metrics,
    address playerProfile
  ) external onlyKinoraMetrics {
    if (_allPlayers[playerProfile].activeSince == 0) {
      revert KinoraErrors.PlayerNotEligible();
    }

    if (_allPlayers[playerProfile].videoMetrics[metrics.postId].postId == 0) {
      string memory _playback = _postToPlayback[metrics.postId];

      _allPlayers[playerProfile].videoIds.push(_idsToVideos[_playback]);
    }

    _allPlayers[playerProfile].videoMetrics[metrics.postId] = metrics;

    emit PlayerMetricsUpdated(playerProfile, metrics.postId);
  }

  function _setMilestones(
    KinoraLibrary.MilestoneParameter[] memory milestones,
    KinoraLibrary.Quest storage newQuest,
    uint256 questId
  ) private {
    for (uint256 i = 0; i < milestones.length; i++) {
      KinoraLibrary.Milestone storage _newMilestone = newQuest
        .milestones
        .push();
      _newMilestone.milestone = i + 1;
      _newMilestone.gated = milestones[i].gated;
      _newMilestone.videoLength = milestones[i].videos.length;
      _newMilestone.rewardsLength = milestones[i].rewards.length;
      _newMilestone.uri = milestones[i].uri;

      _setRewards(_newMilestone, milestones[i]);
      _setVideos(_newMilestone, milestones[i], questId);
    }
  }

  function _setRewards(
    KinoraLibrary.Milestone storage newMilestone,
    KinoraLibrary.MilestoneParameter memory paramsMilestone
  ) private {
    for (uint j = 0; j < paramsMilestone.rewards.length; j++) {
      KinoraLibrary.Reward memory rewardMemory = paramsMilestone.rewards[j];
      KinoraLibrary.Reward storage rewardStorage = newMilestone.rewards.push();
      rewardStorage.rewardType = rewardMemory.rewardType;
      rewardStorage.uri = rewardMemory.uri;
      rewardStorage.tokenAddress = rewardMemory.tokenAddress;
      rewardStorage.amount = rewardMemory.amount;
    }
  }

  function _setVideos(
    KinoraLibrary.Milestone storage newMilestone,
    KinoraLibrary.MilestoneParameter memory paramsMilestone,
    uint256 questId
  ) private {
    uint256[] memory _videoIds = new uint256[](paramsMilestone.videos.length);

    for (uint j = 0; j < paramsMilestone.videos.length; j++) {
      KinoraLibrary.Video memory video = paramsMilestone.videos[j];
      newMilestone.videos[video.postId] = video;
      _idsToQuests[video.playerId].push(questId);
      _idsToVideos[video.playerId] = video.postId;
      _postToPlayback[video.postId] = video.playerId;
      _videoIds[j] = video.postId;
    }

    newMilestone.videoIds = _videoIds;
  }

  function deleteQuest(uint256 questId) external onlyKinoraEscrow {
    delete _allQuests[questId];

    emit QuestDeleted(questId);
  }

  function getTotalQuestCount() public view returns (uint256) {
    return _questCount;
  }

  function getTotalPlayerCount() public view returns (uint256) {
    return _playerCount;
  }

  function getPlayerQuestsCompleted(
    address playerProfile
  ) public view returns (uint256[] memory) {
    return _allPlayers[playerProfile].questsCompleted;
  }

  function getPlayerVideoAVD(
    address playerProfile,
    uint256 videoPostId
  ) public view returns (uint256) {
    return _allPlayers[playerProfile].videoMetrics[videoPostId].avd;
  }

  function getPlayerVideoSecondaryCommentOnComment(
    address playerProfile,
    uint256 videoPostId
  ) public view returns (uint256) {
    return
      _allPlayers[playerProfile]
        .videoMetrics[videoPostId]
        .secondaryCommentOnComment;
  }

  function getPlayerVideoSecondaryReactOnComment(
    address playerProfile,
    uint256 videoPostId
  ) public view returns (uint256) {
    return
      _allPlayers[playerProfile]
        .videoMetrics[videoPostId]
        .secondaryReactOnComment;
  }

  function getPlayerVideoSecondaryCollectOnComment(
    address playerProfile,
    uint256 videoPostId
  ) public view returns (uint256) {
    return
      _allPlayers[playerProfile]
        .videoMetrics[videoPostId]
        .secondaryCollectOnComment;
  }

  function getPlayerVideoSecondaryMirrorOnComment(
    address playerProfile,
    uint256 videoPostId
  ) public view returns (uint256) {
    return
      _allPlayers[playerProfile]
        .videoMetrics[videoPostId]
        .secondaryMirrorOnComment;
  }

  function getPlayerVideoSecondaryQuoteOnComment(
    address playerProfile,
    uint256 videoPostId
  ) public view returns (uint256) {
    return
      _allPlayers[playerProfile]
        .videoMetrics[videoPostId]
        .secondaryQuoteOnComment;
  }

  function getPlayerVideoSecondaryCollectOnQuote(
    address playerProfile,
    uint256 videoPostId
  ) public view returns (uint256) {
    return
      _allPlayers[playerProfile]
        .videoMetrics[videoPostId]
        .secondaryCollectOnQuote;
  }

  function getPlayerVideoSecondaryReactOnQuote(
    address playerProfile,
    uint256 videoPostId
  ) public view returns (uint256) {
    return
      _allPlayers[playerProfile]
        .videoMetrics[videoPostId]
        .secondaryReactOnQuote;
  }

  function getPlayerVideoSecondaryMirrorOnQuote(
    address playerProfile,
    uint256 videoPostId
  ) public view returns (uint256) {
    return
      _allPlayers[playerProfile]
        .videoMetrics[videoPostId]
        .secondaryMirrorOnQuote;
  }

  function getPlayerVideoSecondaryCommentOnQuote(
    address playerProfile,
    uint256 videoPostId
  ) public view returns (uint256) {
    return
      _allPlayers[playerProfile]
        .videoMetrics[videoPostId]
        .secondaryCommentOnQuote;
  }

  function getPlayerVideoSecondaryQuoteOnQuote(
    address playerProfile,
    uint256 videoPostId
  ) public view returns (uint256) {
    return
      _allPlayers[playerProfile]
        .videoMetrics[videoPostId]
        .secondaryQuoteOnQuote;
  }

  function getPlayerVideoMostReplayedArea(
    address playerProfile,
    uint256 videoPostId
  ) public view returns (string memory) {
    return
      _allPlayers[playerProfile].videoMetrics[videoPostId].mostReplayedArea;
  }

  function getPlayerVideoDuration(
    address playerProfile,
    uint256 videoPostId
  ) public view returns (uint256) {
    return _allPlayers[playerProfile].videoMetrics[videoPostId].duration;
  }

  function getPlayerVideoIds(
    address playerProfile
  ) public view returns (uint256[] memory) {
    return _allPlayers[playerProfile].videoIds;
  }

  function getPlayerVideoBookmark(
    address playerProfile,
    uint256 videoPostId
  ) public view returns (bool) {
    return _allPlayers[playerProfile].videoMetrics[videoPostId].hasBookmarked;
  }

  function getPlayerVideoComment(
    address playerProfile,
    uint256 videoPostId
  ) public view returns (bool) {
    return _allPlayers[playerProfile].videoMetrics[videoPostId].hasCommented;
  }

  function getPlayerVideoQuote(
    address playerProfile,
    uint256 videoPostId
  ) public view returns (bool) {
    return _allPlayers[playerProfile].videoMetrics[videoPostId].hasQuoted;
  }

  function getPlayerVideoMirror(
    address playerProfile,
    uint256 videoPostId
  ) public view returns (bool) {
    return _allPlayers[playerProfile].videoMetrics[videoPostId].hasMirrored;
  }

  function getPlayerVideoReact(
    address playerProfile,
    uint256 videoPostId
  ) public view returns (bool) {
    return _allPlayers[playerProfile].videoMetrics[videoPostId].hasReacted;
  }

  function getPlayerVideoPlayCount(
    address playerProfile,
    uint256 videoPostId
  ) public view returns (uint256) {
    return _allPlayers[playerProfile].videoMetrics[videoPostId].playCount;
  }

  function getPlayerMilestonesCompletedPerQuest(
    address playerProfile,
    uint256 questId
  ) public view returns (uint256) {
    return _allPlayers[playerProfile].milestonesCompletedPerQuest[questId];
  }

  function getPlayerEligibleToClaimMilestone(
    address playerProfile,
    uint256 questId,
    uint256 milestone
  ) public view returns (bool) {
    return
      _allPlayers[playerProfile].eligibleToClaimMilestone[questId][
        milestone - 1
      ];
  }

  function getPlayerActiveSince(
    address playerProfile
  ) public view returns (uint256) {
    return _allPlayers[playerProfile].activeSince;
  }

  function getPlayerAddress(
    address playerProfile
  ) public view returns (address) {
    return _allPlayers[playerProfile].playerAddress;
  }

  function getAddressToProfile(
    address playerAddress
  ) public view returns (address) {
    return _addressToProfile[playerAddress];
  }

  function getPlayerQuestsJoined(
    address playerProfile
  ) public view returns (uint256[] memory) {
    return _allPlayers[playerProfile].questsJoined;
  }

  function getPlayerHasJoinedQuest(
    address playerProfile,
    uint256 questId
  ) public view returns (bool) {
    return _allPlayers[playerProfile].joinedQuest[questId];
  }

  function getQuestEnvoker(uint256 questId) public view returns (address) {
    return _allQuests[questId].envoker;
  }

  function getQuestPlayers(
    uint256 questId
  ) public view returns (address[] memory) {
    return _allQuests[questId].players;
  }

  function getQuestMaxPlayerCount(
    uint256 questId
  ) public view returns (uint256) {
    return _allQuests[questId].maxPlayerCount;
  }

  function getQuestStatus(
    uint256 questId
  ) public view returns (KinoraLibrary.Status) {
    return _allQuests[questId].status;
  }

  function getMilestoneCount(uint256 questId) public view returns (uint256) {
    return _allQuests[questId].milestoneCount;
  }

  function getQuestPostId(uint256 questId) public view returns (uint256) {
    return _allQuests[questId].postId;
  }

  function getQuestURI(uint256 questId) public view returns (string memory) {
    return _allQuests[questId].uri;
  }

  function getQuestGatedERC721Addresses(
    uint256 questId
  ) public view returns (address[] memory) {
    return _allQuests[questId].gated.erc721Addresses;
  }

  function getQuestGatedERC721TokenIds(
    uint256 questId
  ) public view returns (uint256[][] memory) {
    return _allQuests[questId].gated.erc721TokenIds;
  }

  function getQuestGatedERC721TokenURIs(
    uint256 questId
  ) public view returns (string[][] memory) {
    return _allQuests[questId].gated.erc721TokenURIs;
  }

  function getQuestGatedOneOf(uint256 questId) public view returns (bool) {
    return _allQuests[questId].gated.oneOf;
  }

  function getQuestGatedERC20Addresses(
    uint256 questId
  ) public view returns (address[] memory) {
    return _allQuests[questId].gated.erc20Addresses;
  }

  function getQuestGatedERC20Thresholds(
    uint256 questId
  ) public view returns (uint256[] memory) {
    return _allQuests[questId].gated.erc20Thresholds;
  }

  function getMilestoneURI(
    uint256 questId,
    uint256 milestone
  ) public view returns (string memory) {
    return _allQuests[questId].milestones[milestone - 1].uri;
  }

  function getMilestoneGatedERC721Addresses(
    uint256 questId,
    uint256 milestone
  ) public view returns (address[] memory) {
    return _allQuests[questId].milestones[milestone - 1].gated.erc721Addresses;
  }

  function getMilestoneGatedERC721TokenIds(
    uint256 questId,
    uint256 milestone
  ) public view returns (uint256[][] memory) {
    return _allQuests[questId].milestones[milestone - 1].gated.erc721TokenIds;
  }

  function getMilestoneGatedERC721TokenURIs(
    uint256 questId,
    uint256 milestone
  ) public view returns (string[][] memory) {
    return _allQuests[questId].milestones[milestone - 1].gated.erc721TokenURIs;
  }

  function getMilestoneVideoLength(
    uint256 questId,
    uint256 milestone
  ) public view returns (uint256) {
    return _allQuests[questId].milestones[milestone - 1].videoLength;
  }

  function getMilestoneRewardsLength(
    uint256 questId,
    uint256 milestone
  ) public view returns (uint256) {
    return _allQuests[questId].milestones[milestone - 1].rewardsLength;
  }

  function getMilestoneVideos(
    uint256 questId,
    uint256 milestone
  ) public view returns (uint256[] memory) {
    return _allQuests[questId].milestones[milestone - 1].videoIds;
  }

  function getMilestoneVideoMinPlayCount(
    uint256 questId,
    uint256 milestone,
    uint256 videoPostId
  ) public view returns (uint256) {
    return
      _allQuests[questId]
        .milestones[milestone - 1]
        .videos[videoPostId]
        .minPlayCount;
  }

  function getMilestoneVideoMinDuration(
    uint256 questId,
    uint256 milestone,
    uint256 videoPostId
  ) public view returns (uint256) {
    return
      _allQuests[questId]
        .milestones[milestone - 1]
        .videos[videoPostId]
        .minDuration;
  }

  function getMilestoneVideoMinSecondaryQuoteOnQuote(
    uint256 questId,
    uint256 milestone,
    uint256 videoPostId
  ) public view returns (uint256) {
    return
      _allQuests[questId]
        .milestones[milestone - 1]
        .videos[videoPostId]
        .minSecondaryQuoteOnQuote;
  }

  function getMilestoneVideoMinSecondaryCollectOnQuote(
    uint256 questId,
    uint256 milestone,
    uint256 videoPostId
  ) public view returns (uint256) {
    return
      _allQuests[questId]
        .milestones[milestone - 1]
        .videos[videoPostId]
        .minSecondaryCollectOnQuote;
  }

  function getMilestoneVideoMinSecondaryCommentOnQuote(
    uint256 questId,
    uint256 milestone,
    uint256 videoPostId
  ) public view returns (uint256) {
    return
      _allQuests[questId]
        .milestones[milestone - 1]
        .videos[videoPostId]
        .minSecondaryCommentOnQuote;
  }

  function getMilestoneVideoMinSecondaryReactOnQuote(
    uint256 questId,
    uint256 milestone,
    uint256 videoPostId
  ) public view returns (uint256) {
    return
      _allQuests[questId]
        .milestones[milestone - 1]
        .videos[videoPostId]
        .minSecondaryReactOnQuote;
  }

  function getMilestoneVideoMinSecondaryMirrorOnQuote(
    uint256 questId,
    uint256 milestone,
    uint256 videoPostId
  ) public view returns (uint256) {
    return
      _allQuests[questId]
        .milestones[milestone - 1]
        .videos[videoPostId]
        .minSecondaryMirrorOnQuote;
  }

  function getMilestoneVideoMinSecondaryCommentOnComment(
    uint256 questId,
    uint256 milestone,
    uint256 videoPostId
  ) public view returns (uint256) {
    return
      _allQuests[questId]
        .milestones[milestone - 1]
        .videos[videoPostId]
        .minSecondaryCommentOnComment;
  }

  function getMilestoneVideoMinSecondaryMirrorOnComment(
    uint256 questId,
    uint256 milestone,
    uint256 videoPostId
  ) public view returns (uint256) {
    return
      _allQuests[questId]
        .milestones[milestone - 1]
        .videos[videoPostId]
        .minSecondaryMirrorOnComment;
  }

  function getMilestoneVideoMinSecondaryQuoteOnComment(
    uint256 questId,
    uint256 milestone,
    uint256 videoPostId
  ) public view returns (uint256) {
    return
      _allQuests[questId]
        .milestones[milestone - 1]
        .videos[videoPostId]
        .minSecondaryQuoteOnComment;
  }

  function getMilestoneVideoMinSecondaryReactOnComment(
    uint256 questId,
    uint256 milestone,
    uint256 videoPostId
  ) public view returns (uint256) {
    return
      _allQuests[questId]
        .milestones[milestone - 1]
        .videos[videoPostId]
        .minSecondaryReactOnComment;
  }

  function getMilestoneVideoMinSecondaryCollectOnComment(
    uint256 questId,
    uint256 milestone,
    uint256 videoPostId
  ) public view returns (uint256) {
    return
      _allQuests[questId]
        .milestones[milestone - 1]
        .videos[videoPostId]
        .minSecondaryCollectOnComment;
  }

  function getMilestoneVideoQuote(
    uint256 questId,
    uint256 milestone,
    uint256 videoPostId
  ) public view returns (bool) {
    return
      _allQuests[questId].milestones[milestone - 1].videos[videoPostId].quote;
  }

  function getMilestoneVideoMirror(
    uint256 questId,
    uint256 milestone,
    uint256 videoPostId
  ) public view returns (bool) {
    return
      _allQuests[questId].milestones[milestone - 1].videos[videoPostId].mirror;
  }

  function getMilestoneVideoBookmark(
    uint256 questId,
    uint256 milestone,
    uint256 videoPostId
  ) public view returns (bool) {
    return
      _allQuests[questId]
        .milestones[milestone - 1]
        .videos[videoPostId]
        .bookmark;
  }

  function getMilestoneVideoReact(
    uint256 questId,
    uint256 milestone,
    uint256 videoPostId
  ) public view returns (bool) {
    return
      _allQuests[questId].milestones[milestone - 1].videos[videoPostId].react;
  }

  function getMilestoneVideoComment(
    uint256 questId,
    uint256 milestone,
    uint256 videoPostId
  ) public view returns (bool) {
    return
      _allQuests[questId].milestones[milestone - 1].videos[videoPostId].comment;
  }

  function getMilestoneVideoMinAVD(
    uint256 questId,
    uint256 milestone,
    uint256 videoPostId
  ) public view returns (uint256) {
    return
      _allQuests[questId].milestones[milestone - 1].videos[videoPostId].minAVD;
  }

  function getMilestoneVideoFactoryIds(
    uint256 questId,
    uint256 milestone,
    uint256 videoPostId
  ) public view returns (uint256[] memory) {
    return
      _allQuests[questId]
        .milestones[milestone - 1]
        .videos[videoPostId]
        .factoryIds;
  }

  function getMilestoneGatedOneOf(
    uint256 questId,
    uint256 milestone
  ) public view returns (bool) {
    return _allQuests[questId].milestones[milestone - 1].gated.oneOf;
  }

  function getMilestoneGatedERC20Addresses(
    uint256 questId,
    uint256 milestone
  ) public view returns (address[] memory) {
    return _allQuests[questId].milestones[milestone - 1].gated.erc20Addresses;
  }

  function getMilestoneGatedERC20Thresholds(
    uint256 questId,
    uint256 milestone
  ) public view returns (uint256[] memory) {
    return _allQuests[questId].milestones[milestone - 1].gated.erc20Thresholds;
  }

  function getMilestoneRewardType(
    uint256 questId,
    uint256 rewardIndex,
    uint256 milestone
  ) public view returns (KinoraLibrary.RewardType) {
    return
      _allQuests[questId]
        .milestones[milestone - 1]
        .rewards[rewardIndex]
        .rewardType;
  }

  function getMilestoneRewardTokenAddress(
    uint256 questId,
    uint256 rewardIndex,
    uint256 milestone
  ) public view returns (address) {
    return
      _allQuests[questId]
        .milestones[milestone - 1]
        .rewards[rewardIndex]
        .tokenAddress;
  }

  function getMilestoneRewardTokenAmount(
    uint256 questId,
    uint256 rewardIndex,
    uint256 milestone
  ) public view returns (uint256) {
    return
      _allQuests[questId].milestones[milestone - 1].rewards[rewardIndex].amount;
  }

  function getMilestoneRewardURI(
    uint256 questId,
    uint256 rewardIndex,
    uint256 milestone
  ) public view returns (string memory) {
    return
      _allQuests[questId].milestones[milestone - 1].rewards[rewardIndex].uri;
  }

  function getQuestIdsToVideoPlaybackId(
    string memory playbackId
  ) public view returns (uint256[] memory) {
    return _idsToQuests[playbackId];
  }

  function getVideoPostIdFromPlaybackId(
    string memory playbackId
  ) public view returns (uint256) {
    return _idsToVideos[playbackId];
  }

  function getVideoPlaybackId(
    uint256 postId
  ) public view returns (string memory) {
    return _postToPlayback[postId];
  }

  function getQuestIdFromLensData(
    uint256 postId
  ) public view returns (uint256) {
    return _questIdFromLensData[postId];
  }

  function getLensDataFromQuestId(
    uint256 questId
  ) public view returns (uint256) {
    return _allQuests[questId].postId;
  }

  function symbol() public pure returns (string memory) {
    return "KQD";
  }

  function name() public pure returns (string memory) {
    return "KinoraQuestData";
  }
}
