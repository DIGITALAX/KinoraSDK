// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.19;

import "./KinoraAccessControl.sol";
import "./KinoraEscrow.sol";
import "./KinoraGlobalPKPDB.sol";

contract KinoraQuest {
  KinoraAccessControl private _accessControl;
  KinoraGlobalPKPDB private _pkpDB;
  KinoraEscrow private _escrow;
  uint256 private _questCount;
  uint256 private _userCount;

  enum Status {
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
    uint256 _amount;
    uint256[] _tokenIds;
  }
  struct Milestone {
    string _uriDetails;
    Reward _reward;
    Status _status;
    uint256 _numberOfPoints;
    uint256 _milestoneId;
  }
  struct Quest {
    string _uriDetails;
    Milestone[] _milestones;
    address[] _participants;
    Status _status;
    uint256 _questId;
    uint256 _maxParticipantCount;
  }
  struct User {
    uint256[] _questsJoined;
    uint256[][] _milestonesCompletedPerQuest;
    address _userAddress;
    uint256 _userId;
  }

  mapping(uint256 => Quest) private _allQuests;
  mapping(address => User) private _allUsers;

  modifier onlyUserPKP() {
    require(
      msg.sender == _accessControl.getAssignedPKPAddress(),
      "KinoraAccessControl: Only Assigned PKP can perform this action."
    );
    _;
  }

  modifier onlyUserPKPOrAdmin() {
    require(
      msg.sender == _accessControl.getAssignedPKPAddress() ||
        _accessControl.isAdmin(msg.sender),
      "KinoraAccessControl: Only an Admin or the Assigned PKP can perform this action."
    );
    _;
  }

  modifier questOpen(uint256 _questId) {
    require(
      _allQuests[_questId]._status != Status.Closed,
      "KinoraQuest: Quest must have an open status."
    );
    _;
  }

  event QuestInstantiated(uint256 indexed questCount, string uriDetails);
  event QuestMilestoneAdded(uint256 indexed questId, uint256 milestoneId);
  event UserCompleteQuestMilestone(
    uint256 indexed questId,
    uint256 milestoneId,
    address userAddress
  );
  event QuestMilestoneRemoved(uint256 indexed questId, uint256 milestoneId);
  event QuestTerminated(uint256 indexed questId);
  event UserJoinQuest(uint256 indexed questId, address userAddress);

  constructor(
    address _accessControlAddress,
    address _escrowAddress,
    address _pkpDBAddress
  ) {
    _accessControl = KinoraAccessControl(_accessControlAddress);
    _escrow = KinoraEscrow(_escrowAddress);
    _pkpDB = KinoraGlobalPKPDB(_pkpDBAddress);
  }

  function instantiateNewQuest(
    Milestone[] memory _initialMilestones,
    string memory _uriDetails,
    uint256 _maxParticipantCount
  ) public onlyUserPKP {
    _questCount++;
    address[] memory _emptyParticipants;

    Quest memory newQuest = Quest({
      _uriDetails: _uriDetails,
      _milestones: _initialMilestones,
      _participants: _emptyParticipants,
      _status: Status.Open,
      _questId: _questCount,
      _maxParticipantCount: _maxParticipantCount
    });

    _allQuests[_questCount] = newQuest;

    emit QuestInstantiated(_questCount, _uriDetails);
  }

  function updateQuestDetails() public onlyUserPKPOrAdmin {}

  function addQuestMilestone(
    Reward memory _questReward,
    string memory _uriDetails,
    uint256 _questId,
    uint256 _pointCount
  ) public onlyUserPKP questOpen(_questId) {
    _allQuests[_questId]._milestones.push(
      Milestone({
        _uriDetails: _uriDetails,
        _reward: _questReward,
        _numberOfPoints: _pointCount,
        _milestoneId: _allQuests[_questId]._milestones.length + 1,
        _status: Status.Open
      })
    );

    emit QuestMilestoneAdded(
      _questId,
      _allQuests[_questId]._milestones.length + 1
    );
  }

  function updateMilestoneDetails() public onlyUserPKPOrAdmin {}

  function removeQuestMilestone(
    uint256 _questId,
    uint256 _milestoneId
  ) public onlyUserPKP questOpen(_questId) {
    require(
      _allQuests[_questId]._milestones[_milestoneId - 1]._status == Status.Open,
      "KinoraQuest: Milestone already Closed."
    );

    _allQuests[_questId]._milestones[_milestoneId - 1]._status = Status.Closed;

    emit QuestMilestoneRemoved(_questId, _milestoneId);
  }

  function terminateQuest(
    uint256 _questId
  ) public onlyUserPKP questOpen(_questId) {
    _allQuests[_questId]._status = Status.Closed;

    emit QuestTerminated(_questId);
  }

  function userJoinQuest(
    uint256 _questId,
    address _userAddress
  ) public onlyUserPKP questOpen(_questId) {
    require(
      _pkpDB.userExits(_userAddress),
      "KinoraQuest: User must have an active PKP account."
    );
    require(
      _allQuests[_questId]._participants.length <
        _allQuests[_questId]._maxParticipantCount,
      "KinoraQuest: Max Quest Participant Count reached."
    );

    bool _canJoinQuest = false;

    if (_allUsers[_userAddress]._userAddress == _userAddress) {
      for (
        uint256 i = 0;
        i < _allUsers[_userAddress]._questsJoined.length;
        i++
      ) {
        require(
          _allUsers[_userAddress]._questsJoined[i] != _questId,
          "KinoraQuest: User has already joined the Quest."
        );
      }
      _canJoinQuest = true;
    } else {
      _userCount++;
      uint256[][] memory _emptyMilestonesCompleted;
      uint256[] memory _emptyQuestsJoined;
      User memory _newUser = User({
        _userId: _userCount,
        _userAddress: _userAddress,
        _questsJoined: _emptyQuestsJoined,
        _milestonesCompletedPerQuest: _emptyMilestonesCompleted
      });
      _canJoinQuest = true;
      _allUsers[_userAddress] = _newUser;
    }

    if (_canJoinQuest) {
      _allUsers[_userAddress]._questsJoined.push(_questId);
      _allQuests[_questId]._participants.push(_userAddress);
    }

    emit UserJoinQuest(_questId, _userAddress);
  }

  function userCompleteMilestone(
    uint256 _questId,
    uint256 _milestoneId,
    address _userAddress
  ) public onlyUserPKP questOpen(_questId) {
    require(
      _allQuests[_questId]._milestones[_milestoneId - 1]._status == Status.Open,
      "KinoraQuest: Milestone is Closed."
    );

    bool _questParticipant = false;

    for (uint256 i = 0; i < _allUsers[_userAddress]._questsJoined.length; i++) {
      if (_allUsers[_userAddress]._questsJoined[i] == _questId) {
        _questParticipant = true;
        break;
      }
    }
    require(
      _questParticipant,
      "KinoraQuest: User must have already joined the Quest."
    );

    if (
      _allUsers[_userAddress]._milestonesCompletedPerQuest[_questId].length ==
      _milestoneId - 1
    ) {
      if (
        _allQuests[_questId]._milestones[_milestoneId - 1]._reward._type ==
        RewardType.ERC20
      ) {
        require(
          _escrow.getQuestMilestoneIdToERC20Amount(
            _allQuests[_questId]
              ._milestones[_milestoneId - 1]
              ._reward
              ._tokenAddress,
            _questId,
            _milestoneId
          ) >=
            _allQuests[_questId]._milestones[_milestoneId - 1]._reward._amount,
          "KinoraQuest: Reward not available to withdraw."
        );

        _escrow.withdrawERC20(
          _userAddress,
          _allQuests[_questId]
            ._milestones[_milestoneId - 1]
            ._reward
            ._tokenAddress,
          _allQuests[_questId]._milestones[_milestoneId - 1]._reward._amount,
          _milestoneId,
          _questId
        );
      }

      _allUsers[_userAddress]._milestonesCompletedPerQuest[_questId].push(
        _milestoneId
      );
    } else {
      revert("KinoraQuest: User not eligible to complete milestone.");
    }

    emit UserCompleteQuestMilestone(_questId, _milestoneId, _userAddress);
  }

  function getKinoraAccessControl() public view returns (address) {
    return address(_accessControl);
  }

  function getKinoraGlobalPKPDB() public view returns (address) {
    return address(_pkpDB);
  }

  function getKinoraEscrow() public view returns (address) {
    return address(_escrow);
  }

  function getTotalQuestCount() public view returns (uint256) {
    return _questCount;
  }

  function getTotalUserCount() public view returns (uint256) {
    return _userCount;
  }

  function getUserId(address _userPKPAddress) public view returns (uint256) {
    return _allUsers[_userPKPAddress]._userId;
  }

  function getUserQuestsJoined(
    address _userPKPAddress
  ) public view returns (uint256[] memory) {
    return _allUsers[_userPKPAddress]._questsJoined;
  }

  function getUserMilestonesCompletedPerQuest(
    address _userPKPAddress
  ) public view returns (uint256[][] memory) {
    return _allUsers[_userPKPAddress]._milestonesCompletedPerQuest;
  }

  function getQuestURIDetails(
    uint256 _questId
  ) public view returns (string memory) {
    return _allQuests[_questId]._uriDetails;
  }

  function getQuestParticipants(
    uint256 _questId
  ) public view returns (address[] memory) {
    return _allQuests[_questId]._participants;
  }

  function getQuestMaxParticipantCount(
    uint256 _questId
  ) public view returns (uint256) {
    return _allQuests[_questId]._maxParticipantCount;
  }

  function getQuestStatus(uint256 _questId) public view returns (Status) {
    return _allQuests[_questId]._status;
  }

  function getQuestMilestoneURIDetails(
    uint256 _questId,
    uint256 _milestoneId
  ) public view returns (string memory) {
    return _allQuests[_questId]._milestones[_milestoneId]._uriDetails;
  }

  function getQuestMilestoneNumberOfPoints(
    uint256 _questId,
    uint256 _milestoneId
  ) public view returns (uint256) {
    return _allQuests[_questId]._milestones[_milestoneId]._numberOfPoints;
  }

  function getQuestMilestoneStatus(
    uint256 _questId,
    uint256 _milestoneId
  ) public view returns (Status) {
    return _allQuests[_questId]._milestones[_milestoneId]._status;
  }

  function getQuestMilestoneRewardType(
    uint256 _questId,
    uint256 _milestoneId
  ) public view returns (RewardType) {
    return _allQuests[_questId]._milestones[_milestoneId]._reward._type;
  }

  function getQuestMilestoneRewardTokenAddress(
    uint256 _questId,
    uint256 _milestoneId
  ) public view returns (address) {
    return _allQuests[_questId]._milestones[_milestoneId]._reward._tokenAddress;
  }

  function getQuestMilestoneRewardTokenAmount(
    uint256 _questId,
    uint256 _milestoneId
  ) public view returns (uint256) {
    return _allQuests[_questId]._milestones[_milestoneId]._reward._amount;
  }

  function getQuestMilestoneRewardTokenIds(
    uint256 _questId,
    uint256 _milestoneId
  ) public view returns (uint256[] memory) {
    return _allQuests[_questId]._milestones[_milestoneId]._reward._tokenIds;
  }
}