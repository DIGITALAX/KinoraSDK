// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.9;

import "./KinoraAccessControl.sol";

contract KinoraQuest {
    KinoraAccessControl private _accessControl;

    modifier onlyAdmin() {
        require(
            _accessControl.isAdmin(msg.sender),
            "GlobalKinoraAccessControl: Only admin can perform this action"
        );
        _;
    }
    
    constructor(address _accessControlAddress) {
        _accessControl = KinoraAccessControl(_accessControlAddress);
    }
}
