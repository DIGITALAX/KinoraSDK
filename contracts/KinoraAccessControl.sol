// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "./KinoraErrors.sol";

contract KinoraAccessControl {
  string public symbol;
  string public name;

  mapping(address => bool) private _admins;

  event AdminAdded(address indexed admin);
  event AdminRemoved(address indexed admin);

  modifier onlyAdmin() {
    if (!_admins[msg.sender]) {
      revert KinoraErrors.OnlyAdmin();
    }
    _;
  }

  constructor() {
    symbol = "KAC";
    name = "KinoraAccessControl";
    _admins[msg.sender] = true;
  }

  function addAdmin(address _admin) external onlyAdmin {
    if (_admins[_admin]) {
      revert KinoraErrors.InvalidAddress();
    }

    _admins[_admin] = true;
    emit AdminAdded(_admin);
  }

  function removeAdmin(address _admin) external onlyAdmin {
    if (_admin == msg.sender || !_admins[_admin]) {
      revert KinoraErrors.InvalidAddress();
    }
    delete _admins[_admin];
    emit AdminRemoved(_admin);
  }

  function isAdmin(address _address) public view returns (bool) {
    return _admins[_address];
  }
}
