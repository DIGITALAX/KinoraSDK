// SPDX-License-Identifier: UNLICENSE
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./KinoraFactory.sol";
import "./KinoraErrors.sol";

contract KinoraAccessControl is Initializable {
  string public symbol;
  string public name;
  KinoraFactory public kinoraFactory;
  address private _assignedPKPAddress;
  uint256 private _profileId;

  mapping(address => bool) private _admins;

  event AdminAdded(address indexed admin);
  event AdminRemoved(address indexed admin);
  event AssignedPKPAddressUpdated(address indexed pkpAddress);

  modifier onlyAdmin() {
    if (!_admins[msg.sender]) {
      revert KinoraErrors.OnlyAdmin();
    }
    _;
  }

  function initialize(
    address _pkpAddress,
    address _deployerAdmin,
    address _kinoraFactoryAddress,
    uint256 _profile
  ) public {
    symbol = "KAC";
    name = "KinoraAccessControl";
    kinoraFactory = KinoraFactory(_kinoraFactoryAddress);
    _admins[msg.sender] = true;
    _admins[_deployerAdmin] = true;
    _assignedPKPAddress = _pkpAddress;
    _profileId = _profile;
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

  function updateAssignedPKPAddress(
    address _newAssignedPKPAddress
  ) public onlyAdmin {
    if (kinoraFactory.getPKPToProfileId(_newAssignedPKPAddress) != 0) {
      revert KinoraErrors.PkpExists();
    }
    _assignedPKPAddress = _newAssignedPKPAddress;
    emit AssignedPKPAddressUpdated(_newAssignedPKPAddress);
  }

  function isAdmin(address _address) public view returns (bool) {
    return _admins[_address];
  }

  function getProfileId() public view returns (uint256) {
    return _profileId;
  }

  function getAssignedPKPAddress() public view returns (address) {
    return _assignedPKPAddress;
  }
}
