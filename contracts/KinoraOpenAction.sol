// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.16;

import {HubRestricted} from "./v2/base/HubRestricted.sol";
import {Types} from "./v2/libraries/constants/Types.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IPublicationActionModule} from "./v2/interfaces/IPublicationActionModule.sol";
import "./KinoraLibrary.sol";
import "./KinoraEscrow.sol";
import "./KinoraErrors.sol";
import "./KinoraAccessControl.sol";
import "./KinoraMetrics.sol";
import "./KinoraAccessControl.sol";
import "./KinoraQuestData.sol";
import "./KinoraMilestoneCheckLogic.sol";
import {ILensModule} from "./v2/interfaces/ILensModule.sol";
import {IModuleRegistry} from "./v2/interfaces/IModuleRegistry.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

contract KinoraOpenAction is
  HubRestricted,
  ILensModule,
  IPublicationActionModule
{
  KinoraMilestoneCheckLogic private kinoraMilestoneCheckLogic;
  string private _metadata;
  address public kinoraEscrowI;
  address public kinoraAccessControlI;
  address public kinoraQuestDataI;
  address public kinoraMetricsI;
  address public kinoraNFTCreatorI;
  uint256 private _factoryCounter;
  mapping(uint256 => mapping(uint256 => mapping(uint256 => uint256))) _questGroups;
  mapping(uint256 => mapping(uint256 => uint256)) _factoryGroups;
  mapping(uint256 => address) _factoryMap;

  IModuleRegistry public immutable MODULE_GLOBALS;

  event PlayerCompletedMilestone(
    uint256 questId,
    uint256 milestoneId,
    address playerAddress
  );
  event PlayerCompletedQuest(
    uint256 questId,
    uint256 pubId,
    uint256 profileId,
    address envokerAddress
  );
  event PlayerJoinedQuest(uint256 playerProfileId, uint256 questId);
  event NewFactoryDeployment(
    address kac,
    address ke,
    address kqd,
    address km,
    address knc
  );
  event QuestInitialized(
    uint256 questId,
    uint256 pubId,
    uint256 profileId,
    address envokerAddress
  );

  constructor(
    string memory _metadataDetails,
    address _kinoraEscrow,
    address _kinoraQuestData,
    address _kinoraAccess,
    address _kinoraMetrics,
    address _kinoraNFTCreator,
    address _hub,
    address _moduleGlobals,
    address _kinoraMilestoneCheckLogic
  ) HubRestricted(_hub) {
    MODULE_GLOBALS = IModuleRegistry(_moduleGlobals);
    kinoraAccessControlI = _kinoraAccess;
    kinoraEscrowI = _kinoraEscrow;
    kinoraQuestDataI = _kinoraQuestData;
    kinoraMetricsI = _kinoraMetrics;
    kinoraNFTCreatorI = _kinoraNFTCreator;
    kinoraMilestoneCheckLogic = KinoraMilestoneCheckLogic(
      _kinoraMilestoneCheckLogic
    );

    _metadata = _metadataDetails;
    _factoryCounter = 0;
  }

  function initializePublicationAction(
    uint256 _profileId,
    uint256 _pubId,
    address _address,
    bytes calldata _data
  ) external override onlyHub returns (bytes memory) {
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
          if (
            !MODULE_GLOBALS.isErc20CurrencyRegistered(
              _params.milestones[i].rewards[j].tokenAddress
            )
          ) {
            revert KinoraErrors.CurrencyNotWhitelisted();
          }

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

    (address _newKE, address _newKQD) = _createFactory(
      _address,
      _factoryId,
      true
    );

    uint256 _questId = KinoraQuestData(_newKQD).getTotalQuestCount() + 1;

    _questConfigure(
      _params,
      _address,
      _newKE,
      _newKQD,
      _profileId,
      _pubId,
      _questId
    );
    return abi.encode(_questId, _profileId, _pubId);
  }

  function processPublicationAction(
    Types.ProcessActionParams calldata _params
  ) external override onlyHub returns (bytes memory) {
    uint256 _factoryId = _factoryGroups[_params.publicationActedProfileId][
      _params.publicationActedId
    ];
    uint256 _questId = _questGroups[_factoryId][
      _params.publicationActedProfileId
    ][_params.publicationActedId];

    (address _ke, address _kqd) = _createFactory(address(0), _factoryId, false);

    if (KinoraQuestData(_kqd).getQuestEnvoker(_questId) == address(0)) {
      revert KinoraErrors.QuestDoesntExist();
    }

    bool _playerJoined = KinoraQuestData(_kqd).getPlayerHasJoinedQuest(
      _params.actorProfileId,
      _questId
    );

    if (_playerJoined) {
      uint256 _playerMilestone = KinoraQuestData(_kqd)
        .getPlayerMilestonesCompletedPerQuest(_params.actorProfileId, _questId);
      string[] memory _videoBytes = KinoraQuestData(_kqd).getMilestoneVideos(
        _questId,
        _playerMilestone + 1
      );

      if (
        !KinoraQuestData(_kqd).getPlayerEligibleToClaimMilestone(
          _params.actorProfileId,
          _questId,
          _playerMilestone + 1
        ) ||
        _playerMilestone == KinoraQuestData(_kqd).getMilestoneCount(_questId)
      ) {
        revert KinoraErrors.PlayerNotEligible();
      }

      _checkMilestoneLogic(
        _videoBytes,
        _kqd,
        _playerMilestone + 1,
        _questId,
        _params.actorProfileId
      );

      _checkMilestoneGate(
        _params.actorProfileOwner,
        _kqd,
        _questId,
        _playerMilestone + 1
      );

      uint256 _rewardLength = KinoraQuestData(_kqd).getMilestoneRewardsLength(
        _questId,
        _playerMilestone + 1
      );

      for (uint256 k = 0; k < _rewardLength; k++) {
        if (
          KinoraQuestData(_kqd).getMilestoneRewardType(
            _questId,
            k,
            _playerMilestone + 1
          ) == KinoraLibrary.RewardType.ERC20
        ) {
          KinoraEscrow(_ke).withdrawERC20(
            _params.actorProfileOwner,
            _questId,
            _playerMilestone + 1,
            k
          );
        } else {
          KinoraEscrow(_ke).mintERC721(
            _params.actorProfileOwner,
            _questId,
            _playerMilestone + 1,
            k
          );
        }
      }

      KinoraQuestData(_kqd).completeMilestone(_questId, _params.actorProfileId);

      emit PlayerCompletedMilestone(
        _questId,
        _playerMilestone + 1,
        _params.actorProfileOwner
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

      _checkJoinEligibility(_params.actorProfileOwner, _kqd, _questId);

      KinoraQuestData(_kqd).joinQuest(
        _params.actorProfileOwner,
        _questId,
        _params.actorProfileId
      );

      emit PlayerJoinedQuest(_params.actorProfileId, _questId);
    }

    return abi.encode(_questId);
  }

  function _checkMilestoneLogic(
    string[] memory _videoBytes,
    address _kqd,
    uint256 _milestone,
    uint256 _questId,
    uint256 _playerProfileId
  ) private {
    for (uint256 i = 0; i < _videoBytes.length; i++) {
      (uint256 _videoProfileId, uint256 _videoPubId) = _splitString(
        _videoBytes[i]
      );

      kinoraMilestoneCheckLogic.checkMilestoneLogic(
        _kqd,
        _milestone,
        _questId,
        _playerProfileId,
        _videoPubId,
        _videoProfileId
      );
    }
  }

  function _questConfigure(
    KinoraLibrary.ActionParameters memory _params,
    address _address,
    address _newKE,
    address _newKQD,
    uint256 _profileId,
    uint256 _pubId,
    uint256 _questId
  ) private {
    _configureRewardEscrow(
      _params.milestones,
      _address,
      _newKE,
      _questId,
      _params.maxPlayerCount
    );

    KinoraQuestData(_newKQD).configureNewQuest(
      KinoraLibrary.NewQuestParams({
        maxPlayerCount: _params.maxPlayerCount,
        gateLogic: _params.gateLogic,
        milestones: _params.milestones,
        uri: _params.uri,
        envokerAddress: _address,
        pubId: _pubId,
        profileId: _profileId
      })
    );

    _questGroups[_factoryCounter][_profileId][_pubId] = _questId;
    _factoryGroups[_profileId][_pubId] = _factoryCounter;
    emit QuestInitialized(_questId, _profileId, _pubId, _address);
  }

  function _configureRewardEscrow(
    KinoraLibrary.MilestoneParameter[] memory _milestones,
    address _envokerAddress,
    address _newKE,
    uint256 _questId,
    uint256 _maxPlayerCount
  ) private {
    for (uint256 i = 0; i < _milestones.length; i++) {
      if (_milestones[i].rewards.length > 0) {
        for (uint256 j = 0; j < _milestones[i].rewards.length; j++) {
          if (
            _milestones[i].rewards[j].rewardType ==
            KinoraLibrary.RewardType.ERC20
          ) {
            IERC20(_milestones[i].rewards[j].tokenAddress).approve(
              _newKE,
              _milestones[i].rewards[j].amount * _maxPlayerCount
            );
            IERC20(_milestones[i].rewards[j].tokenAddress).transferFrom(
              _envokerAddress,
              address(this),
              _milestones[i].rewards[j].amount * _maxPlayerCount
            );

            KinoraEscrow(_newKE).depositERC20(
              _milestones[i].rewards[j].tokenAddress,
              _milestones[i].rewards[j].amount * _maxPlayerCount,
              _questId,
              i
            );
          } else {
            KinoraEscrow(_newKE).depositERC721(
              _milestones[i].rewards[j].uri,
              _questId,
              i,
              j
            );
          }
        }
      }
    }
  }

  function _checkMilestoneGate(
    address _playerAddress,
    address _kqd,
    uint256 _questId,
    uint256 _milestone
  ) private view {
    bool _isOneOf = KinoraQuestData(_kqd).getMilestoneGatedOneOf(
      _questId,
      _milestone
    );
    address[] memory _erc20Addresses = KinoraQuestData(_kqd)
      .getMilestoneGatedERC20Addresses(_questId, _milestone);
    uint256[] memory _erc20Thresholds = KinoraQuestData(_kqd)
      .getMilestoneGatedERC20Thresholds(_questId, _milestone);
    address[] memory _erc721Addresses = KinoraQuestData(_kqd)
      .getMilestoneGatedERC721Addresses(_questId, _milestone);
    uint256[][] memory _erc721TokenIds = KinoraQuestData(_kqd)
      .getMilestoneGatedERC721TokenIds(_questId, _milestone);
    string[][] memory _erc721TokenUris = KinoraQuestData(_kqd)
      .getMilestoneGatedERC721TokenURIs(_questId, _milestone);
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

  function _splitString(
    string memory str
  ) public pure returns (uint256, uint256) {
    bytes memory strBytes = bytes(str);
    uint delimiterIndex;

    for (uint i = 0; i < strBytes.length; i++) {
      if (strBytes[i] == bytes1("-")) {
        delimiterIndex = i;
        break;
      }
    }

    bytes memory part1Bytes = new bytes(delimiterIndex);
    for (uint i = 0; i < delimiterIndex; i++) {
      part1Bytes[i] = strBytes[i];
    }

    bytes memory part2Bytes = new bytes(strBytes.length - delimiterIndex - 1);
    for (uint i = 0; i < part2Bytes.length; i++) {
      part2Bytes[i] = strBytes[i + delimiterIndex + 1];
    }

    string memory part1 = string(part1Bytes);
    string memory part2 = string(part2Bytes);

    return (_hexStringToUint(part1), _hexStringToUint(part2));
  }

  function _hexStringToUint(
    string memory hexString
  ) internal pure returns (uint) {
    bytes memory b = bytes(hexString);
    uint result = 0;
    for (uint i = 0; i < b.length; i++) {
      uint c = uint(uint8(b[i]));

      if (48 <= c && c <= 57) {
        result = result * 16 + (c - 48);
      } else if (65 <= c && c <= 70) {
        result = result * 16 + (c - 55);
      } else if (97 <= c && c <= 102) {
        result = result * 16 + (c - 87);
      }
    }
    return result;
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
    address _envokerAddress,
    uint256 _factoryId,
    bool _initialize
  ) private returns (address, address) {
    if (_factoryId == 0) {
      address _newKAC = Clones.clone(kinoraAccessControlI);
      address _newKE = Clones.clone(kinoraEscrowI);
      address _newKQD = Clones.clone(kinoraQuestDataI);
      address _newKM = Clones.clone(kinoraMetricsI);
      address _newKNC = Clones.clone(kinoraNFTCreatorI);

      KinoraAccessControl(_newKAC).initialize(_envokerAddress, address(this));
      KinoraQuestData(_newKQD).initialize(_newKAC, address(this));
      KinoraMetrics(_newKM).initialize(_newKAC, _newKQD);
      KinoraNFTCreator(_newKNC).initialize(_newKAC, address(this));
      KinoraEscrow(_newKE).initialize(_newKAC, _newKQD, _newKNC, address(this));
      KinoraAccessControl(_newKAC).setRelatedContract(
        _newKE,
        _newKQD,
        _newKM,
        _newKNC
      );
      KinoraNFTCreator(_newKNC).setKinoraEscrowContract(_newKE);
      KinoraQuestData(_newKQD).setKinoraEscrowContract(_newKE);
      KinoraQuestData(_newKQD).setKinoraMetricsContract(_newKM);

      _factoryCounter++;

      _factoryMap[_factoryCounter] = _newKAC;
      emit NewFactoryDeployment(_newKAC, _newKE, _newKQD, _newKM, _newKNC);

      return (_newKE, _newKQD);
    } else {
      address _kac = _factoryMap[_factoryCounter];
      if (
        !KinoraAccessControl(_kac).isEnvoker(_envokerAddress) && _initialize
      ) {
        revert KinoraErrors.InvalidAddress();
      }
      address _ke = KinoraAccessControl(_kac).getKinoraEscrow();
      address _kqd = KinoraAccessControl(_kac).getKinoraQuestData();
      KinoraAccessControl(_kac).getKinoraMetrics();
      KinoraAccessControl(_kac).getKinoraNFTCreator();

      return (_ke, _kqd);
    }
  }

  function supportsInterface(
    bytes4 interfaceId
  ) external view override returns (bool) {
    return
      interfaceId == bytes4(keccak256(abi.encodePacked("LENS_MODULE"))) ||
      interfaceId == type(IPublicationActionModule).interfaceId;
  }

  function getModuleMetadataURI()
    external
    view
    override
    returns (string memory)
  {
    return _metadata;
  }

  function getContractFactoryMap(
    uint256 _factoryId
  ) public view returns (address) {
    return _factoryMap[_factoryId];
  }

  function getQuestId(
    uint256 _factoryId,
    uint256 _profileId,
    uint256 _pubId
  ) public view returns (uint256) {
    return _questGroups[_factoryId][_profileId][_pubId];
  }

  function getContractFactoryId(
    uint256 _profileId,
    uint256 _pubId
  ) public view returns (uint256) {
    return _factoryGroups[_profileId][_pubId];
  }

  function getTotalContractFactoryCount() public view returns (uint256) {
    return _factoryCounter;
  }

  function getKinoraMilestoneCheckLogicAddress() public view returns (address) {
    return address(kinoraMilestoneCheckLogic);
  }
}
