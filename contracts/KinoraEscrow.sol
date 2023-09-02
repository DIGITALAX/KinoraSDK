// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.9;

import "./KinoraAccessControl.sol";

contract KinoraEscrow {
  KinoraAccessControl private _accessControl;

  constructor(address _accessControlAddress) {
    _accessControl = KinoraAccessControl(_accessControlAddress);
  }
}
