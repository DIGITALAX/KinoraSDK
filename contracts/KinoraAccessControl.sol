// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.9;

contract KinoraAccessControl {
    string public symbol;
    string public name;
    address private _pkpAddress;

    mapping(address => bool) private _admins;

    event AdminAdded(address indexed admin);
    event AdminRemoved(address indexed admin);
    event PKPAddressUpdated(address indexed pkpAddress);

    modifier onlyAdmin() {
        require(
            _admins[msg.sender],
            "KinoraAccessControl: Only admins can perform this action"
        );
        _;
    }

    constructor(address _pkp, address _deployerAdmin) {
        symbol = "KAC";
        name = "KinoraAccessControl";
        _pkpAddress = _pkp;
        _admins[_deployerAdmin] = true;
    }

    function addAdmin(address _admin) external onlyAdmin {
        require(
            !_admins[_admin] && _admin != msg.sender,
            "KinoraAccessControl: Cannot add existing admin or yourself"
        );
        _admins[_admin] = true;
        emit AdminAdded(_admin);
    }

    function removeAdmin(address _admin) external onlyAdmin {
        require(
            _admin != msg.sender,
            "KinoraAccessControl: Cannot remove yourself as admin"
        );
        require(_admins[_admin], "KinoraAccessControl: Admin doesn't exist.");
        _admins[_admin] = false;
        emit AdminRemoved(_admin);
    }

    function updatePKPAddress(address _newPKPAddress) public onlyAdmin {
        _pkpAddress = _newPKPAddress;
        emit PKPAddressUpdated(_newPKPAddress);
    }

    function isAdmin(address _address) public view returns (bool) {
        return _admins[_address];
    }

    function getAssignedPKPAddress() public view returns (address) {
        return _pkpAddress;
    }
}
