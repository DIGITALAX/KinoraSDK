// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.19;

contract KinoraGlobalAccessControl {
  string public symbol;
  string public name;

  mapping(address => bool) private _admins;

  error adminAlreadyExists();
  error userNotAdmin();
  error cantRemoveSelf();
  error adminDoesntExist();

  event AdminAdded(address indexed admin);
  event AdminRemoved(address indexed admin);

  modifier onlyAdmin() {
    if (!_admins[msg.sender]) {
      revert userNotAdmin();
    }
    _;
  }

  constructor() {
    symbol = "KGAC";
    name = "KinoraGlobalAccessControl";
    _admins[msg.sender] = true;
  }

  function addAdmin(address _admin) external onlyAdmin {
    if (_admins[_admin] || _admin == msg.sender) {
      revert adminAlreadyExists();
    }
    _admins[_admin] = true;
    emit AdminAdded(_admin);
  }

  function removeAdmin(address _admin) external onlyAdmin {
    if (_admin == msg.sender) {
      revert cantRemoveSelf();
    }
    if (!_admins[_admin]) {
      revert adminDoesntExist();
    }

    delete _admins[_admin];
    emit AdminRemoved(_admin);
  }

  function isAdmin(address _address) public view returns (bool) {
    return _admins[_address];
  }
}
