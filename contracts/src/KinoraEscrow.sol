// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.26;

import "./KinoraAccessControl.sol";
import "./KinoraLibrary.sol";
import "./KinoraNFTCreator.sol";
import "./KinoraQuestData.sol";
import "./KinoraErrors.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract KinoraEscrow is Initializable {
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
    address kinoraAccessAddress,
    address kinoraQuestDataAddress,
    address kinoraNFTCreatorAddress,
    address kinoraOpenActionAddress
  ) public initializer {
    if (address(kinoraAccess) != address(0)) {
      revert KinoraErrors.AlreadyInitialized();
    }
    kinoraAccess = KinoraAccessControl(kinoraAccessAddress);
    kinoraQuestData = KinoraQuestData(kinoraQuestDataAddress);
    kinoraNFTCreator = KinoraNFTCreator(kinoraNFTCreatorAddress);
    kinoraOpenAction = kinoraOpenActionAddress;
  }

  function depositERC20(
    address tokenAddress,
    uint256 amount,
    uint256 questId,
    uint256 milestone
  ) external onlyOpenAction {
    IERC20(tokenAddress).transferFrom(
      address(kinoraOpenAction),
      address(this),
      amount
    );

    _questMilestoneERC20Deposit[questId][milestone][tokenAddress] = amount;

    emit ERC20Deposited(tokenAddress, amount, questId, milestone);
  }

  function withdrawERC20(
    address toAddress,
    uint256 questId,
    uint256 milestone,
    uint256 rewardIndex
  ) external onlyOpenAction {
    if (kinoraQuestData.getQuestStatus(questId) != KinoraLibrary.Status.Open) {
      revert KinoraErrors.QuestClosed();
    }

    uint256 _amount = kinoraQuestData.getMilestoneRewardTokenAmount(
      questId,
      rewardIndex,
      milestone
    );

    address _tokenAddress = kinoraQuestData.getMilestoneRewardTokenAddress(
      questId,
      rewardIndex,
      milestone
    );

    IERC20(_tokenAddress).transfer(toAddress, _amount);

    _questMilestoneERC20Deposit[questId][milestone - 1][
      _tokenAddress
    ] -= _amount;

    emit ERC20Withdrawn(toAddress, questId, milestone);
  }

  function emergencyWithdrawERC20(address toAddress, uint256 questId) public {
    if (
      kinoraQuestData.getQuestEnvoker(questId) != msg.sender &&
      msg.sender != address(this)
    ) {
      revert KinoraErrors.InvalidAddress();
    }

    if (kinoraQuestData.getQuestEnvoker(questId) == address(0)) {
      revert KinoraErrors.QuestDoesntExist();
    }

    uint256 _milestoneCount = kinoraQuestData.getMilestoneCount(questId);

    for (uint256 i = 0; i < _milestoneCount; i++) {
      uint256 _rewardLength = kinoraQuestData.getMilestoneRewardsLength(
        questId,
        i + 1
      );

      uint256 _counterSize = 0;
      for (uint256 j = 0; j < _rewardLength; j++) {
        if (
          kinoraQuestData.getMilestoneRewardType(questId, j, i + 1) ==
          KinoraLibrary.RewardType.ERC20
        ) {
          _counterSize++;
        }
      }

      address[] memory _uniqueAddresses = new address[](_counterSize);

      uint256 _counter = 0;
      for (uint256 j = 0; j < _rewardLength; j++) {
        if (
          kinoraQuestData.getMilestoneRewardType(questId, j, i + 1) ==
          KinoraLibrary.RewardType.ERC20
        ) {
          _uniqueAddresses[_counter] = kinoraQuestData
            .getMilestoneRewardTokenAddress(questId, j, i + 1);
          _counter++;
        }
      }

      for (uint256 k = 0; k < _uniqueAddresses.length; k++) {
        IERC20(_uniqueAddresses[k]).transfer(
          toAddress,
          _questMilestoneERC20Deposit[questId][i][_uniqueAddresses[k]]
        );
        _questMilestoneERC20Deposit[questId][i][_uniqueAddresses[k]] = 0;
      }
    }

    kinoraQuestData.updateQuestStatus(questId);

    emit EmergencyERC20Withdrawn(toAddress, questId);
  }

  function depositERC721(
    string memory uri,
    uint256 questId,
    uint256 milestone,
    uint256 rewardIndex
  ) external onlyOpenAction {
    _questMilestoneERC721Deposit[questId][milestone][rewardIndex] = uri;

    emit ERC721URISet(uri, questId, milestone);
  }

  function mintERC721(
    address playerAddress,
    uint256 questId,
    uint256 milestone,
    uint256 rewardIndex
  ) external onlyOpenAction {
    if (kinoraQuestData.getQuestStatus(questId) != KinoraLibrary.Status.Open) {
      revert KinoraErrors.QuestClosed();
    }
    kinoraNFTCreator.mintToken(
      _questMilestoneERC721Deposit[questId][milestone - 1][rewardIndex],
      playerAddress
    );

    emit ERC721Minted(playerAddress, questId, milestone);
  }

  function deleteQuest(
    uint256 questId,
    address envoker
  ) external onlyOpenAction {
    if (kinoraQuestData.getQuestStatus(questId) == KinoraLibrary.Status.Open) {
      emergencyWithdrawERC20(envoker, questId);
    }

    kinoraQuestData.deleteQuest(questId);
  }

  function getQuestMilestoneERC20TotalDeposit(
    address tokenAddress,
    uint256 questId,
    uint256 milestone
  ) public view returns (uint256) {
    return _questMilestoneERC20Deposit[questId][milestone - 1][tokenAddress];
  }

  function getQuestMilestoneERC721URI(
    uint256 questId,
    uint256 milestone,
    uint256 rewardIndex
  ) public view returns (string memory) {
    return _questMilestoneERC721Deposit[questId][milestone - 1][rewardIndex];
  }

  function setKinoraQuestDataContract(
    address newQuestDataContract
  ) external onlyMaintainer {
    kinoraQuestData = KinoraQuestData(newQuestDataContract);
  }

  function setKinoraAccessContract(
    address newAccessContract
  ) external onlyMaintainer {
    kinoraAccess = KinoraAccessControl(newAccessContract);
  }

  function setKinoraNFTCreatorContract(
    address newNFTCreatorContract
  ) external onlyMaintainer {
    kinoraNFTCreator = KinoraNFTCreator(newNFTCreatorContract);
  }

  function setKinoraOpenActionContract(
    address newOpenActionContract
  ) external onlyMaintainer {
    kinoraOpenAction = newOpenActionContract;
  }

  function getKinoraQuestDataAddress() public view returns (address) {
    return address(kinoraQuestData);
  }

  function symbol() public pure returns (string memory) {
    return "KES";
  }

  function name() public pure returns (string memory) {
    return "KinoraEscrow";
  }
}
