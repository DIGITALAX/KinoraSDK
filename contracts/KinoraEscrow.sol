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

  struct ERC20Token {
    uint256 _amount;
    bool _tokenExists;
  }

  struct ERC721Token {
    uint256[] _tokenIds;
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
    require(
      _accessControl.isAdmin(msg.sender) || msg.sender == address(_quest),
      "KinoraEscrow: Only an Admin or the Quest Contract can perform this action."
    );
    _;
  }

  modifier onlyPKPOrAdmin() {
    require(
      _accessControl.isAdmin(msg.sender) ||
        msg.sender == _accessControl.getAssignedPKPAddress(),
      "KinoraEscrow: Only an Admin or the Assigned PKP can perform this action."
    );
    _;
  }

  modifier onlyFactory() {
    require(
      msg.sender == _factory,
      "KinoraEscrow: Only the Kinora Factory can perform this action."
    );
    _;
  }

  event ERC20Deposited(
    address indexed tokenAddress,
    uint256 amount,
    uint256 questId,
    uint256 milestoneId
  );
  event ERC721URISet(
    uint256[] tokenIds,
    string uri,
    uint256 questId,
    uint256 milestoneId
  );
  event ERC20DepositUpdated(
    address indexed tokenAddress,
    uint256 amount,
    uint256 questId,
    uint256 milestoneId
  );
  event ERC721URISetUpdated(
    uint256[] tokenIds,
    string uri,
    uint256 questId,
    uint256 milestoneId
  );
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
    require(
      _quest.getQuestId(_questId) != 0,
      "KinoraEscrow: Quest doesn't exist."
    );
    require(
      !_questMilestoneIdToERC20Deposit[_questId][_milestoneId][_tokenAddress]
        ._tokenExists,
      "KinoraEscrow: Token already exists, update deposit instead."
    );
    require(
      IERC20(_tokenAddress).transferFrom(msg.sender, address(this), _amount),
      "KinoraEscrow: Transfer failed."
    );

    _questMilestoneIdToERC20Deposit[_questId][_milestoneId][
      _tokenAddress
    ] = ERC20Token({_tokenExists: true, _amount: _amount});

    emit ERC20Deposited(_tokenAddress, _amount, _questId, _milestoneId);
  }

  function updateDepositERC20(
    address _receiverAddress,
    address _tokenAddress,
    uint256 _questId,
    uint256 _milestoneId,
    uint256 _amount
  ) public onlyPKPOrAdmin {
    require(
      _questMilestoneIdToERC20Deposit[_questId][_milestoneId][_tokenAddress]
        ._tokenExists,
      "KinoraEscrow: Token doesn't exist."
    );
    require(
      IERC20(_tokenAddress).transferFrom(
        address(this),
        _receiverAddress,
        _questMilestoneIdToERC20Deposit[_questId][_milestoneId][_tokenAddress]
          ._amount
      ),
      "KinoraEscrow: Transfer failed."
    );
    require(
      IERC20(_tokenAddress).transferFrom(msg.sender, address(this), _amount),
      "KinoraEscrow: Transfer failed."
    );

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
    require(
      _questMilestoneIdToERC20Deposit[_questId][_milestoneId][_tokenAddress]
        ._amount >= _amount,
      "KinoraEscrow: Insufficient balance."
    );

    require(
      IERC20(_tokenAddress).transfer(_userAddress, _amount),
      "KinoraEscrow: Transfer failed."
    );

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
    uint256[] memory _tokenIds,
    string memory _uri,
    uint256 _questId,
    uint256 _milestoneId
  ) public onlyPKPOrAdmin {
    require(
      !_questMilestoneIdToERC721Deposit[_questId][_milestoneId]._tokenExists,
      "KinoraEscrow: Token already exists, update deposit instead."
    );

    _questMilestoneIdToERC721Deposit[_questId][_milestoneId] = ERC721Token({
      _tokenExists: true,
      _tokenIds: _tokenIds,
      _uri: _uri
    });

    emit ERC721URISet(_tokenIds, _uri, _questId, _milestoneId);
  }

  function updateDepositERC721(
    uint256[] memory _tokenIds,
    string memory _uri,
    uint256 _questId,
    uint256 _milestoneId
  ) public onlyPKPOrAdmin {
    require(
      _questMilestoneIdToERC721Deposit[_questId][_milestoneId]._tokenExists,
      "KinoraEscrow: Token doesn't exist."
    );

    _questMilestoneIdToERC721Deposit[_questId][_milestoneId]
      ._tokenIds = _tokenIds;

    _questMilestoneIdToERC721Deposit[_questId][_milestoneId]._uri = _uri;

    emit ERC721URISetUpdated(_tokenIds, _uri, _questId, _milestoneId);
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

  function getQuestMilestoneIdToERC721TokenIds(
    uint256 _questId,
    uint256 _milestoneId
  ) public view returns (uint256[] memory) {
    return _questMilestoneIdToERC721Deposit[_questId][_milestoneId]._tokenIds;
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
