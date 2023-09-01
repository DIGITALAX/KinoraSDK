// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.9;

import "./KinoraAccessControl.sol";

contract KinoraMetrics {
    KinoraAccessControl private _accessControl;

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

    event AddUserPKP(address addedUserPKPAddress);
    event RemoveUserPKP(address removedUserPKPAddress);

    modifier onlyUserPKP() {
        require(
            msg.sender == _accessControl.getAssignedPKPAddress(),
            "KinoraAccessControl: Only Assigned PKP can perform this action."
        );
        _;
    }

    constructor(address _accessControlAddress) {
        _accessControl = KinoraAccessControl(_accessControlAddress);
    }

    function addUserArgumentsOnChain() public onlyUserPKP {}

    function getKinoraAccessControl() public view returns (address) {
        return address(_accessControl);
    }
}
