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

  mapping(uint256 => string) private _tokenURIs;

  error userNotQuestParticipant();
  error userNotElegible();

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
    if (!_questParticipant) {
      revert userNotQuestParticipant();
    }
    bool _questCompleted = false;
    for (
      uint256 i = 0;
      i <
      _quest
        .getUserMilestonesCompletedPerQuest(_userPKPAddress, _questId)
        .length;
      i++
    ) {
      if (
        _quest.getUserMilestonesCompletedPerQuest(_userPKPAddress, _questId)[
          i
        ] ==
        _milestoneId &&
        _quest.getQuestMilestoneRewardType(_questId, _milestoneId) ==
        KinoraQuest.RewardType.ERC721
      ) {
        _questCompleted = true;
        break;
      }
    }

    if (!_questCompleted) {
      revert userNotElegible();
    }

    _;
  }

  event MintRewardNFT(
    uint256 indexed tokenCount,
    address userPKPAddress,
    string uri,
    uint256 questId,
    uint256 milestoneId
  );

  constructor() ERC721("Kinora721QuestReward", "KQRE") {}

  function initialize(address _questAddress, address _escrowAddress) public {
    _quest = KinoraQuest(_questAddress);
    _escrow = KinoraEscrow(_escrowAddress);
    _tokenCount = 0;
  }

  function mintRewardNFT(
    address _userPKPAddress,
    uint256 _questId,
    uint256 _milestoneId
  ) external onlyUserQuestCompleted(_userPKPAddress, _questId, _milestoneId) {
    string memory _uri = _escrow.getQuestMilestoneIdToERC721URI(
      _questId,
      _milestoneId
    );
    _mintNFT(msg.sender, _uri);
    emit MintRewardNFT(
      _tokenCount,
      _userPKPAddress,
      _uri,
      _questId,
      _milestoneId
    );
  }

  function _mintNFT(address _recipient, string memory _uri) internal {
    _tokenCount++;
    _mint(_recipient, _tokenCount);
    _setTokenURI(_tokenCount, _uri);
    _tokenURIs[_tokenCount] = _uri;
  }

  function tokenURI(
    uint256 _tokenId
  ) public view virtual override returns (string memory) {
    return _tokenURIs[_tokenId];
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
