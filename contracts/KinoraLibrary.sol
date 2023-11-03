// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.19;

contract KinoraLibrary {
  string public name;
  string public symbol;

  constructor() {
    name = "KinoraLibrary";
    symbol = "KLI";
  }

  enum Status {
    Open,
    Closed
  }
  enum RewardType {
    ERC20,
    ERC721
  }

  struct Kinora {
    address[4] contracts;
    address deployer;
    uint256 profileId;
  }
  struct Reward {
    RewardType rewardType;
    address tokenAddress;
    uint256 amount;
    string uri;
  }
  struct Milestone {
    GatingLogic gated;
    Reward reward;
    string completionCriteria;
    bytes32 conditionHash;
    uint256 milestone;
  }
  struct Quest {
    Milestone[] milestones;
    GatingLogic gated;
    uint256[] players;
    Status status;
    uint256 profileId;
    uint256 pubId;
    uint256 milestoneCount;
    uint256 maxPlayerCount;
  }
  struct GatingLogic {
    address[] erc721Addresses;
    uint256[] erc721TokenIds;
    address[] erc20Addresses;
    uint256[] erc20Thresholds;
    bool oneOf;
  }
  struct Player {
    mapping(uint256 => mapping(uint256 => uint256)) milestonesCompletedPerQuest;
    mapping(uint256 => uint256[]) questsJoined;
    mapping(uint256 => mapping(uint256 => bool)) joinedQuest;
    mapping(uint256 => mapping(uint256 => mapping(string => PlayerLivepeerMetrics))) playbackIdMetrics;
    mapping(uint256 => mapping(uint256 => mapping(uint256 => bool))) eligibleToClaimMilestone;
    mapping(string => string[]) globalPlaybackIdMetrics;
    address playerAddress;
    uint256 activeSince;
  }
  struct PlayerLivepeerMetrics {
    string playbackId;
    string metricJSONHash;
    uint256 profileId;
    uint256 pubId;
    bool encrypted;
  }
  struct InitializeAction {
    GatingLogic gated;
    address questEnvokerPKP;
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
}
