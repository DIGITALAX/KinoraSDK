// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.19;

import "./KinoraAccessControl.sol";
import "./KinoraEscrow.sol";
import "./KinoraGlobalPKPDB.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "hardhat/console.sol";

contract KinoraQuest is Initializable {
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
    bytes32 _completionHash;
    uint256 _numberOfPoints;
    uint256 _milestoneId;
  }
  struct Quest {
    string _uriDetails;
    Milestone[] _milestones;
    address[] _participants;
    Status _status;
    bytes32 _joinHash;
    uint256 _questId;
    uint256 _maxParticipantCount;
  }
  struct User {
    uint256[] _questsJoined;
    mapping(uint256 => uint256[]) _milestonesCompletedPerQuest;
    address _userPKPAddress;
    uint256 _userId;
  }

  mapping(uint256 => Quest) private _allQuests;
  mapping(address => User) private _allUsers;

  modifier onlyDeveloperPKP() {
    require(
      msg.sender == _accessControl.getAssignedPKPAddress(),
      "KinoraQuest: Only Assigned PKP can perform this action."
    );
    _;
  }

  modifier onlyDeveloperPKPOrAdmin() {
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

  event QuestInstantiated(
    uint256 indexed questCount,
    string uriDetails,
    bytes32 joinHash
  );
  event QuestMilestoneAdded(
    uint256 indexed questId,
    uint256 milestoneId,
    bytes32 completionHash
  );
  event QuestMilestoneUpdated(
    uint256 indexed questId,
    uint256 milestoneId,
    bytes32 completionHash
  );
  event QuestUpdated(
    uint256 indexed questId,
    string newUriDetails,
    bytes32 joinHash
  );
  event UserCompleteQuestMilestone(
    uint256 indexed questId,
    uint256 milestoneId,
    address userAddress
  );
  event QuestStatusUpdated(uint256 indexed questId, Status status);
  event QuestMilestoneRemoved(uint256 indexed questId, uint256 milestoneId);
  event QuestTerminated(uint256 indexed questId);
  event UserJoinQuest(uint256 indexed questId, address userAddress);
  event JoinHashesUpdated(bytes32[] newJoinHashes);
  event CompletionHashesUpdated(bytes32[] newCompletionHashes);

  function initialize(
    address _accessControlAddress,
    address _escrowAddress,
    address _pkpDBAddress
  ) public {
    _accessControl = KinoraAccessControl(_accessControlAddress);
    _escrow = KinoraEscrow(_escrowAddress);
    _pkpDB = KinoraGlobalPKPDB(_pkpDBAddress);
    _userCount = 0;
    _questCount = 0;
  }

  function instantiateNewQuest(
    string memory _uriDetails,
    bytes32 _joinHash,
    uint256 _maxParticipantCount
  ) public onlyDeveloperPKP {
    _questCount++;
    address[] memory _emptyParticipants;
    Milestone[] memory _emptyMilestones;

    _allQuests[_questCount]._questId = _questCount;
    _allQuests[_questCount]._uriDetails = _uriDetails;
    _allQuests[_questCount]._joinHash = _joinHash;
    _allQuests[_questCount]._participants = _emptyParticipants;
    _allQuests[_questCount]._status = Status.Open;
    _allQuests[_questCount]._maxParticipantCount = _maxParticipantCount;

    for (uint256 i = 0; i < _emptyMilestones.length; i++) {
      _allQuests[_questCount]._milestones.push(_emptyMilestones[i]);
    }

    emit QuestInstantiated(_questCount, _uriDetails, _joinHash);
  }

  function updateQuestDetails(
    string memory _newURIDetails,
    Milestone[] memory _newMilestones,
    Status _newStatus,
    bytes32 _joinHash,
    uint256 _newMaxParticipantCount,
    uint256 _questId
  ) public onlyDeveloperPKPOrAdmin {
    _allQuests[_questId]._uriDetails = _newURIDetails;
    _allQuests[_questId]._status = _newStatus;
    _allQuests[_questId]._maxParticipantCount = _newMaxParticipantCount;
    _allQuests[_questId]._joinHash = _joinHash;

    delete _allQuests[_questId]._milestones;

    for (uint i = 0; i < _newMilestones.length; i++) {
      _allQuests[_questId]._milestones.push(_newMilestones[i]);
    }

    emit QuestUpdated(_questId, _newURIDetails, _joinHash);
  }

  function addQuestMilestone(
    Reward memory _questReward,
    string memory _uriDetails,
    bytes32 _completionHash,
    uint256 _questId,
    uint256 _pointCount
  ) public onlyDeveloperPKPOrAdmin questOpen(_questId) {
    require(
      _allQuests[_questId]._questId != 0,
      "KinoraQuest: Quest doesn't exist."
    );

    _allQuests[_questId]._milestones.push(
      Milestone({
        _uriDetails: _uriDetails,
        _completionHash: _completionHash,
        _reward: _questReward,
        _numberOfPoints: _pointCount,
        _milestoneId: _allQuests[_questId]._milestones.length + 1,
        _status: Status.Open
      })
    );

    emit QuestMilestoneAdded(
      _questId,
      _allQuests[_questId]
        ._milestones[_allQuests[_questId]._milestones.length - 1]
        ._milestoneId,
      _completionHash
    );
  }

  function updateMilestoneDetails(
    uint256[] memory _newTokenIds,
    string memory _newURIDetails,
    RewardType _newType,
    address _newTokenAddress,
    bytes32 _completionHash,
    uint256 _questId,
    uint256 _milestoneId,
    uint256 _newPoints,
    uint256 _newAmount
  ) public onlyDeveloperPKPOrAdmin {
    require(
      _milestoneId > 0,
      "KinoraQuest: Milestone ID should be greater than zero."
    );
    require(
      _milestoneId <= _allQuests[_questId]._milestones.length,
      "KinoraQuest: Invalid milestone ID."
    );
    require(
      _allQuests[_questId]._milestones[_milestoneId - 1]._milestoneId != 0,
      "KinoraQuest: Milestone doesn't exist for Quest."
    );

    _allQuests[_questId]
      ._milestones[_milestoneId - 1]
      ._uriDetails = _newURIDetails;
    _allQuests[_questId]
      ._milestones[_milestoneId - 1]
      ._numberOfPoints = _newPoints;
    _allQuests[_questId]
      ._milestones[_milestoneId - 1]
      ._completionHash = _completionHash;
    _allQuests[_questId]._milestones[_milestoneId - 1]._reward._type = _newType;
    _allQuests[_questId]
      ._milestones[_milestoneId - 1]
      ._reward
      ._tokenAddress = _newTokenAddress;
    _allQuests[_questId]
      ._milestones[_milestoneId - 1]
      ._reward
      ._amount = _newAmount;
    _allQuests[_questId]
      ._milestones[_milestoneId - 1]
      ._reward
      ._tokenIds = _newTokenIds;

    emit QuestMilestoneUpdated(_questId, _milestoneId, _completionHash);
  }

  function removeQuestMilestone(
    uint256 _questId,
    uint256 _milestoneId
  ) public onlyDeveloperPKPOrAdmin questOpen(_questId) {
    require(
      _allQuests[_questId]._milestones[_milestoneId - 1]._status == Status.Open,
      "KinoraQuest: Milestone already Closed."
    );

    delete _allQuests[_questId]._milestones[_milestoneId - 1];

    emit QuestMilestoneRemoved(_questId, _milestoneId);
  }

  function terminateQuest(
    uint256 _questId
  ) public onlyDeveloperPKPOrAdmin questOpen(_questId) {
    _allQuests[_questId]._status = Status.Closed;

    emit QuestTerminated(_questId);
  }

  function updateQuestStatus(
    uint256 _questId,
    Status _newStatus
  ) public onlyDeveloperPKPOrAdmin {
    _allQuests[_questId]._status = _newStatus;

    emit QuestStatusUpdated(_questId, _newStatus);
  }

  function userJoinQuest(
    uint256 _questId,
    address _userPKPAddress
  ) public onlyDeveloperPKP questOpen(_questId) {
    require(
      _pkpDB.userExists(_userPKPAddress),
      "KinoraQuest: User must have an active PKP account."
    );
    require(
      _allQuests[_questId]._participants.length <
        _allQuests[_questId]._maxParticipantCount,
      "KinoraQuest: Max Quest Participant Count reached."
    );

    bool _canJoinQuest = true;

    if (_allUsers[_userPKPAddress]._userPKPAddress == _userPKPAddress) {
      for (
        uint256 i = 0;
        i < _allUsers[_userPKPAddress]._questsJoined.length;
        i++
      ) {
        _canJoinQuest = false;
      }
    } else {
      _userCount++;
      uint256[] memory _emptyQuestsJoined;

      _allUsers[_userPKPAddress]._userId = _userCount;
      _allUsers[_userPKPAddress]._userPKPAddress = _userPKPAddress;
      _allUsers[_userPKPAddress]._questsJoined = _emptyQuestsJoined;
    }

    if (_canJoinQuest) {
      _allUsers[_userPKPAddress]._questsJoined.push(_questId);
      _allQuests[_questId]._participants.push(_userPKPAddress);
    } else {
      revert("KinoraQuest: User is not eligible to join Quest.");
    }

    emit UserJoinQuest(_questId, _userPKPAddress);
  }

  function userCompleteMilestone(
    uint256 _questId,
    uint256 _milestoneId,
    address _userPKPAddress
  ) public onlyDeveloperPKP questOpen(_questId) {
    require(
      _milestoneId > 0,
      "KinoraQuest: Milestone ID should be greater than zero."
    );
    require(
      _milestoneId <= _allQuests[_questId]._milestones.length,
      "KinoraQuest: Invalid milestone ID."
    );
    require(
      _allQuests[_questId]._milestones[_milestoneId - 1]._milestoneId != 0,
      "KinoraQuest: Milestone doesn't exist."
    );

    bool _questParticipant = false;

    for (
      uint256 i = 0;
      i < _allUsers[_userPKPAddress]._questsJoined.length;
      i++
    ) {
      if (_allUsers[_userPKPAddress]._questsJoined[i] == _questId) {
        _questParticipant = true;
        break;
      }
    }
    require(
      _questParticipant,
      "KinoraQuest: User must have already joined the Quest."
    );

    if (
      _allUsers[_userPKPAddress]._milestonesCompletedPerQuest[_questId].length <
      _milestoneId
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
          _userPKPAddress,
          _allQuests[_questId]
            ._milestones[_milestoneId - 1]
            ._reward
            ._tokenAddress,
          _allQuests[_questId]._milestones[_milestoneId - 1]._reward._amount,
          _milestoneId,
          _questId
        );
      }

      _allUsers[_userPKPAddress]._milestonesCompletedPerQuest[_questId].push(
        _milestoneId
      );
    } else {
      revert("KinoraQuest: User not eligible to complete milestone.");
    }

    emit UserCompleteQuestMilestone(_questId, _milestoneId, _userPKPAddress);
  }

  function updateAllJoinHashes(
    bytes32[] memory _newJoinHashes
  ) public onlyDeveloperPKPOrAdmin {
    require(
      _newJoinHashes.length == _questCount,
      "KinoraQuest: Join Hash array length must match the total quest count."
    );
    for (uint256 i = 0; i < _questCount; i++) {
      _allQuests[_questCount + 1]._joinHash = _newJoinHashes[i];
    }

    emit JoinHashesUpdated(_newJoinHashes);
  }

  function updateAllCompletionHashes(
    bytes32[] memory _newCompletionHashes
  ) public onlyDeveloperPKPOrAdmin {
    for (uint256 i = 0; i < _questCount; i++) {
      for (
        uint256 j = 0;
        j < _allQuests[_questCount + 1]._milestones.length;
        j++
      )
        _allQuests[_questCount + 1]
          ._milestones[j]
          ._completionHash = _newCompletionHashes[j];
    }

    emit CompletionHashesUpdated(_newCompletionHashes);
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
    address _userPKPAddress,
    uint256 _questId
  ) public view returns (uint256[] memory) {
    return _allUsers[_userPKPAddress]._milestonesCompletedPerQuest[_questId];
  }

  function getQuestURIDetails(
    uint256 _questId
  ) public view returns (string memory) {
    return _allQuests[_questId]._uriDetails;
  }

  function getQuestJoinHash(uint256 _questId) public view returns (bytes32) {
    return _allQuests[_questId]._joinHash;
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

  function getQuestId(uint256 _questId) public view returns (uint256) {
    return _allQuests[_questId]._questId;
  }

  function getQuestMilestoneCount(
    uint256 _questId
  ) public view returns (uint256) {
    return _allQuests[_questId]._milestones.length;
  }

  function getQuestMilestoneURIDetails(
    uint256 _questId,
    uint256 _milestoneId
  ) public view returns (string memory) {
    return _allQuests[_questId]._milestones[_milestoneId - 1]._uriDetails;
  }

  function getQuestMilestoneCompletionHash(
    uint256 _questId,
    uint256 _milestoneId
  ) public view returns (bytes32) {
    return _allQuests[_questId]._milestones[_milestoneId - 1]._completionHash;
  }

  function getQuestMilestoneNumberOfPoints(
    uint256 _questId,
    uint256 _milestoneId
  ) public view returns (uint256) {
    return _allQuests[_questId]._milestones[_milestoneId - 1]._numberOfPoints;
  }

  function getQuestMilestoneStatus(
    uint256 _questId,
    uint256 _milestoneId
  ) public view returns (Status) {
    return _allQuests[_questId]._milestones[_milestoneId - 1]._status;
  }

  function getQuestMilestoneRewardType(
    uint256 _questId,
    uint256 _milestoneId
  ) public view returns (RewardType) {
    return _allQuests[_questId]._milestones[_milestoneId - 1]._reward._type;
  }

  function getQuestMilestoneRewardTokenAddress(
    uint256 _questId,
    uint256 _milestoneId
  ) public view returns (address) {
    return
      _allQuests[_questId]._milestones[_milestoneId - 1]._reward._tokenAddress;
  }

  function getQuestMilestoneRewardTokenAmount(
    uint256 _questId,
    uint256 _milestoneId
  ) public view returns (uint256) {
    return _allQuests[_questId]._milestones[_milestoneId - 1]._reward._amount;
  }

  function getQuestMilestoneRewardTokenIds(
    uint256 _questId,
    uint256 _milestoneId
  ) public view returns (uint256[] memory) {
    return _allQuests[_questId]._milestones[_milestoneId - 1]._reward._tokenIds;
  }
}
