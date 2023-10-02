// SPDX-License-Identifier: UNLICENSE
pragma solidity ^0.8.19;

import "./KinoraGlobalAccessControl.sol";
import "./KinoraFactory.sol";
import "./KinoraAccessControl.sol";

contract KinoraGlobalPKPDB {
  KinoraGlobalAccessControl private _globalAccessControl;
  KinoraFactory private _kinoraFactory;
  uint256 private _activeUserCount;

  error userNotAdmin();
  error onlyAssignedPKP();
  error userAlreadyExists();
  error userDoesntExist();

  struct UserPKP {
    address _userPKP;
    uint256 _userId;
    uint256 _registeredTimestamp;
  }

  mapping(address => bool) private _userActiveAccount;
  mapping(address => UserPKP) private _userPKPAccount;

  event AddUserPKP(address addedUserPKPAddress);
  event RemoveUserPKP(address removedUserPKPAddress);
  event KinoraGlobalAccessControlUpdate(
    address newAccessControlAddress,
    address deployerAddress
  );
  event KinoraFactoryUpdate(address newFactoryAddress, address deployerAddress);

  modifier onlyAdmin() {
    if (!_globalAccessControl.isAdmin(msg.sender)) {
      revert userNotAdmin();
    }

    _;
  }

  modifier onlyFactoryPKP() {
    address _accessControl = _kinoraFactory.getDeployedKinoraAccessControlToPKP(
      msg.sender
    );
    if (
      msg.sender != KinoraAccessControl(_accessControl).getAssignedPKPAddress()
    ) {
      revert onlyAssignedPKP();
    }
    _;
  }

  constructor(address _accessControlAddress) {
    _globalAccessControl = KinoraGlobalAccessControl(_accessControlAddress);
    _activeUserCount = 0;
  }

  function addUserPKP(address _userPkpAddress) public onlyFactoryPKP {
    if (_userActiveAccount[_userPkpAddress]) {
      revert userAlreadyExists();
    }
    _activeUserCount++;
    _userActiveAccount[_userPkpAddress] = true;

    UserPKP memory _newUserAccount = UserPKP({
      _userId: _activeUserCount,
      _userPKP: _userPkpAddress,
      _registeredTimestamp: block.timestamp
    });

    _userPKPAccount[_userPkpAddress] = _newUserAccount;
    emit AddUserPKP(_userPkpAddress);
  }

  function removeUserPKP(address _userPkpAddress) public onlyAdmin {
    if (!_userActiveAccount[_userPkpAddress]) {
      revert userDoesntExist();
    }
    _activeUserCount--;
    delete _userActiveAccount[_userPkpAddress];
    delete _userPKPAccount[_userPkpAddress];
    emit RemoveUserPKP(_userPkpAddress);
  }

  function updateGlobalKinoraAccessControl(
    address _newAccessControlAddress
  ) public onlyAdmin {
    _globalAccessControl = KinoraGlobalAccessControl(_newAccessControlAddress);
    emit KinoraGlobalAccessControlUpdate(_newAccessControlAddress, msg.sender);
  }

  function setKinoraFactoyAddress(address _factoryAddress) public onlyAdmin {
    _kinoraFactory = KinoraFactory(_factoryAddress);
    emit KinoraFactoryUpdate(_factoryAddress, msg.sender);
  }

  function userExists(address _userPKPAddress) public view returns (bool) {
    return _userActiveAccount[_userPKPAddress];
  }

  function getUserIdByPKP(
    address _userPKPAddress
  ) public view returns (address) {
    return _userPKPAccount[_userPKPAddress]._userPKP;
  }

  function getUserRegisteredTimestampByPKP(
    address _userPKPAddress
  ) public view returns (uint256) {
    return _userPKPAccount[_userPKPAddress]._registeredTimestamp;
  }

  function getActiveUserCount() public view returns (uint256) {
    return _activeUserCount;
  }

  function getGlobalKinoraAccessControl() public view returns (address) {
    return address(_globalAccessControl);
  }

  function getKinoraFactory() public view returns (address) {
    return address(_kinoraFactory);
  }
}
