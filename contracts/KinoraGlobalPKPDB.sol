// SPDX-License-Identifier: UNLICENSE
pragma solidity ^0.8.9;

import "./KinoraGlobalAccessControl.sol";
import "./KinoraFactory.sol";
import "./KinoraAccessControl.sol";

contract KinoraGlobalPKPDB {
  KinoraGlobalAccessControl private _globalAccessControl;
  KinoraFactory private _kinoraFactory;

  mapping(address => bool) private _userActiveAccount;

  event AddUserPKP(address addedUserPKPAddress);
  event RemoveUserPKP(address removedUserPKPAddress);
  event KinoraGlobalAccessControlUpdate(
    address newAccessControlAddress,
    address deployerAddress
  );

  modifier onlyAdmin() {
    require(
      _globalAccessControl.isAdmin(msg.sender),
      "GlobalKinoraAccessControl: Only admin can perform this action"
    );
    _;
  }

  modifier onlyFactoryPKP() {
    address _accessControl = _kinoraFactory.getDeployedKinoraAccessControlToPKP(
      msg.sender
    );
    require(
      msg.sender == KinoraAccessControl(_accessControl).getAssignedPKPAddress(),
      "KinoraFactory: Only a ."
    );
    _;
  }

  constructor(address _accessControlAddress, address _kinoraFactoryAddress) {
    _globalAccessControl = KinoraGlobalAccessControl(_accessControlAddress);
    _kinoraFactory = KinoraFactory(_kinoraFactoryAddress);
  }

  function addUserPKP(address _userPkpAddress) public onlyFactoryPKP {
    require(
      !_userActiveAccount[_userPkpAddress],
      "KinoraGlobalPKPDB: Cannot Add an Existing User."
    );

    _userActiveAccount[_userPkpAddress] = true;

    emit AddUserPKP(_userPkpAddress);
  }

  function removeUserPKP(address _userPkpAddress) public onlyAdmin {
    require(
      !_userActiveAccount[_userPkpAddress],
      "KinoraGlobalPKPDB: Cannot Remove a Non-Existent User."
    );
    delete _userActiveAccount[_userPkpAddress];
    emit RemoveUserPKP(_userPkpAddress);
  }

  function updateGlobalKinoraAccessControl(
    address _newAccessControlAddress
  ) public onlyAdmin {
    _globalAccessControl = KinoraGlobalAccessControl(_newAccessControlAddress);
    emit KinoraGlobalAccessControlUpdate(_newAccessControlAddress, msg.sender);
  }

  function userExits(address _userPKPAddress) public view returns (bool) {
    return _userActiveAccount[_userPKPAddress];
  }

  function getGlobalKinoraAccessControl() public view returns (address) {
    return address(_globalAccessControl);
  }
}
