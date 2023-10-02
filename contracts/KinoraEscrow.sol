// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.19;

import "./KinoraAccessControl.sol";
import "./KinoraQuest.sol";
import "./Kinora721QuestReward.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract KinoraEscrow is Initializable {
  KinoraAccessControl private _accessControl;
  KinoraQuest private _quest;
  address private _factory;
  Kinora721QuestReward private _721QuestReward;

  error onlyAdminOrQuest();
  error questDoesntExist();
  error tokenAlreadyExists();
  error tokenDoesntExist();
  error onlyAdminOrPKP();
  error onlyKinoraFactory();
  error insufficientBalance();

  struct ERC20Token {
    uint256 _amount;
    bool _tokenExists;
  }

  struct ERC721Token {
    string _uri;
    bool _tokenExists;
  }

  function initialize(
    address _accessControlAddress,
    address _factoryAddress
  ) public {
    _accessControl = KinoraAccessControl(_accessControlAddress);
    _factory = _factoryAddress;
  }

  mapping(uint256 => mapping(uint256 => mapping(address => ERC20Token)))
    private _questMilestoneIdToERC20Deposit;
  mapping(uint256 => mapping(uint256 => ERC721Token))
    private _questMilestoneIdToERC721Deposit;

  modifier onlyAdminOrKinoraQuest() {
    if (!_accessControl.isAdmin(msg.sender) && msg.sender != address(_quest)) {
      revert onlyAdminOrQuest();
    }
    _;
  }

  modifier onlyPKPOrAdmin() {
    if (
      !_accessControl.isAdmin(msg.sender) &&
      msg.sender != _accessControl.getAssignedPKPAddress()
    ) {
      revert onlyAdminOrPKP();
    }
    _;
  }

  modifier onlyFactory() {
    if (msg.sender != _factory) {
      revert onlyKinoraFactory();
    }

    _;
  }

  event ERC20Deposited(
    address indexed tokenAddress,
    uint256 amount,
    uint256 questId,
    uint256 milestoneId
  );
  event ERC721URISet(string uri, uint256 questId, uint256 milestoneId);
  event ERC20DepositUpdated(
    address indexed tokenAddress,
    uint256 amount,
    uint256 questId,
    uint256 milestoneId
  );
  event ERC721URISetUpdated(string uri, uint256 questId, uint256 milestoneId);
  event ERC20Withdrawn(
    address indexed user,
    address indexed tokenAddress,
    uint256 amount,
    uint256 questId,
    uint256 milestoneId
  );

  function depositERC20(
    address _tokenAddress,
    uint256 _amount,
    uint256 _questId,
    uint256 _milestoneId
  ) public onlyPKPOrAdmin {
    if (_quest.getQuestId(_questId) == 0) {
      revert questDoesntExist();
    }
    if (
      _questMilestoneIdToERC20Deposit[_questId][_milestoneId][_tokenAddress]
        ._tokenExists
    ) {
      revert tokenAlreadyExists();
    }
    IERC20(_tokenAddress).transferFrom(msg.sender, address(this), _amount);

    _questMilestoneIdToERC20Deposit[_questId][_milestoneId][
      _tokenAddress
    ] = ERC20Token({_tokenExists: true, _amount: _amount});

    emit ERC20Deposited(_tokenAddress, _amount, _questId, _milestoneId);
  }

  function updateDepositERC20(
    address _tokenAddress,
    uint256 _questId,
    uint256 _milestoneId,
    uint256 _amount
  ) public onlyPKPOrAdmin {
    if (
      !_questMilestoneIdToERC20Deposit[_questId][_milestoneId][_tokenAddress]
        ._tokenExists
    ) {
      revert tokenDoesntExist();
    }

    IERC20(_tokenAddress).transferFrom(msg.sender, address(this), _amount);

    _questMilestoneIdToERC20Deposit[_questId][_milestoneId][
      _tokenAddress
    ] = ERC20Token({_tokenExists: true, _amount: _amount});

    emit ERC20DepositUpdated(_tokenAddress, _amount, _questId, _milestoneId);
  }

  function withdrawERC20(
    address _userAddress,
    address _tokenAddress,
    uint256 _amount,
    uint256 _milestoneId,
    uint256 _questId
  ) public onlyAdminOrKinoraQuest {
    if (
      _questMilestoneIdToERC20Deposit[_questId][_milestoneId][_tokenAddress]
        ._amount < _amount
    ) {
      revert insufficientBalance();
    }

    IERC20(_tokenAddress).transfer(_userAddress, _amount);

    _questMilestoneIdToERC20Deposit[_questId][_milestoneId][_tokenAddress]
      ._amount -= _amount;

    emit ERC20Withdrawn(
      _userAddress,
      _tokenAddress,
      _amount,
      _questId,
      _milestoneId
    );
  }

  function depositERC721(
    string memory _uri,
    uint256 _questId,
    uint256 _milestoneId
  ) public onlyPKPOrAdmin {
    if (_quest.getQuestId(_questId) == 0) {
      revert questDoesntExist();
    }
    if (_questMilestoneIdToERC721Deposit[_questId][_milestoneId]._tokenExists) {
      revert tokenAlreadyExists();
    }

    _questMilestoneIdToERC721Deposit[_questId][_milestoneId] = ERC721Token({
      _tokenExists: true,
      _uri: _uri
    });

    emit ERC721URISet(_uri, _questId, _milestoneId);
  }

  function updateDepositERC721(
    string memory _uri,
    uint256 _questId,
    uint256 _milestoneId
  ) public onlyPKPOrAdmin {
    if (
      !_questMilestoneIdToERC721Deposit[_questId][_milestoneId]._tokenExists
    ) {
      revert tokenDoesntExist();
    }

    _questMilestoneIdToERC721Deposit[_questId][_milestoneId]._uri = _uri;

    emit ERC721URISetUpdated(_uri, _questId, _milestoneId);
  }

  function setKinoraQuest(address _questContract) public onlyFactory {
    _quest = KinoraQuest(_questContract);
  }

  function setKinora721QuestReward(
    address _questRewardContract
  ) public onlyFactory {
    _721QuestReward = Kinora721QuestReward(_questRewardContract);
  }

  function getKinoraAccessControl() public view returns (address) {
    return address(_accessControl);
  }

  function getKinoraQuest() public view returns (address) {
    return address(_quest);
  }

  function getKinora721QuestReward() public view returns (address) {
    return address(_721QuestReward);
  }

  function getKinoraFactory() public view returns (address) {
    return _factory;
  }

  function getQuestMilestoneIdToERC20Amount(
    address _tokenAddress,
    uint256 _questId,
    uint256 _milestoneId
  ) public view returns (uint256) {
    return
      _questMilestoneIdToERC20Deposit[_questId][_milestoneId][_tokenAddress]
        ._amount;
  }

  function getQuestMilestoneIdToERC20Exists(
    address _tokenAddress,
    uint256 _questId,
    uint256 _milestoneId
  ) public view returns (bool) {
    return
      _questMilestoneIdToERC20Deposit[_questId][_milestoneId][_tokenAddress]
        ._tokenExists;
  }

  function getQuestMilestoneIdToERC721Exists(
    uint256 _questId,
    uint256 _milestoneId
  ) public view returns (bool) {
    return
      _questMilestoneIdToERC721Deposit[_questId][_milestoneId]._tokenExists;
  }

  function getQuestMilestoneIdToERC721URI(
    uint256 _questId,
    uint256 _milestoneId
  ) public view returns (string memory) {
    return _questMilestoneIdToERC721Deposit[_questId][_milestoneId]._uri;
  }
}
