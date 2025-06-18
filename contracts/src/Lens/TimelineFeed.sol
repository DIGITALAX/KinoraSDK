// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.26;

import "./IFeedRule.sol";
import "./Ownable.sol";

contract TimelineFeed is IFeedRule {
    address private _admin;

    error NotAdmin();

    modifier onlyAdmin() {
        if (msg.sender != _admin) {
            revert NotAdmin();
        }

        _;
    }

    constructor() {
        _admin = msg.sender;
    }

    function configure(
        bytes32 configSalt,
        KeyValue[] calldata ruleParams
    ) external override {}

    function processCreatePost(
        bytes32 configSalt,
        uint256 postId,
        CreatePostParams calldata postParams,
        KeyValue[] calldata primitiveParams,
        KeyValue[] calldata ruleParams
    ) external override {
        if (Ownable(postParams.author).owner() != _admin) {
            revert NotAdmin();
        }
    }

    function processEditPost(
        bytes32 configSalt,
        uint256 postId,
        EditPostParams calldata postParams,
        KeyValue[] calldata primitiveParams,
        KeyValue[] calldata ruleParams
    ) external override {
        revert ErrorsLib.NotImplemented();
    }

    function processDeletePost(
        bytes32 configSalt,
        uint256 postId,
        KeyValue[] calldata primitiveParams,
        KeyValue[] calldata ruleParams
    ) external override {
        revert ErrorsLib.NotImplemented();
    }

    function processPostRuleChanges(
        bytes32 configSalt,
        uint256 postId,
        RuleChange[] calldata ruleChanges,
        KeyValue[] calldata ruleParams
    ) external override {
        revert ErrorsLib.NotImplemented();
    }

    function setAdmin(address admin) public onlyAdmin {
        _admin = admin;
    }
}
