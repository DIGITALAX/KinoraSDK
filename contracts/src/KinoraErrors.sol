// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.26;


contract KinoraErrors {
  error OnlyAdmin();
  error InvalidLength();
  error InvalidAddress();
  error InvalidContract();
  error AlreadyInitialized();
  error OnlyCoreEnvoker();
  error UserNotMaintainer();
  error QuestClosed();
  error QuestDoesntExist();
  error InsufficientBalance();
  error PlayerNotEligible();
  error MaxPlayerCountReached();
  error MilestoneInvalid();
  error CurrencyNotWhitelisted();
  error InvalidRewardAmount();
  error KeyNotFound();
}
