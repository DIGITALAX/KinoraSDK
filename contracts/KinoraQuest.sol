// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.19;

import "./KinoraAccessControl.sol";
import "./KinoraEscrow.sol";

contract KinoraQuest {
  KinoraAccessControl private _accessControl;
  KinoraEscrow private _escrow;
  uint256 private _questCount;

  enum MilestoneStatus {
    NotCompleted,
    Completed
  }
  enum QuestStatus {
    Open,
    Closed
  }
  enum RewardType {
    ERC20,
    ERC721
  }

  struct Reward {
    RewardType _type;
    address _tokenAddress;
    uint256 _amountOrId;
  }
  struct Milestone {
    string _uriDetails;
    MilestoneStatus _status;
    Reward _reward;
    uint256 _numberOfPoints;
    uint256 _milestoneId;
  }
  struct Quest {
    string _uriDetails;
    Milestone[] _milestones;
    address[] _participants;
    QuestStatus _status;
    uint256 _questId;
  }

  mapping(uint256 => Quest) private _allQuests;
  mapping(address => mapping(uint256 => uint256)) private _userToQuestMilestone;

  modifier onlyUserPKP() {
    require(
      msg.sender == _accessControl.getAssignedPKPAddress(),
      "KinoraAccessControl: Only Assigned PKP can perform this action."
    );
    _;
  }

  modifier questOpen(uint256 _questId) {
    require(
      _allQuests[_questId]._status != QuestStatus.Closed,
      "KinoraQuest: Quest must have an open status."
    );
    _;
  }

  event QuestInstantiated(uint256 indexed questCount, string uriDetails);
  event QuestMilestoneAdded(uint256 indexed questId, uint256 milestoneId);
  event UserCompleteQuestMilestone(
    uint256 indexed questId,
    address userAddress
  );
  event QuestMilestoneRemoved(uint256 indexed questId, uint256 milestoneId);
  event QuestTerminated(uint256 indexed questId);
  event UserJoinQuest(uint256 indexed questId, address userAddress);

  constructor(address _accessControlAddress, address _escrowAddress) {
    _accessControl = KinoraAccessControl(_accessControlAddress);
    _escrow = KinoraEscrow(_escrowAddress);
  }

  function instantiateNewQuest(
    Milestone[] memory _initialMilestones,
    string memory _uriDetails
  ) public onlyUserPKP {
    _questCount++;
    address[] memory _emptyParticipants;

    Quest memory newQuest = Quest({
      _uriDetails: _uriDetails,
      _milestones: _initialMilestones,
      _participants: _emptyParticipants,
      _status: QuestStatus.Open,
      _questId: _questCount
    });

    _allQuests[_questCount] = newQuest;

    emit QuestInstantiated(_questCount, _uriDetails);
  }

  function addQuestMilestone(
    Reward memory _questReward,
    string memory _uriDetails,
    uint256 _questId,
    uint256 _pointCount
  ) public onlyUserPKP questOpen(_questId) {
    _allQuests[_questId]._milestones.push(
      Milestone({
        _uriDetails: _uriDetails,
        _status: MilestoneStatus.NotCompleted,
        _reward: _questReward,
        _numberOfPoints: _pointCount,
        _milestoneId: _allQuests[_questId]._milestones.length + 1
      })
    );

    emit QuestMilestoneAdded(
      _questId,
      _allQuests[_questId]._milestones.length + 1
    );
  }

  function removeQuestMilestone(
    uint256 _questId,
    uint256 _milestoneId
  ) public onlyUserPKP questOpen(_questId) {
    // need to update the milestoneids after this so its still in ascending order and no gap after the removed one!
    emit QuestMilestoneRemoved(_questId, _milestoneId);
  }

  function terminateQuest(
    uint256 _questId
  ) public onlyUserPKP questOpen(_questId) {
    _allQuests[_questId]._status = QuestStatus.Closed;

    emit QuestTerminated(_questId);
  }

  function userJoinQuest(
    uint256 _questId,
    address _userAddress
  ) public onlyUserPKP questOpen(_questId) {
    emit UserJoinQuest(_questId, _userAddress);
  }

  function userCompleteMilestone(
    uint256 _questId,
    address _userAddress
  ) public onlyUserPKP questOpen(_questId) {
    // each user maintains a count of the milestones and must complete them in order 1 by 1 i.e. get verified in order 1 by 1
    // can put any of the metrics as a condition

    emit UserCompleteQuestMilestone(_questId, _userAddress);
  }

  function getKinoraAccessControl() public view returns (address) {
    return address(_accessControl);
  }

  function getKinoraEscrow() public view returns (address) {
    return address(_escrow);
  }

  function getTotalQuestCount() public view returns (uint256) {
    return _questCount;
  }
}
