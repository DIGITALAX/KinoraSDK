// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.19;

import "./KinoraAccessControl.sol";
import "./KinoraLibrary.sol";
import "./KinoraNFTCreator.sol";
import "./KinoraQuestData.sol";
import "./KinoraErrors.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract KinoraEscrow {
  string public name;
  string public symbol;
  KinoraAccessControl public kinoraAccess;
  KinoraQuestData public kinoraQuestData;
  KinoraNFTCreator public kinoraNFTCreator;
  address public kinoraOpenAction;

  mapping(uint256 => mapping(uint256 => mapping(address => uint256)))
    private _questMilestoneERC20Deposit;
  mapping(uint256 => mapping(uint256 => mapping(uint256 => string)))
    private _questMilestoneERC721Deposit;

  modifier onlyOpenAction() {
    if (msg.sender != kinoraOpenAction) {
      revert KinoraErrors.InvalidContract();
    }
    _;
  }
  modifier onlyMaintainer() {
    if (!kinoraAccess.isEnvoker(msg.sender)) {
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

  function initialize(
    address _kinoraAccessAddress,
    address _kinoraQuestDataAddress,
    address _kinoraNFTCreatorAddress,
    address _kinoraOpenActionAddress
  ) external {
    if (address(kinoraAccess) != address(0)) {
      revert KinoraErrors.AlreadyInitialized();
    }
    name = "KinoraEscrow";
    symbol = "KES";
    kinoraAccess = KinoraAccessControl(_kinoraAccessAddress);
    kinoraQuestData = KinoraQuestData(_kinoraQuestDataAddress);
    kinoraNFTCreator = KinoraNFTCreator(_kinoraNFTCreatorAddress);
    kinoraOpenAction = _kinoraOpenActionAddress;
  }

  function depositERC20(
    address _tokenAddress,
    uint256 _amount,
    uint256 _questId,
    uint256 _milestone
  ) external onlyOpenAction {
    IERC20(_tokenAddress).transferFrom(
      address(kinoraOpenAction),
      address(this),
      _amount
    );

    _questMilestoneERC20Deposit[_questId][_milestone][_tokenAddress] = _amount;

    emit ERC20Deposited(_tokenAddress, _amount, _questId, _milestone);
  }

  function withdrawERC20(
    address _toAddress,
    uint256 _questId,
    uint256 _milestone,
    uint256 _rewardIndex
  ) external onlyOpenAction {
    if (kinoraQuestData.getQuestStatus(_questId) != KinoraLibrary.Status.Open) {
      revert KinoraErrors.QuestClosed();
    }

    uint256 _amount = kinoraQuestData.getMilestoneRewardTokenAmount(
      _questId,
      _rewardIndex,
      _milestone
    );

    address _tokenAddress = kinoraQuestData.getMilestoneRewardTokenAddress(
      _questId,
      _rewardIndex,
      _milestone
    );

    IERC20(_tokenAddress).transfer(_toAddress, _amount);

    _questMilestoneERC20Deposit[_questId][_milestone - 1][
      _tokenAddress
    ] -= _amount;

    emit ERC20Withdrawn(_toAddress, _questId, _milestone);
  }

  function emergencyWithdrawERC20(address _toAddress, uint256 _questId) public {
    if (
      kinoraQuestData.getQuestEnvoker(_questId) != msg.sender &&
      msg.sender != address(this)
    ) {
      revert KinoraErrors.InvalidAddress();
    }

    if (kinoraQuestData.getQuestEnvoker(_questId) == address(0)) {
      revert KinoraErrors.QuestDoesntExist();
    }

    uint256 _milestoneCount = kinoraQuestData.getMilestoneCount(_questId);

    for (uint256 i = 0; i < _milestoneCount; i++) {
      uint256 _rewardLength = kinoraQuestData.getMilestoneRewardsLength(
        _questId,
        i + 1
      );

      uint256 _counterSize = 0;
      for (uint256 j = 0; j < _rewardLength; j++) {
        if (
          kinoraQuestData.getMilestoneRewardType(_questId, j, i + 1) ==
          KinoraLibrary.RewardType.ERC20
        ) {
          _counterSize++;
        }
      }

      address[] memory _uniqueAddresses = new address[](_counterSize);

      uint256 _counter = 0;
      for (uint256 j = 0; j < _rewardLength; j++) {
        if (
          kinoraQuestData.getMilestoneRewardType(_questId, j, i + 1) ==
          KinoraLibrary.RewardType.ERC20
        ) {
          _uniqueAddresses[_counter] = kinoraQuestData
            .getMilestoneRewardTokenAddress(_questId, j, i + 1);
          _counter++;
        }
      }

      for (uint256 k = 0; k < _uniqueAddresses.length; k++) {
        IERC20(_uniqueAddresses[k]).transfer(
          _toAddress,
          _questMilestoneERC20Deposit[_questId][i][_uniqueAddresses[k]]
        );
        _questMilestoneERC20Deposit[_questId][i][_uniqueAddresses[k]] = 0;
      }
    }

    kinoraQuestData.updateQuestStatus(_questId);

    emit EmergencyERC20Withdrawn(_toAddress, _questId);
  }

  function depositERC721(
    string memory _uri,
    uint256 _questId,
    uint256 _milestone,
    uint256 _rewardIndex
  ) external onlyOpenAction {
    _questMilestoneERC721Deposit[_questId][_milestone][_rewardIndex] = _uri;

    emit ERC721URISet(_uri, _questId, _milestone);
  }

  function mintERC721(
    address _playerAddress,
    uint256 _questId,
    uint256 _milestone,
    uint256 _rewardIndex
  ) external onlyOpenAction {
    if (kinoraQuestData.getQuestStatus(_questId) != KinoraLibrary.Status.Open) {
      revert KinoraErrors.QuestClosed();
    }
    kinoraNFTCreator.mintToken(
      _questMilestoneERC721Deposit[_questId][_milestone - 1][_rewardIndex],
      _playerAddress
    );

    emit ERC721Minted(_playerAddress, _questId, _milestone);
  }

  function deleteQuest(uint256 _questId) public {
    if (kinoraQuestData.getQuestEnvoker(_questId) == address(0)) {
      revert KinoraErrors.QuestDoesntExist();
    }
    if (kinoraQuestData.getQuestEnvoker(_questId) != msg.sender) {
      revert KinoraErrors.InvalidAddress();
    }

    if (kinoraQuestData.getQuestStatus(_questId) == KinoraLibrary.Status.Open) {
      emergencyWithdrawERC20(msg.sender, _questId);
    }

    kinoraQuestData.deleteQuest(_questId);
  }

  function getQuestMilestoneERC20TotalDeposit(
    address _tokenAddress,
    uint256 _questId,
    uint256 _milestone
  ) public view returns (uint256) {
    return _questMilestoneERC20Deposit[_questId][_milestone - 1][_tokenAddress];
  }

  function getQuestMilestoneERC721URI(
    uint256 _questId,
    uint256 _milestone,
    uint256 _rewardIndex
  ) public view returns (string memory) {
    return _questMilestoneERC721Deposit[_questId][_milestone - 1][_rewardIndex];
  }

  function setKinoraQuestDataContract(
    address _newQuestDataContract
  ) external onlyMaintainer {
    kinoraQuestData = KinoraQuestData(_newQuestDataContract);
  }

  function setKinoraAccessContract(
    address _newAccessContract
  ) external onlyMaintainer {
    kinoraAccess = KinoraAccessControl(_newAccessContract);
  }

  function setKinoraNFTCreatorContract(
    address _newNFTCreatorContract
  ) external onlyMaintainer {
    kinoraNFTCreator = KinoraNFTCreator(_newNFTCreatorContract);
  }

  function setKinoraOpenActionContract(
    address _newOpenActionContract
  ) external onlyMaintainer {
    kinoraOpenAction = _newOpenActionContract;
  }

  function getKinoraQuestDataAddress() public view returns (address) {
    return address(kinoraQuestData);
  }
}
