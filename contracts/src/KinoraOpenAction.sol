// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.26;

import "./KinoraLibrary.sol";
import "./KinoraEscrow.sol";
import "./KinoraErrors.sol";
import "./KinoraAccessControl.sol";
import "./KinoraMetrics.sol";
import "./KinoraAccessControl.sol";
import "./KinoraQuestData.sol";
import "./KinoraMilestoneCheckLogic.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./Lens/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";

bytes32 constant UNIVERSAL_ACTION_MAGIC_VALUE = 0xa12c06eea999f2a08fb2bd50e396b2a286921eebbda81fb45a0adcf13afb18ef;

interface IPostAction {
  function configure(
    address originalMsgSender,
    address feed,
    uint256 postId,
    KeyValue[] calldata params
  ) external returns (bytes memory);

  function execute(
    address originalMsgSender,
    address feed,
    uint256 postId,
    KeyValue[] calldata params
  ) external returns (bytes memory);

  function setDisabled(
    address originalMsgSender,
    address feed,
    uint256 postId,
    bool isDisabled,
    KeyValue[] calldata params
  ) external returns (bytes memory);
}

abstract contract BaseAction {
  address immutable ACTION_HUB;

  /// @custom:keccak lens.storage.Action.configured
  bytes32 constant STORAGE__ACTION_CONFIGURED =
    0x852bead036b7ef35b8026346140cc688bafe817a6c3491812e6d994b1bcda6d9;

  modifier onlyActionHub() {
    require(msg.sender == ACTION_HUB, ErrorsLib.InvalidMsgSender());
    _;
  }

  constructor(address actionHub) {
    ACTION_HUB = actionHub;
  }

  function _configureUniversalAction(
    address originalMsgSender
  ) internal onlyActionHub returns (bytes memory) {
    bool configured;
    assembly {
      configured := sload(STORAGE__ACTION_CONFIGURED)
    }
    require(!configured, ErrorsLib.RedundantStateChange());
    require(originalMsgSender == address(0), ErrorsLib.InvalidParameter());
    assembly {
      sstore(STORAGE__ACTION_CONFIGURED, 1)
    }
    return abi.encode(UNIVERSAL_ACTION_MAGIC_VALUE);
  }
}

abstract contract BasePostAction is BaseAction, IPostAction {
  constructor(address actionHub) BaseAction(actionHub) {}

  function configure(
    address originalMsgSender,
    address feed,
    uint256 postId,
    KeyValue[] calldata params
  ) external override onlyActionHub returns (bytes memory) {
    return _configure(originalMsgSender, feed, postId, params);
  }

  function execute(
    address originalMsgSender,
    address feed,
    uint256 postId,
    KeyValue[] calldata params
  ) external override onlyActionHub returns (bytes memory) {
    return _execute(originalMsgSender, feed, postId, params);
  }

  function setDisabled(
    address originalMsgSender,
    address feed,
    uint256 postId,
    bool isDisabled,
    KeyValue[] calldata params
  ) external override onlyActionHub returns (bytes memory) {
    return _setDisabled(originalMsgSender, feed, postId, isDisabled, params);
  }

  function _configure(
    address originalMsgSender,
    address /* feed */,
    uint256 /* postId */,
    KeyValue[] calldata /* params */
  ) internal virtual returns (bytes memory) {
    return _configureUniversalAction(originalMsgSender);
  }

  function _execute(
    address originalMsgSender,
    address feed,
    uint256 postId,
    KeyValue[] calldata params
  ) internal virtual returns (bytes memory);

  function _setDisabled(
    address /* originalMsgSender */,
    address /* feed */,
    uint256 /* postId */,
    bool /* isDisabled */,
    KeyValue[] calldata /* params */
  ) internal virtual returns (bytes memory) {
    revert ErrorsLib.NotImplemented();
  }
}

struct KeyValue {
  bytes32 key;
  bytes value;
}

