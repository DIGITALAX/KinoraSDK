// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.19;

contract KinoraGlobalAccessControl {
    string public symbol;
    string public name;

    mapping(address => bool) private _admins;

    event AdminAdded(address indexed admin);
    event AdminRemoved(address indexed admin);

    modifier onlyAdmin() {
        require(
            _admins[msg.sender],
            "KinoraGlobalAccessControl: Only admins can perform this action."
        );
        _;
    }

    constructor() {
        symbol = "KGAC";
        name = "KinoraGlobalAccessControl";
        _admins[msg.sender] = true;
    }

    function addAdmin(address _admin) external onlyAdmin {
        require(
            !_admins[_admin] && _admin != msg.sender,
            "KinoraGlobalAccessControl: Cannot add existing admin or yourself."
        );
        _admins[_admin] = true;
        emit AdminAdded(_admin);
    }

    function removeAdmin(address _admin) external onlyAdmin {
        require(
            _admin != msg.sender,
            "KinoraGlobalAccessControl: Cannot remove yourself as admin."
        );
        require(
            _admins[_admin],
            "KinoraGlobalAccessControl: Admin doesn't exist."
        );
        delete _admins[_admin];
        emit AdminRemoved(_admin);
    }

    function isAdmin(address _address) public view returns (bool) {
        return _admins[_address];
    }
}
