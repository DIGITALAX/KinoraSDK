// SPDX-License-Identifier: UNLICENSE
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./KinoraFactory.sol";

contract KinoraAccessControl is Initializable {
  string public symbol;
  string public name;
  KinoraFactory private _kinoraFactory;
  address private _assignedPKPAddress;

  error userNotAdmin();
  error adminAlreadyExists();
  error pkpAlreadyAssigned();
  error adminDoesntExist();
  error cantRemoveSelf();

  mapping(address => bool) private _admins;

  event AdminAdded(address indexed admin);
  event AdminRemoved(address indexed admin);
  event AssignedPKPAddressUpdated(address indexed pkpAddress);

  modifier onlyAdmin() {
    if (!_admins[msg.sender]) {
      revert userNotAdmin();
    }
    _;
  }

  function initialize(
    address _pkpAddress,
    address _deployerAdmin,
    address _kinoraFactoryAddress
  ) public {
    symbol = "KAC";
    name = "KinoraAccessControl";
    _assignedPKPAddress = _pkpAddress;
    _admins[msg.sender] = true;
    _admins[_deployerAdmin] = true;
    _kinoraFactory = KinoraFactory(_kinoraFactoryAddress);
  }

  function addAdmin(address _admin) external onlyAdmin {
    if (_admins[_admin]) {
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

  function updateAssignedPKPAddress(
    address _newAssignedPKPAddress
  ) public onlyAdmin {
    if (_kinoraFactory.getKinoraIDToPKP(_newAssignedPKPAddress) != 0) {
      revert pkpAlreadyAssigned();
    }
    _assignedPKPAddress = _newAssignedPKPAddress;
    emit AssignedPKPAddressUpdated(_newAssignedPKPAddress);
  }

  function isAdmin(address _address) public view returns (bool) {
    return _admins[_address];
  }

  function getAssignedPKPAddress() public view returns (address) {
    return _assignedPKPAddress;
  }

  function getFactoryAddress() public view returns (address) {
    return address(_kinoraFactory);
  }
}
