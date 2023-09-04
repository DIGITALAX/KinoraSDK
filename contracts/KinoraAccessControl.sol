// SPDX-License-Identifier: UNLICENSE
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract KinoraAccessControl is Initializable {
  string public symbol;
  string public name;
  address private _factory;
  address private _assignedPKPAddress;

  mapping(address => bool) private _admins;

  event AdminAdded(address indexed admin);
  event AdminRemoved(address indexed admin);
  event AssignedPKPAddressUpdated(address indexed pkpAddress);

  modifier onlyAdmin() {
    require(
      _admins[msg.sender],
      "KinoraAccessControl: Only admins can perform this action."
    );
    _;
  }

  modifier onlyFactory() {
    require(
      msg.sender == _factory,
      "KinoraAccessControl: Only Assigned PKP can perform this action."
    );
    _;
  }

  constructor(address _factoryAddress) {
    _factory = _factoryAddress;
  }

  function initialize(
    address _pkpAddress,
    address _deployerAdmin
  ) public onlyFactory {
    symbol = "KAC";
    name = "KinoraAccessControl";
    _assignedPKPAddress = _pkpAddress;
    _admins[_deployerAdmin] = true;
  }

  function addAdmin(address _admin) external onlyAdmin {
    require(
      !_admins[_admin] && _admin != msg.sender,
      "KinoraAccessControl: Cannot add existing admin or yourself."
    );
    _admins[_admin] = true;
    emit AdminAdded(_admin);
  }

  function removeAdmin(address _admin) external onlyAdmin {
    require(
      _admin != msg.sender,
      "KinoraAccessControl: Cannot remove yourself as admin."
    );
    require(_admins[_admin], "KinoraAccessControl: Admin doesn't exist.");
    delete _admins[_admin];
    emit AdminRemoved(_admin);
  }

  function updateAssignedPKPAddress(
    address _newAssignedPKPAddress
  ) public onlyAdmin {
    _assignedPKPAddress = _newAssignedPKPAddress;
    emit AssignedPKPAddressUpdated(_newAssignedPKPAddress);
  }

  function isAdmin(address _address) public view returns (bool) {
    return _admins[_address];
  }

  function getAssignedPKPAddress() public view returns (address) {
    return _assignedPKPAddress;
  }

  function getKinoraFactory() public view returns (address) {
    return _factory;
  }
}
