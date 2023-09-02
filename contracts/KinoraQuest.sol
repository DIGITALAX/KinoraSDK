// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.9;

import "./KinoraAccessControl.sol";

contract KinoraQuest {
  KinoraAccessControl private _accessControl;
  Quest[] private _quests;

  enum MilestoneStatus {
    NotCompleted,
    Completed
  }
  enum QuestStatus {
    Open,
    Closed
  }

  struct Milestone {
    string _uriDetails;
    MilestoneStatus _status;
    address _rewardToken; //ERC20 OR NFT OR ...??
    uint256 _rewardAmount;
    uint256 _numberOfPoints;
  }

  struct Quest {
    string _uriDetails;
    Milestone[] _milestones;
    address[] _participants;
    QuestStatus _status;
    uint256 _questId;
  }

  modifier onlyUserPKP() {
    require(
      msg.sender == _accessControl.getAssignedPKPAddress(),
      "KinoraAccessControl: Only Assigned PKP can perform this action."
    );
    _;
  }

  constructor(address _accessControlAddress) {
    _accessControl = KinoraAccessControl(_accessControlAddress);
  }

  function instantiateNewQuest() public onlyUserPKP {}

  function addQuestMilestone() public onlyUserPKP {
    // can only add set metrics as milestones? can be global or solo within the devs contracts, dev can choose
  }

  function removeQuestMilestone() public onlyUserPKP {}

  function terminateQuest() public onlyUserPKP {
    // don't allow for anyone else to participate in that quest 
  }

  function userJoinQuest() public onlyUserPKP {
    // user to join the quest by the devs pkp and meet the conditions set for the user, can meet any of the metrics as a condition
  }

  function userCompleteMilestone() public onlyUserPKP {

    // each user maintains a count of the milestones and must complete them in order 1 by 1 i.e. get verified in order 1 by 1
    // can put any of the metrics as a condition 
  }

  function fundQuestRewards() public onlyUserPKP {}

  function getKinoraAccessControl() public view returns (address) {
    return address(_accessControl);
  }
}
