// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.19;

import "./KinoraAccessControl.sol";
import "./KinoraQuest.sol";
import "./KinoraLibrary.sol";
import "./KinoraNFTCreator.sol";
import "./KinoraQuestData.sol";
import "./KinoraErrors.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract KinoraEscrow is Initializable {
  string public name;
  string public symbol;
  KinoraAccessControl public accessControl;
  KinoraQuest public quest;
  KinoraQuestData public kinoraQuestData;
  KinoraNFTCreator public kinoraNFTCreator;
  address public factory;
  address public kinoraOpenAction;

  mapping(uint256 => mapping(uint256 => mapping(address => uint256)))
    private _questMilestoneERC20Deposit;
  mapping(uint256 => mapping(uint256 => string))
    private _questMilestoneERC721Deposit;

  modifier onlyOpenAction() {
    if (msg.sender != kinoraOpenAction) {
      revert KinoraErrors.InvalidContract();
    }
    _;
  }

  modifier onlyKinoraQuest() {
    if (msg.sender != address(quest)) {
      revert KinoraErrors.InvalidContract();
    }
    _;
  }

  modifier onlyFactory() {
    if (msg.sender != factory) {
      revert KinoraErrors.InvalidContract();
    }
    _;
  }

  event ERC20Deposited(
    address tokenAddress,
    uint256 amount,
    uint256 pubId,
    uint256 milestone
  );
  event ERC721URISet(string uri, uint256 pubId, uint256 milestone);
  event ERC20Withdrawn(address toAddress, uint256 pubId, uint256 milestone);
  event EmergencyERC20Withdrawn(
    address toAddress,
    uint256 pubId,
    uint256 milestone
  );
  event ERC721Minted(address playerAddress, uint256 pubId, uint256 milestone);

  function initialize(
    address _accessControlAddress,
    address _factoryAddress,
    address _kinoraQuestDataAddress,
    address _kinoraNFTCreatorAddress,
    address _kinoraOpenActionAddress
  ) public {
    name = "KinoraEscrow";
    symbol = "KES";
    accessControl = KinoraAccessControl(_accessControlAddress);
    factory = _factoryAddress;
    kinoraQuestData = KinoraQuestData(_kinoraQuestDataAddress);
    kinoraNFTCreator = KinoraNFTCreator(_kinoraNFTCreatorAddress);
    kinoraOpenAction = _kinoraOpenActionAddress;
  }

  function depositERC20(
    address _tokenAddress,
    address _fromAddress,
    uint256 _amount,
    uint256 _pubId,
    uint256 _milestone
  ) external onlyOpenAction {
    IERC20(_tokenAddress).transferFrom(_fromAddress, address(this), _amount);

    _questMilestoneERC20Deposit[_pubId][_milestone][_tokenAddress] = _amount;

    emit ERC20Deposited(_tokenAddress, _amount, _pubId, _milestone);
  }

  function withdrawERC20(
    address _toAddress,
    uint256 _pubId,
    uint256 _milestone
  ) external onlyKinoraQuest {
    uint256 _profileId = accessControl.getProfileId();
    if (
      kinoraQuestData.getQuestStatus(_profileId, _pubId) !=
      KinoraLibrary.Status.Open
    ) {
      revert KinoraErrors.QuestClosed();
    }

    _erc20Transfer(_toAddress, _pubId, _milestone, _profileId);

    emit ERC20Withdrawn(_toAddress, _pubId, _milestone);
  }

  function emergencyWithdrawERC20(
    address _toAddress,
    uint256 _pubId,
    uint256 _milestone
  ) public {
    if (!accessControl.isAdmin(msg.sender)) {
      revert KinoraErrors.OnlyAdmin();
    }
    uint256 _profileId = accessControl.getProfileId();

    _erc20Transfer(_toAddress, _pubId, _milestone, _profileId);

    kinoraQuestData.updateQuestStatus(_profileId, _pubId);

    emit EmergencyERC20Withdrawn(_toAddress, _pubId, _milestone);
  }

  function depositERC721(
    string memory _uri,
    uint256 _pubId,
    uint256 _milestone
  ) external onlyOpenAction {
    _questMilestoneERC721Deposit[_pubId][_milestone] = _uri;

    emit ERC721URISet(_uri, _pubId, _milestone);
  }

  function mintERC721(
    address _playerAddress,
    uint256 _profileId,
    uint256 _pubId,
    uint256 _milestone
  ) external onlyKinoraQuest {
    kinoraNFTCreator.mintToken(
      _questMilestoneERC721Deposit[_pubId][_milestone],
      _playerAddress,
      _profileId,
      _pubId
    );

    emit ERC721Minted(_playerAddress, _pubId, _milestone);
  }

  function setKinoraQuest(address _questContract) public onlyFactory {
    quest = KinoraQuest(_questContract);
  }

  function _erc20Transfer(
    address _toAddress,
    uint256 _pubId,
    uint256 _milestone,
    uint256 _profileId
  ) internal {
    uint256 _amount = kinoraQuestData.getQuestMilestoneRewardTokenAmount(
      _profileId,
      _pubId,
      _milestone
    );
    address _tokenAddress = kinoraQuestData.getQuestMilestoneRewardTokenAddress(
      _profileId,
      _pubId,
      _milestone
    );

    if (_questMilestoneERC20Deposit[_pubId][_milestone][_toAddress] < _amount) {
      revert KinoraErrors.InsufficientBalance();
    }

    IERC20(_tokenAddress).transfer(_toAddress, _amount);

    _questMilestoneERC20Deposit[_pubId][_milestone][_tokenAddress] -= _amount;
  }

  function getQuestMilestoneERC20Amount(
    address _tokenAddress,
    uint256 _pubId,
    uint256 _milestone
  ) public view returns (uint256) {
    return _questMilestoneERC20Deposit[_pubId][_milestone][_tokenAddress];
  }

  function getQuestMilestoneERC721URI(
    uint256 _pubId,
    uint256 _milestone
  ) public view returns (string memory) {
    return _questMilestoneERC721Deposit[_pubId][_milestone];
  }
}
