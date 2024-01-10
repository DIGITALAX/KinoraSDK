// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.19;

contract KinoraLibrary {
  enum Status {
    Open,
    Closed
  }
  enum RewardType {
    ERC20,
    ERC721
  }
  enum TokenType {
    Collection,
    Token
  }

  struct Reward {
    RewardType rewardType;
    string uri;
    address tokenAddress;
    uint256 amount;
  }
  struct Milestone {
    GatingLogic gated;
    Reward[] rewards;
    mapping(uint256 => mapping(uint256 => Video)) videos;
    string[] videoBytes;
    string uri;
    uint256 milestone;
    uint256 videoLength;
    uint256 rewardsLength;
  }

  struct Video {
    string playerId;
    string videoBytes;
    uint256 profileId;
    uint256 pubId;
    uint256 minPlayCount;
    uint256 minAVD;
    uint256 minDuration;
    uint256 minSecondaryQuoteOnQuote;
    uint256 minSecondaryMirrorOnQuote;
    uint256 minSecondaryReactOnQuote;
    uint256 minSecondaryCommentOnQuote;
    uint256 minSecondaryCollectOnQuote;
    uint256 minSecondaryQuoteOnComment;
    uint256 minSecondaryMirrorOnComment;
    uint256 minSecondaryReactOnComment;
    uint256 minSecondaryCommentOnComment;
    uint256 minSecondaryCollectOnComment;
    bool quote;
    bool mirror;
    bool comment;
    bool bookmark;
    bool react;
  }

  struct VideoPost {
    string videoBytes;
    uint256 profileId;
    uint256 pubId;
  }

  struct Quest {
    Milestone[] milestones;
    GatingLogic gated;
    uint256[] players;
    string uri;
    address envoker;
    Status status;
    uint256 questId;
    uint256 profileId;
    uint256 pubId;
    uint256 milestoneCount;
    uint256 maxPlayerCount;
  }
  struct GatingLogic {
    string[][] erc721TokenURIs;
    uint256[][] erc721TokenIds;
    address[] erc721Addresses;
    address[] erc20Addresses;
    uint256[] erc20Thresholds;
    bool oneOf;
  }
  struct PlayerVideoMetrics {
    string mostReplayedArea;
    uint256 profileId;
    uint256 pubId;
    uint256 playCount;
    uint256 secondaryQuoteOnQuote;
    uint256 secondaryMirrorOnQuote;
    uint256 secondaryReactOnQuote;
    uint256 secondaryCommentOnQuote;
    uint256 secondaryCollectOnQuote;
    uint256 secondaryQuoteOnComment;
    uint256 secondaryMirrorOnComment;
    uint256 secondaryReactOnComment;
    uint256 secondaryCommentOnComment;
    uint256 secondaryCollectOnComment;
    uint256 avd;
    uint256 duration;
    bool hasQuoted;
    bool hasMirrored;
    bool hasCommented;
    bool hasBookmarked;
    bool hasReacted;
  }

  struct Player {
    mapping(uint256 => uint256) milestonesCompletedPerQuest;
    uint256[] questsJoined;
    uint256[] questsCompleted;
    mapping(uint256 => bool) joinedQuest;
    mapping(uint256 => mapping(uint256 => PlayerVideoMetrics)) videoMetrics;
    mapping(uint256 => mapping(uint256 => bool)) eligibleToClaimMilestone;
    string[] videoBytes;
    address playerAddress;
    uint256 activeSince;
  }
  struct NewQuestParams {
    uint256 maxPlayerCount;
    GatingLogic gateLogic;
    MilestoneParameter[] milestones;
    string uri;
    address envokerAddress;
    uint256 pubId;
    uint256 profileId;
  }
  struct MilestoneParameter {
    GatingLogic gated;
    Reward[] rewards;
    Video[] videos;
    string uri;
    uint256 milestone;
  }

  struct ActionParameters {
    MilestoneParameter[] milestones;
    GatingLogic gateLogic;
    string uri;
    address envokerAddress;
    uint256 maxPlayerCount;
  }
}
