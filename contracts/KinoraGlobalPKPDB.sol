// SPDX-License-Identifier: UNLICENSE
pragma solidity ^0.8.19;

import "./KinoraGlobalAccessControl.sol";
import "./KinoraFactory.sol";
import "./KinoraAccessControl.sol";

contract KinoraGlobalPKPDB {
  KinoraGlobalAccessControl private _globalAccessControl;
  KinoraFactory private _kinoraFactory;
  uint256 private _activeUserCount;

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
    require(
      _globalAccessControl.isAdmin(msg.sender),
      "GlobalKinoraAccessControl: Only admin can perform this action."
    );
    _;
  }

  modifier onlyFactoryPKP() {
    address _accessControl = _kinoraFactory.getDeployedKinoraAccessControlToPKP(
      msg.sender
    );
    require(
      msg.sender == KinoraAccessControl(_accessControl).getAssignedPKPAddress(),
      "KinoraFactory: Only the Assigned PKP can perform this action."
    );
    _;
  }

  constructor(address _accessControlAddress) {
    _globalAccessControl = KinoraGlobalAccessControl(_accessControlAddress);
    _activeUserCount = 0;
  }

  function addUserPKP(address _userPkpAddress) public onlyFactoryPKP {
    require(
      !_userActiveAccount[_userPkpAddress],
      "KinoraGlobalPKPDB: Cannot Add an Existing User."
    );
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
    require(
      !_userActiveAccount[_userPkpAddress],
      "KinoraGlobalPKPDB: Cannot Remove a Non-Existent User."
    );
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
