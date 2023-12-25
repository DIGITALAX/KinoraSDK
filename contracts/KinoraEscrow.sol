// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.19;

import "./KinoraAccessControl.sol";
import "./KinoraLibrary.sol";
import "./KinoraNFTCreator.sol";
import "./KinoraQuestData.sol";
import "./KinoraErrors.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract KinoraEscrow {
  string public name;
  string public symbol;
  KinoraAccessControl public accessControl;
  KinoraQuestData public kinoraQuestData;
  KinoraNFTCreator public kinoraNFTCreator;
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
  modifier onlyQuestEnvoker(uint256 _questId) {
    if (kinoraQuestData.getQuestEnvoker(_questId) != msg.sender) {
      revert KinoraErrors.InvalidAddress();
    }
    _;
  }

  event ERC20Deposited(
    address tokenAddress,
    uint256 amount,
    uint256 questId,
    uint256 milestone
  );
  event ERC721URISet(string uri, uint256 questId, uint256 milestone);
  event ERC20Withdrawn(address toAddress, uint256 questId, uint256 milestone);
  event EmergencyERC20Withdrawn(address toAddress, uint256 questId);
  event ERC721Minted(address playerAddress, uint256 questId, uint256 milestone);

  constructor(
    address _accessControlAddress,
    address _kinoraQuestDataAddress,
    address _kinoraNFTCreatorAddress,
    address _kinoraOpenActionAddress
  ) {
    name = "KinoraEscrow";
    symbol = "KES";
    accessControl = KinoraAccessControl(_accessControlAddress);
    kinoraQuestData = KinoraQuestData(_kinoraQuestDataAddress);
    kinoraNFTCreator = KinoraNFTCreator(_kinoraNFTCreatorAddress);
    kinoraOpenAction = _kinoraOpenActionAddress;
  }

  function depositERC20(
    address _tokenAddress,
    address _fromAddress,
    uint256 _amount,
    uint256 _questId,
    uint256 _milestone
  ) external onlyOpenAction {
    IERC20(_tokenAddress).transferFrom(_fromAddress, address(this), _amount);

    _questMilestoneERC20Deposit[_questId][_milestone][_tokenAddress] = _amount;

    emit ERC20Deposited(_tokenAddress, _amount, _questId, _milestone);
  }

  function withdrawERC20(
    address _toAddress,
    uint256 _questId,
    uint256 _milestone
  ) external onlyOpenAction {
    if (kinoraQuestData.getQuestStatus(_questId) != KinoraLibrary.Status.Open) {
      revert KinoraErrors.QuestClosed();
    }

    _erc20Transfer(_toAddress, _questId, _milestone);

    emit ERC20Withdrawn(_toAddress, _questId, _milestone);
  }

  function emergencyWithdrawERC20(
    address _toAddress,
    uint256 _questId
  ) public onlyQuestEnvoker(_questId) {
    uint256 _milestoneCount = kinoraQuestData.getQuestMilestoneCount(_questId);

    for (uint256 i = 0; i < _milestoneCount; i++) {
      _erc20Transfer(_toAddress, _questId, i + 1);
    }

    kinoraQuestData.updateQuestStatus(_questId);

    emit EmergencyERC20Withdrawn(_toAddress, _questId);
  }

  function depositERC721(
    string memory _uri,
    uint256 _questId,
    uint256 _milestone
  ) external onlyOpenAction {
    _questMilestoneERC721Deposit[_questId][_milestone] = _uri;

    emit ERC721URISet(_uri, _questId, _milestone);
  }

  function mintERC721(
    address _playerAddress,
    uint256 _questId,
    uint256 _milestone
  ) external onlyOpenAction {
    kinoraNFTCreator.mintToken(
      _questMilestoneERC721Deposit[_questId][_milestone],
      _playerAddress
    );

    emit ERC721Minted(_playerAddress, _questId, _milestone);
  }

  function _erc20Transfer(
    address _toAddress,
    uint256 _questId,
    uint256 _milestone
  ) internal {
    uint256 _rewardLength = kinoraQuestData.getMilestoneRewardsLength(
      _questId,
      _milestone
    );

    for (uint256 i = 0; i < _rewardLength; i++) {
      uint256 _amount = kinoraQuestData.getQuestMilestoneRewardTokenAmount(
        _questId,
        i,
        _milestone
      );

      address _tokenAddress = kinoraQuestData
        .getQuestMilestoneRewardTokenAddress(_questId, i, _milestone);

      IERC20(_tokenAddress).transfer(_toAddress, _amount);

      _questMilestoneERC20Deposit[_questId][_milestone][
        _tokenAddress
      ] -= _amount;
    }
  }

  function getQuestMilestoneERC20Amount(
    address _tokenAddress,
    uint256 _questId,
    uint256 _milestone
  ) public view returns (uint256) {
    return _questMilestoneERC20Deposit[_questId][_milestone][_tokenAddress];
  }

  function getQuestMilestoneERC721URI(
    uint256 _questId,
    uint256 _milestone
  ) public view returns (string memory) {
    return _questMilestoneERC721Deposit[_questId][_milestone];
  }
}
