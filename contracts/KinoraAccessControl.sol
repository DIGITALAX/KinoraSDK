// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./KinoraErrors.sol";

/**
 * @title KinoraAccessControl
 * @dev This contract manages administrative access control for the suite of Quest Contracts deployed through the Kinora Factory.
 * It contains functionalities to add, remove administrators and update critical addresses.
 */
contract KinoraAccessControl is Initializable {
  // Symbol of the access control contract
  string public symbol;
  // Name of the access control contract
  string public name;
  // Unique Lens Profile Id identifier
  uint256 private _profileId;

  // Mapping to keep track of admin addresses
  mapping(address => bool) private _admins;

  // Event emitted when a new admin is added
  event AdminAdded(address indexed admin);
  // Event emitted when an admin is removed
  event AdminRemoved(address indexed admin);

  /**
   * @dev Modifier to restrict functions to admins only
   */
  modifier onlyAdmin() {
    if (!_admins[msg.sender]) {
      revert KinoraErrors.OnlyAdmin();
    }
    _;
  }

  /**
   * @dev Initializes the contract with initial values
   * @param _deployerAdmin Address of the deployer admin
   * @param _profile Lens Profile Id
   */
  function initialize(address _deployerAdmin, uint256 _profile) public {
    symbol = "KAC";
    name = "KinoraAccessControl";
    _admins[msg.sender] = true;
    _admins[_deployerAdmin] = true;
    _profileId = _profile;
  }

  /**
   * @dev Adds a new admin
   * @param _admin Address of the new admin
   */
  function addAdmin(address _admin) external onlyAdmin {
    if (_admins[_admin]) {
      revert KinoraErrors.InvalidAddress();
    }

    _admins[_admin] = true;
    emit AdminAdded(_admin);
  }

  /**
   * @dev Removes an existing admin
   * @param _admin Address of the admin to be removed
   */
  function removeAdmin(address _admin) external onlyAdmin {
    if (_admin == msg.sender || !_admins[_admin]) {
      revert KinoraErrors.InvalidAddress();
    }
    delete _admins[_admin];
    emit AdminRemoved(_admin);
  }

  /**
   * @dev Checks if an address is an admin
   * @param _address Address to check admin status
   * @return bool Admin status of the address
   */
  function isAdmin(address _address) public view returns (bool) {
    return _admins[_address];
  }

  /**
   * @dev Fetches the Lens Profile Id
   * @return uint256 Lens Profile Id
   */
  function getProfileId() public view returns (uint256) {
    return _profileId;
  }
}
