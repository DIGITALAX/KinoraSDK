// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.19;

import "./KinoraQuest.sol";
import "./KinoraEscrow.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract Kinora721QuestReward is ERC721URIStorage, Initializable {
  KinoraQuest private _quest;
  KinoraEscrow private _escrow;
  uint256 private _tokenCount;

  modifier onlyUserQuestCompleted(
    address _userPKPAddress,
    uint256 _questId,
    uint256 _milestoneId
  ) {
    bool _questParticipant = false;
    for (
      uint256 i = 0;
      i < _quest.getUserQuestsJoined(_userPKPAddress).length;
      i++
    ) {
      if (_quest.getUserQuestsJoined(_userPKPAddress)[i] == _questId) {
        _questParticipant = true;
        break;
      }
    }
    require(
      _questParticipant,
      "Kinora721QuestReward: User is not part of Quest."
    );
    bool _questCompleted = false;
    for (
      uint256 i = 0;
      i <
      _quest
      .getUserMilestonesCompletedPerQuest(_userPKPAddress)[_questId].length;
      i++
    ) {
      if (
        _quest.getUserMilestonesCompletedPerQuest(_userPKPAddress)[_questId][
          i
        ] == _milestoneId
      ) {
        _questCompleted = true;
        break;
      }
    }
    require(
      _questCompleted,
      "Kinora721QuestReward: Only an eligible User can mint."
    );
    _;
  }

  constructor() ERC721("Kinora721QuestReward", "KQRE") {}

  function initialize(address _questAddress, address _escrowAddress) public {
    _quest = KinoraQuest(_questAddress);
    _escrow = KinoraEscrow(_escrowAddress);
  }

  function mintRewardNFT(
    address _userPKPAddress,
    uint256 _questId,
    uint256 _milestoneId
  ) external onlyUserQuestCompleted(_userPKPAddress, _questId, _milestoneId) {
    _mintNFT(
      msg.sender,
      _escrow.getQuestMilestoneIdToERC721URI(_questId, _milestoneId)
    );
  }

  function _mintNFT(address _recipient, string memory _uri) internal {
    _tokenCount++;
    _mint(_recipient, _tokenCount);
    _setTokenURI(_tokenCount, _uri);
  }

  function getKinoraQuest() public view returns (address) {
    return address(_quest);
  }

  function getKinoraEscrow() public view returns (address) {
    return address(_escrow);
  }

  function getTokenCount() public view returns (uint256) {
    return _tokenCount;
  }
}
