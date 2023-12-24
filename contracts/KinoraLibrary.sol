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
  struct Reward {
    RewardType rewardType;
    string uri;
    address tokenAddress;
    uint256 amount;
  }
  struct Milestone {
    GatingLogic gated;
    Reward[] rewards;
    Video[] videos;
    uint256 milestone;
  }

  struct Video {
    uint256 profileId;
    uint256 pubId;
    uint256 minPlayCount;
    uint256 minCTR;
    uint256 minAVD;
    uint256 minImpressionCount;
    uint256 minEngagementCount;
    uint256 minDuration;
    bool quote;
    bool mirror;
    bool comment;
    bool bookmark;
    bool react;
    bool collect;
  }

  struct Quest {
    Milestone[] milestones;
    GatingLogic gated;
    Status status;
    uint256 profileId;
    uint256 pubId;
    uint256 milestoneCount;
    uint256 maxPlayerCount;
  }
  struct GatingLogic {
    uint256[][] erc721TokenIds;
    address[] erc721Addresses;
    address[] erc20Addresses;
    uint256[] erc20Thresholds;
    bool oneOf;
  }
  struct Player {
    mapping(uint256 => mapping(uint256 => uint256)) milestonesCompletedPerQuest;
    mapping(uint256 => uint256[]) questsJoined;
    mapping(uint256 => mapping(uint256 => bool)) joinedQuest;
    mapping(string => mapping(uint256 => PlayerLivepeerMetrics)) playbackIdMetrics;
    mapping(uint256 => mapping(uint256 => mapping(uint256 => bool))) eligibleToClaimMilestone;
    address playerAddress;
    uint256 activeSince;
  }
  struct PlayerLivepeerMetrics {
    string playbackId;
    uint256 profileId;
    bool encrypted;
  }
  struct InitializeAction {
    GatingLogic gated;
    address questEnvoker;
    uint256 maxPlayerCount;
  }
  struct InitializeDeposit {
    Milestone[] milestones;
    GatingLogic gated;
    address escrowContract;
    address questContract;
    address questEnvoker;
    uint256 maxPlayerCount;
    uint256 profileId;
    uint256 pubId;
  }
  struct MilestoneVerify {
    uint256[][] tokens;
    address[] erc721s;
    address[] erc20s;
    uint256[] thresholds;
    address playerAddress;
    uint256 playerProfileId;
    uint256 profileId;
    uint256 pubId;
    uint256 milestone;
    bool joined;
    bool oneOf;
  }
  struct TransferReward {
    address playerAddress;
    uint256 profileId;
    uint256 playerProfileId;
    uint256 pubId;
    uint256 milestone;
  }
  struct NewQuestParams {
    uint256 maxPlayerCount;
    GatingLogic gateLogic;
    Milestone[] milestones;
    address envokerAddress;
    uint256 pubId;
    uint256 profileId;
  }
}
