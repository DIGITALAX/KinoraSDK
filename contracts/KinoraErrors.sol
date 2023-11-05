// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.19;

contract KinoraErrors {
  string public name;
  string public symbol;

  constructor() {
    name = "KinoraErrors";
    symbol = "KER";
  }

  error OnlyAdmin();
  error PkpExists();
  error OnlyPKP();
  error InvalidLength();
  error InvalidAddress();
  error InvalidContract();
  error UserNotMaintainer();
  error QuestClosed();
  error InsufficientBalance();
  error PlayerNotEligible();
  error MaxPlayerCountReached();
  error MilestoneInvalid();
}
