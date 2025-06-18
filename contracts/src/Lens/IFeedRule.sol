// SPDX-License-Identifier: UNLICENSED
// Copyright (C) 2024 Lens Labs. All Rights Reserved.
pragma solidity ^0.8.26;

struct KeyValue {
    bytes32 key;
    bytes value;
}

struct Rule {
    address ruleAddress;
    bytes32 configSalt;
}

struct RuleChange {
    address ruleAddress;
    bytes32 configSalt;
    RuleConfigurationChange configurationChanges;
    RuleSelectorChange[] selectorChanges;
}

struct RuleConfigurationChange {
    bool configure;
    KeyValue[] ruleParams;
}

struct RuleSelectorChange {
    bytes4 ruleSelector;
    bool isRequired;
    bool enabled;
}

struct CreatePostParams {
    address author;
    string contentURI;
    uint256 repostedPostId;
    uint256 quotedPostId;
    uint256 repliedPostId;
    RuleChange[] ruleChanges;
    KeyValue[] extraData;
}

struct EditPostParams {
    string contentURI;
    KeyValue[] extraData;
}

interface IFeedRule {
    function configure(
        bytes32 configSalt,
        KeyValue[] calldata ruleParams
    ) external;

    function processCreatePost(
        bytes32 configSalt,
        uint256 postId,
        CreatePostParams calldata postParams,
        KeyValue[] calldata primitiveParams,
        KeyValue[] calldata ruleParams
    ) external;

    function processEditPost(
        bytes32 configSalt,
        uint256 postId,
        EditPostParams calldata postParams,
        KeyValue[] calldata primitiveParams,
        KeyValue[] calldata ruleParams
    ) external;

    function processDeletePost(
        bytes32 configSalt,
        uint256 postId,
        KeyValue[] calldata primitiveParams,
        KeyValue[] calldata ruleParams
    ) external;

    function processPostRuleChanges(
        bytes32 configSalt,
        uint256 postId,
        RuleChange[] calldata ruleChanges,
        KeyValue[] calldata ruleParams
    ) external;
}