contract KinoraOpenAction is BasePostAction {
  KinoraMilestoneCheckLogic private kinoraMilestoneCheckLogic;
  uint256 private _factoryCounter;
  mapping(uint256 => mapping(uint256 => uint256)) _questGroups;
  mapping(uint256 => uint256) _factoryGroups;
  mapping(uint256 => address) _factoryMap;

  event PlayerCompletedMilestone(
    address playerAddress,
    uint256 questId,
    uint256 milestoneId
  );
  event PlayerCompletedQuest(
    address envokerAddress,
    uint256 questId,
    uint256 postId
  );
  event PlayerJoinedQuest(address playerProfile, uint256 questId);
  event NewFactoryDeployment(
    address kac,
    address ke,
    address kqd,
    address km,
    address knc
  );
  event QuestInitialized(
    address envokerAddress,
    uint256 questId,
    uint256 postId
  );

  constructor(
    address actionHub,
    address _kinoraMilestoneCheckLogic
  ) BasePostAction(actionHub) {
    kinoraMilestoneCheckLogic = KinoraMilestoneCheckLogic(
      _kinoraMilestoneCheckLogic
    );

    _factoryCounter = 0;
  }

  function _configure(
    address originalMsgSender,
    address feed,
    uint256 postId,
    KeyValue[] calldata params
  ) internal override returns (bytes memory) {
    bytes memory _data = _getParamValue(params, "lens.param.configureKinora");

    (KinoraLibrary.ActionParameters memory _params, uint256 _factoryId) = abi
      .decode(_data, (KinoraLibrary.ActionParameters, uint256));

    if (_params.gateLogic.erc721Addresses.length > 0) {
      for (uint256 k = 0; k < _params.gateLogic.erc721Addresses.length; k++) {
        if (!_functionExists(_params.gateLogic.erc721Addresses[k])) {
          revert KinoraErrors.InvalidContract();
        }
      }
    }
    for (uint256 i = 0; i < _params.milestones.length; i++) {
      for (uint256 j = 0; j < _params.milestones[i].rewards.length; j++) {
        if (
          _params.milestones[i].rewards[j].rewardType ==
          KinoraLibrary.RewardType.ERC20
        ) {
          if (_params.milestones[i].rewards[j].amount <= 0) {
            revert KinoraErrors.InvalidRewardAmount();
          }
        }
      }
      if (_params.milestones[i].gated.erc721Addresses.length > 0) {
        for (
          uint256 k = 0;
          k < _params.milestones[i].gated.erc721Addresses.length;
          k++
        ) {
          if (
            !_functionExists(_params.milestones[i].gated.erc721Addresses[k])
          ) {
            revert KinoraErrors.InvalidContract();
          }
        }
      }
    }
    address _envoker = Ownable(originalMsgSender).owner();
    (address _newKE, address _newKQD) = _createFactory(
      _envoker,
      _factoryId,
      true
    );

    uint256 _questId = KinoraQuestData(_newKQD).getTotalQuestCount() + 1;

    _questConfigure(_params, _envoker, _newKE, _newKQD, postId, _questId);
    return abi.encode(_questId, postId);
  }

  function _execute(
    address originalMsgSender,
    address feed,
    uint256 postId,
    KeyValue[] calldata params
  ) internal override returns (bytes memory) {
    uint256 _factoryId = _factoryGroups[postId];
    uint256 _questId = _questGroups[_factoryId][postId];

    (address _ke, address _kqd) = _createFactory(address(0), _factoryId, false);

    if (KinoraQuestData(_kqd).getQuestEnvoker(_questId) == address(0)) {
      revert KinoraErrors.QuestDoesntExist();
    }

    bool _playerJoined = KinoraQuestData(_kqd).getPlayerHasJoinedQuest(
      originalMsgSender,
      _questId
    );

    address playerAddress = Ownable(originalMsgSender).owner();

    if (_playerJoined) {
      uint256 _playerMilestone = KinoraQuestData(_kqd)
        .getPlayerMilestonesCompletedPerQuest(originalMsgSender, _questId);

      _handlePlayerJoined(
        _ke,
        _kqd,
        originalMsgSender,
        playerAddress,
        _questId,
        _playerMilestone
      );

      emit PlayerCompletedMilestone(
        playerAddress,
        _questId,
        _playerMilestone + 1
      );
    } else {
      if (
        KinoraQuestData(_kqd).getQuestMaxPlayerCount(_questId) ==
        KinoraQuestData(_kqd).getQuestPlayers(_questId).length
      ) {
        revert KinoraErrors.MaxPlayerCountReached();
      }

      if (
        KinoraQuestData(_kqd).getQuestStatus(_questId) ==
        KinoraLibrary.Status.Closed
      ) {
        revert KinoraErrors.QuestClosed();
      }

      _checkJoinEligibility(playerAddress, _kqd, _questId);

      KinoraQuestData(_kqd).joinQuest(
        originalMsgSender,
        playerAddress,
        _questId
      );

      emit PlayerJoinedQuest(originalMsgSender, _questId);
    }

    return abi.encode(_questId);
  }

  function _setDisabled(
    address originalMsgSender,
    address feed,
    uint256 postId,
    bool isDisabled,
    KeyValue[] calldata params
  ) internal override returns (bytes memory) {
    uint256 _factoryId = _factoryGroups[postId];
    uint256 _questId = _questGroups[_factoryId][postId];

    (address _ke, address _kqd) = _createFactory(address(0), _factoryId, false);

    if (KinoraQuestData(_kqd).getQuestEnvoker(_questId) == address(0)) {
      revert KinoraErrors.QuestDoesntExist();
    }

    if (
      KinoraQuestData(_kqd).getQuestEnvoker(_questId) !=
      Ownable(originalMsgSender).owner()
    ) {
      revert KinoraErrors.InvalidAddress();
    }

    KinoraEscrow(_ke).deleteQuest(_questId, Ownable(originalMsgSender).owner());
  }

  function _handlePlayerJoined(
    address ke,
    address kqd,
    address playerProfile,
    address playerAddress,
    uint256 questId,
    uint256 playerMilestone
  ) private {
    uint256[] memory _videoIds = KinoraQuestData(kqd).getMilestoneVideos(
      questId,
      playerMilestone + 1
    );

    if (
      !KinoraQuestData(kqd).getPlayerEligibleToClaimMilestone(
        playerProfile,
        questId,
        playerMilestone + 1
      ) || playerMilestone == KinoraQuestData(kqd).getMilestoneCount(questId)
    ) {
      revert KinoraErrors.PlayerNotEligible();
    }

    _checkMilestoneLogic(
      _videoIds,
      playerProfile,
      kqd,
      playerMilestone + 1,
      questId
    );

    _checkMilestoneGate(playerAddress, kqd, questId, playerMilestone + 1);

    uint256 _rewardLength = KinoraQuestData(kqd).getMilestoneRewardsLength(
      questId,
      playerMilestone + 1
    );

    for (uint256 k = 0; k < _rewardLength; k++) {
      if (
        KinoraQuestData(kqd).getMilestoneRewardType(
          questId,
          k,
          playerMilestone + 1
        ) == KinoraLibrary.RewardType.ERC20
      ) {
        KinoraEscrow(ke).withdrawERC20(
          playerAddress,
          questId,
          playerMilestone + 1,
          k
        );
      } else {
        KinoraEscrow(ke).mintERC721(
          playerAddress,
          questId,
          playerMilestone + 1,
          k
        );
      }
    }

    KinoraQuestData(kqd).completeMilestone(playerProfile, questId);
  }

  function _checkMilestoneLogic(
    uint256[] memory videoIds,
    address playerProfile,
    address kqd,
    uint256 milestone,
    uint256 questId
  ) private {
    for (uint256 i = 0; i < videoIds.length; i++) {
      kinoraMilestoneCheckLogic.checkMilestoneLogic(
        kqd,
        playerProfile,
        milestone,
        questId,
        videoIds[i]
      );
    }
  }

  function _questConfigure(
    KinoraLibrary.ActionParameters memory params,
    address envoker,
    address newKE,
    address newKQD,
    uint256 postId,
    uint256 questId
  ) private {
    _configureRewardEscrow(
      params.milestones,
      envoker,
      newKE,
      questId,
      params.maxPlayerCount
    );

    KinoraQuestData(newKQD).configureNewQuest(
      KinoraLibrary.NewQuestParams({
        maxPlayerCount: params.maxPlayerCount,
        gateLogic: params.gateLogic,
        milestones: params.milestones,
        uri: params.uri,
        envokerAddress: envoker,
        postId: postId
      })
    );

    _questGroups[_factoryCounter][postId] = questId;
    _factoryGroups[postId] = _factoryCounter;
    emit QuestInitialized(envoker, questId, postId);
  }

  function _configureRewardEscrow(
    KinoraLibrary.MilestoneParameter[] memory milestones,
    address envokerAddress,
    address newKE,
    uint256 questId,
    uint256 maxPlayerCount
  ) private {
    for (uint256 i = 0; i < milestones.length; i++) {
      if (milestones[i].rewards.length > 0) {
        for (uint256 j = 0; j < milestones[i].rewards.length; j++) {
          if (
            milestones[i].rewards[j].rewardType ==
            KinoraLibrary.RewardType.ERC20
          ) {
            IERC20(milestones[i].rewards[j].tokenAddress).approve(
              newKE,
              milestones[i].rewards[j].amount * maxPlayerCount
            );
            IERC20(milestones[i].rewards[j].tokenAddress).transferFrom(
              envokerAddress,
              address(this),
              milestones[i].rewards[j].amount * maxPlayerCount
            );

            KinoraEscrow(newKE).depositERC20(
              milestones[i].rewards[j].tokenAddress,
              milestones[i].rewards[j].amount * maxPlayerCount,
              questId,
              i
            );
          } else {
            KinoraEscrow(newKE).depositERC721(
              milestones[i].rewards[j].uri,
              questId,
              i,
              j
            );
          }
        }
      }
    }
  }

  function _checkMilestoneGate(
    address playerAddress,
    address kqd,
    uint256 questId,
    uint256 milestone
  ) private view {
    bool _isOneOf = KinoraQuestData(kqd).getMilestoneGatedOneOf(
      questId,
      milestone
    );
    address[] memory _erc20Addresses = KinoraQuestData(kqd)
      .getMilestoneGatedERC20Addresses(questId, milestone);
    uint256[] memory _erc20Thresholds = KinoraQuestData(kqd)
      .getMilestoneGatedERC20Thresholds(questId, milestone);
    address[] memory _erc721Addresses = KinoraQuestData(kqd)
      .getMilestoneGatedERC721Addresses(questId, milestone);
    uint256[][] memory _erc721TokenIds = KinoraQuestData(kqd)
      .getMilestoneGatedERC721TokenIds(questId, milestone);
    string[][] memory _erc721TokenUris = KinoraQuestData(kqd)
      .getMilestoneGatedERC721TokenURIs(questId, milestone);
    if (
      !_gateChecker(
        _erc721TokenUris,
        _erc721TokenIds,
        _erc20Addresses,
        _erc721Addresses,
        _erc20Thresholds,
        playerAddress,
        _isOneOf
      )
    ) {
      revert KinoraErrors.PlayerNotEligible();
    }
  }

  function _checkJoinEligibility(
    address _playerAddress,
    address _kqd,
    uint256 _questId
  ) private view {
    bool _isOneOf = KinoraQuestData(_kqd).getQuestGatedOneOf(_questId);
    address[] memory _erc20Addresses = KinoraQuestData(_kqd)
      .getQuestGatedERC20Addresses(_questId);
    uint256[] memory _erc20Thresholds = KinoraQuestData(_kqd)
      .getQuestGatedERC20Thresholds(_questId);
    address[] memory _erc721Addresses = KinoraQuestData(_kqd)
      .getQuestGatedERC721Addresses(_questId);
    uint256[][] memory _erc721TokenIds = KinoraQuestData(_kqd)
      .getQuestGatedERC721TokenIds(_questId);
    string[][] memory _erc721TokenUris = KinoraQuestData(_kqd)
      .getQuestGatedERC721TokenURIs(_questId);

    if (
      !_gateChecker(
        _erc721TokenUris,
        _erc721TokenIds,
        _erc20Addresses,
        _erc721Addresses,
        _erc20Thresholds,
        _playerAddress,
        _isOneOf
      )
    ) {
      revert KinoraErrors.PlayerNotEligible();
    }
  }

  function _gateChecker(
    string[][] memory _erc721TokensUris,
    uint256[][] memory _erc721TokenIds,
    address[] memory _erc20Addresses,
    address[] memory _erc721Addresses,
    uint256[] memory _erc20Thresholds,
    address _playerAddress,
    bool _isOneOf
  ) private view returns (bool) {
    bool _oneERC20ConditionMet = false;
    if (_erc20Addresses.length > 0) {
      for (uint i = 0; i < _erc20Addresses.length; i++) {
        uint256 _playerBalance = IERC20(_erc20Addresses[i]).balanceOf(
          _playerAddress
        );
        if (_playerBalance >= _erc20Thresholds[i]) {
          if (_isOneOf) {
            return true;
          }
          _oneERC20ConditionMet = true;
        } else if (!_isOneOf) {
          return false;
        }
      }
    }

    if (_isOneOf && _oneERC20ConditionMet) {
      return true;
    }

    bool _oneERC721ConditionMet = _erc721Check(
      _erc721TokensUris,
      _erc721TokenIds,
      _erc721Addresses,
      _playerAddress,
      _isOneOf
    );

    if (_isOneOf && (_oneERC20ConditionMet || _oneERC721ConditionMet)) {
      return true;
    } else if (!_isOneOf && _oneERC20ConditionMet && _oneERC721ConditionMet) {
      return true;
    } else if (_erc721Addresses.length < 1 && _erc20Addresses.length < 1) {
      return true;
    }
    return false;
  }

  function _erc721Check(
    string[][] memory _erc721TokensUris,
    uint256[][] memory _erc721TokenIds,
    address[] memory _erc721Addresses,
    address _playerAddress,
    bool _isOneOf
  ) private view returns (bool) {
    bool _oneERC721ConditionMet = false;
    if (_erc721Addresses.length > 0) {
      for (uint i = 0; i < _erc721Addresses.length; i++) {
        if (i < _erc721TokensUris.length) {
          if (_erc721TokensUris[i].length > 0) {
            uint256 _balance = IERC721(_erc721Addresses[i]).balanceOf(
              _playerAddress
            );
            bool _ownsMatchingURI = false;
            for (uint256 j = 0; j < _balance; j++) {
              uint256 _tokenId = _fetchTokenIdByIndex(
                _erc721Addresses[i],
                _playerAddress,
                j
              );
              string memory _tokenURI = IERC721Metadata(_erc721Addresses[i])
                .tokenURI(_tokenId);
              for (uint256 k = 0; k < _erc721TokensUris[i].length; k++) {
                if (
                  keccak256(abi.encodePacked(_tokenURI)) ==
                  keccak256(abi.encodePacked(_erc721TokensUris[i][k]))
                ) {
                  _ownsMatchingURI = true;
                  break;
                }
              }
              if (_ownsMatchingURI) {
                if (_isOneOf) {
                  return true;
                }
                _oneERC721ConditionMet = true;
                break;
              }
            }
          }
        }

        if (i < _erc721TokenIds.length) {
          if (_erc721TokenIds[i].length > 0) {
            for (uint j = 0; j < _erc721TokenIds[i].length; j++) {
              if (_erc721Addresses[i] != address(0)) {
                if (
                  IERC721(_erc721Addresses[i]).ownerOf(_erc721TokenIds[i][j]) ==
                  _playerAddress
                ) {
                  if (_isOneOf) {
                    return true;
                  }
                  _oneERC721ConditionMet = true;
                  break;
                }
              }
            }
          }

          if (_oneERC721ConditionMet && !_isOneOf) {
            break;
          }
        }
      }
    }

    return _oneERC721ConditionMet;
  }

  function _fetchTokenIdByIndex(
    address _erc721Address,
    address _owner,
    uint256 _index
  ) private view returns (uint256) {
    return
      IERC721Enumerable(_erc721Address).tokenOfOwnerByIndex(_owner, _index);
  }

  function _functionExists(address _contract) private view returns (bool) {
    bytes4 selector = bytes4(
      keccak256(bytes("tokenOfOwnerByIndex(address,uint256)"))
    );

    bytes memory data = abi.encodeWithSelector(
      selector,
      address(0),
      uint256(0)
    );

    (, bytes memory returnedData) = _contract.staticcall(data);

    return returnedData.length > 0;
  }

  function _createFactory(
    address envokerAddress,
    uint256 factoryId,
    bool initialize
  ) private returns (address, address) {
    if (factoryId == 0) {
      KinoraAccessControl _newKAC = new KinoraAccessControl();
      KinoraEscrow _newKE = new KinoraEscrow();
      KinoraQuestData _newKQD = new KinoraQuestData();
      KinoraMetrics _newKM = new KinoraMetrics();
      KinoraNFTCreator _newKNC = new KinoraNFTCreator();

      _newKAC.initialize(envokerAddress, address(this));
      _newKQD.initialize(address(_newKAC), address(this));
      _newKM.initialize(address(_newKAC), address(_newKQD));
      _newKNC.initialize(address(_newKAC), address(this));
      _newKE.initialize(
        address(_newKAC),
        address(_newKQD),
        address(_newKNC),
        address(this)
      );
      KinoraAccessControl(_newKAC).setRelatedContract(
        address(_newKE),
        address(_newKQD),
        address(_newKM),
        address(_newKNC)
      );
      _newKNC.setKinoraEscrowContract(address(_newKE));
      _newKQD.setKinoraEscrowContract(address(_newKE));
      _newKQD.setKinoraMetricsContract(address(_newKM));

      _factoryCounter++;

      _factoryMap[_factoryCounter] = address(_newKAC);
      emit NewFactoryDeployment(
        address(_newKAC),
        address(_newKE),
        address(_newKQD),
        address(_newKM),
        address(_newKNC)
      );

      return (address(_newKE), address(_newKQD));
    } else {
      address _kac = _factoryMap[_factoryCounter];
      if (!KinoraAccessControl(_kac).isEnvoker(envokerAddress) && initialize) {
        revert KinoraErrors.InvalidAddress();
      }
      address _ke = KinoraAccessControl(_kac).getKinoraEscrow();
      address _kqd = KinoraAccessControl(_kac).getKinoraQuestData();
      KinoraAccessControl(_kac).getKinoraMetrics();
      KinoraAccessControl(_kac).getKinoraNFTCreator();

      return (_ke, _kqd);
    }
  }

  function _getParamValue(
    KeyValue[] calldata params,
    string memory keyLabel
  ) internal pure returns (bytes memory) {
    bytes32 lookupKey = keccak256(abi.encodePacked(keyLabel));
    for (uint256 i = 0; i < params.length; i++) {
      if (params[i].key == lookupKey) {
        return params[i].value;
      }
    }

    revert KinoraErrors.KeyNotFound();
  }

  function getContractFactoryMap(
    uint256 factoryId
  ) public view returns (address) {
    return _factoryMap[factoryId];
  }

  function getQuestId(
    uint256 factoryId,
    uint256 postId
  ) public view returns (uint256) {
    return _questGroups[factoryId][postId];
  }

  function getContractFactoryId(uint256 postId) public view returns (uint256) {
    return _factoryGroups[postId];
  }

  function getTotalContractFactoryCount() public view returns (uint256) {
    return _factoryCounter;
  }

  function getKinoraMilestoneCheckLogicAddress() public view returns (address) {
    return address(kinoraMilestoneCheckLogic);
  }
}
