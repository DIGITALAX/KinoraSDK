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
    Reward reward;
    string completionCondition;
    bytes32 completionHash;
    uint256 numberOfPoints;
    uint256 milestone;
  }
  struct Quest {
    Milestone[] milestones;
    uint256[] players;
    bytes32 joinHash;
    Status status;
    uint256 profileId;
    uint256 pubId;
    uint256 milestoneCount;
    uint256 maxPlayerCount;
  }
  struct Player {
    mapping(uint256 => mapping(uint256 => uint256)) milestonesCompletedPerQuest;
    mapping(uint256 => uint256[]) questsJoined;
    mapping(uint256 => mapping(uint256 => bool)) joinedQuest;
    mapping(uint256 => mapping(uint256 => mapping(string => PlayerLivePeerMetrics))) playbackIdMetrics;
    mapping(uint256 => mapping(uint256 => mapping(uint256 => bool))) elegibleToClaimMilestone;
    address playerAddress;
    uint256 activeSince;
    uint256 totalPointCount;
  }
  struct PlayerLivePeerMetrics {
    string playbackId;
    string metricJSONHash;
    uint256 profileId;
    uint256 pubId;
    bool encrypted;
  }
  struct InitializeAction {
    address questInvokerPKP;
    address questInvoker;
    bytes32 joinHash;
    uint256 maxPlayerCount;
  }
  struct InitializeDeposit {
    Milestone[] milestones;
    bytes32 joinHash;
    address escrowContract;
    address questContract;
    address questInvoker;
    uint256 maxPlayerCount;
    uint256 profileId;
    uint256 pubId;
  }
}
