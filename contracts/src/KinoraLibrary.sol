// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.26;

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
        mapping(uint256 => Video) videos;
        GatingLogic gated;
        Reward[] rewards;
        uint256[] videoIds;
        string uri;
        uint256 milestone;
        uint256 videoLength;
        uint256 rewardsLength;
    }

    struct Video {
        uint256[] factoryIds;
        string playerId;
        uint256 postId;
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

    struct Quest {
        Milestone[] milestones;
        GatingLogic gated;
        address[] players;
        string uri;
        address envoker;
        Status status;
        uint256 questId;
        uint256 postId;
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
        uint256 postId;
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
        mapping(uint256 => bool) joinedQuest;
        mapping(uint256 => PlayerVideoMetrics) videoMetrics;
        mapping(uint256 => mapping(uint256 => bool)) eligibleToClaimMilestone;
        uint256[] questsJoined;
        uint256[] questsCompleted;
        uint256[] videoIds;
        address playerAddress;
        uint256 activeSince;
    }
    struct NewQuestParams {
        GatingLogic gateLogic;
        MilestoneParameter[] milestones;
        string uri;
        address envokerAddress;
        uint256 postId;
        uint256 maxPlayerCount;
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
        uint256 maxPlayerCount;
    }

    struct AggregateParams {
        uint256 avd;
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
        uint256 duration;
        bool hasQuoted;
        bool hasMirrored;
        bool hasCommented;
        bool hasBookmarked;
        bool hasReacted;
    }
}
