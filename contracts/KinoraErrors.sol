// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.19;

contract KinoraErrors {
  error OnlyAdmin();
  error InvalidLength();
  error InvalidAddress();
  error InvalidContract();
  error UserNotMaintainer();
  error QuestClosed();
  error InsufficientBalance();
  error PlayerNotEligible();
  error MaxPlayerCountReached();
  error MilestoneInvalid();
  error CurrencyNotWhitelisted();
  error InvalidRewardAmount();
}
