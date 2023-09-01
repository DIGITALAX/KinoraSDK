// SPDX-License-Identifier: UNLICENSE
pragma solidity ^0.8.9;

import "./KinoraGlobalAccessControl.sol";

contract KinoraGlobalPKPDB {
    KinoraGlobalAccessControl private _globalAccessControl;

    struct UserLivePeerMetrics {
        uint256 _avd;
        uint256 _crt;
        uint256 _recordingNumber;
        uint256 _assetEngagement;
        uint256 _userEngagementRatio;
        uint256 _multiStreamUsageRate;
        uint256 _taskFailureRate;
        uint256 _recordingPerSession;
    }

    mapping(address => UserLivePeerMetrics) private _pkpToUserLivePeerMetrics;
    mapping(address => bool) private _userActiveAccount;

    event AddUserPKP(address addedUserPKPAddress);
    event RemoveUserPKP(address removedUserPKPAddress);

    modifier onlyAdmin() {
        require(
            _globalAccessControl.isAdmin(msg.sender),
            "GlobalKinoraAccessControl: Only admin can perform this action"
        );
        _;
    }

    modifier onlyUserPKP() {
        require(
            _globalAccessControl.isAdmin(msg.sender),
            "GlobalKinoraAccessControl: Only admin can perform this action"
        );
        _;
    }

    constructor(address _accessControlAddress) {
        _globalAccessControl = KinoraGlobalAccessControl(_accessControlAddress);
    }

    function addUserPKP(address _pkpAddress) public {
        // MAKE THIS GLOBAL USER DB CONTRACT ???
        require(
            !_userActiveAccount[_pkpAddress],
            "KinoraPKPDB: Cannot Add an Existing User."
        );

        _userActiveAccount[_pkpAddress] = true;

        emit AddUserPKP(_pkpAddress);
    }

    function removeUserPKP(address _pkpAddress) public onlyAdmin {}

    function addUserArgumentsOnChain() public onlyUserPKP {}

    function getGlobalKinoraAccessControl() public view returns (address) {
        return address(_globalAccessControl);
    }
}
