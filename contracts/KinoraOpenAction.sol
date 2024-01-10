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
import "./KinoraQuestData.sol";
import {ILensModule} from "./v2/interfaces/ILensModule.sol";
import {IModuleRegistry} from "./v2/interfaces/IModuleRegistry.sol";
import "hardhat/console.sol";

contract KinoraOpenAction is
  HubRestricted,
  ILensModule,
  IPublicationActionModule
{
  KinoraEscrow public kinoraEscrow;
  KinoraQuestData public kinoraQuestData;
  KinoraAccessControl public kinoraAccess;
  string private _metadata;

  mapping(uint256 => mapping(uint256 => uint256)) _questGroups;

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
  event QuestInitialized(
    uint256 questId,
    uint256 pubId,
    uint256 profileId,
    address envokerAddress
  );

  // Ensures the caller is the maintainer.
  modifier onlyMaintainer() {
    if (!kinoraAccess.isAdmin(msg.sender)) {
      revert KinoraErrors.InvalidAddress();
    }
    _;
  }

  constructor(
    string memory _metadataDetails,
    address _kinoraEscrow,
    address _kinoraQuestData,
    address _kinoraAccess,
    address _hub,
    address _moduleGlobals
  ) HubRestricted(_hub) {
    MODULE_GLOBALS = IModuleRegistry(_moduleGlobals);
    kinoraEscrow = KinoraEscrow(_kinoraEscrow);
    kinoraAccess = KinoraAccessControl(_kinoraAccess);
    kinoraQuestData = KinoraQuestData(_kinoraQuestData);
    _metadata = _metadataDetails;
  }

  function initializePublicationAction(
    uint256 _profileId,
    uint256 _pubId,
    address,
    bytes calldata _data
  ) external override onlyHub returns (bytes memory) {
    KinoraLibrary.ActionParameters memory _params = abi.decode(
      _data,
      (KinoraLibrary.ActionParameters)
    );

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
          // if (
          //   !MODULE_GLOBALS.isErc20CurrencyRegistered(
          //     _params.milestones[i].rewards[j].tokenAddress
          //   )
          // ) {
          //   revert KinoraErrors.CurrencyNotWhitelisted();
          // }

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

    uint256 _questId = kinoraQuestData.getTotalQuestCount() + 1;
    _configureRewardEscrow(
      _params.milestones,
      _params.envokerAddress,
      _questId,
      _params.maxPlayerCount
    );

    kinoraQuestData.configureNewQuest(
      KinoraLibrary.NewQuestParams({
        maxPlayerCount: _params.maxPlayerCount,
        gateLogic: _params.gateLogic,
        milestones: _params.milestones,
        uri: _params.uri,
        envokerAddress: _params.envokerAddress,
        pubId: _pubId,
        profileId: _profileId
      })
    );

    _questGroups[_profileId][_pubId] = _questId;

    emit QuestInitialized(_questId, _profileId, _pubId, _params.envokerAddress);

    return abi.encode(_questId, _profileId, _pubId);
  }

  function processPublicationAction(
    Types.ProcessActionParams calldata _params
  ) external override onlyHub returns (bytes memory) {
    uint256 _questId = _questGroups[_params.publicationActedProfileId][
      _params.publicationActedId
    ];

    bool _playerJoined = kinoraQuestData.getPlayerHasJoinedQuest(
      _params.actorProfileId,
      _questId
    );

    if (_playerJoined) {
      uint256 _playerMilestone = kinoraQuestData
        .getPlayerMilestonesCompletedPerQuest(_params.actorProfileId, _questId);
      string[] memory _videoBytes = kinoraQuestData.getMilestoneVideos(
        _questId,
        _playerMilestone + 1
      );

      if (
        !kinoraQuestData.getPlayerEligibleToClaimMilestone(
          _params.actorProfileId,
          _questId,
          _playerMilestone + 1
        ) || _playerMilestone == kinoraQuestData.getMilestoneCount(_questId)
      ) {
        revert KinoraErrors.PlayerNotEligible();
      }

      for (uint256 i = 0; i < _videoBytes.length; i++) {
        (uint256 _videoProfileId, uint256 _videoPubId) = _splitString(
          _videoBytes[i]
        );

        _checkMilestoneEligibility(
          _playerMilestone + 1,
          _questId,
          _params.actorProfileId,
          _videoPubId,
          _videoProfileId
        );
      }

      _checkMilestoneGate(
        _questId,
        _playerMilestone + 1,
        _params.actorProfileOwner
      );

      uint256 _rewardLength = kinoraQuestData.getMilestoneRewardsLength(
        _questId,
        _playerMilestone + 1
      );

      for (uint256 k = 0; k < _rewardLength; k++) {
        if (
          kinoraQuestData.getMilestoneRewardType(
            _questId,
            k,
            _playerMilestone + 1
          ) == KinoraLibrary.RewardType.ERC20
        ) {
          kinoraEscrow.withdrawERC20(
            _params.actorProfileOwner,
            _questId,
            _playerMilestone + 1,
            k
          );
        } else {
          kinoraEscrow.mintERC721(
            _params.actorProfileOwner,
            _questId,
            _playerMilestone + 1,
            k
          );
        }
      }

      kinoraQuestData.completeMilestone(_questId, _params.actorProfileId);

      emit PlayerCompletedMilestone(
        _questId,
        _playerMilestone + 1,
        _params.actorProfileOwner
      );
    } else {
      if (
        kinoraQuestData.getQuestMaxPlayerCount(_questId) ==
        kinoraQuestData.getQuestPlayers(_questId).length
      ) {
        revert KinoraErrors.MaxPlayerCountReached();
      }

      if (
        kinoraQuestData.getQuestStatus(_questId) == KinoraLibrary.Status.Closed
      ) {
        revert KinoraErrors.QuestClosed();
      }

      _checkJoinEligibility(_questId, _params.actorProfileOwner);

      kinoraQuestData.joinQuest(
        _params.actorProfileOwner,
        _questId,
        _params.actorProfileId
      );

      emit PlayerJoinedQuest(_params.actorProfileId, _questId);
    }

    return abi.encode(_questId);
  }

  function setKinoraQuestDataContract(
    address _newKinoraQuestDataAddress
  ) public onlyMaintainer {
    kinoraQuestData = KinoraQuestData(_newKinoraQuestDataAddress);
  }

  function setKinoraEscrowContract(
    address _newKinoraEscrowAddress
  ) public onlyMaintainer {
    kinoraEscrow = KinoraEscrow(_newKinoraEscrowAddress);
  }

  function setKinoraAccessContract(
    address _newKinoraAccessAddress
  ) public onlyMaintainer {
    kinoraAccess = KinoraAccessControl(_newKinoraAccessAddress);
  }

  function _checkMilestoneEligibility(
    uint256 _milestone,
    uint256 _questId,
    uint256 _playerProfileId,
    uint256 _videoPubId,
    uint256 _videoProfileId
  ) private view {
    if (
      kinoraQuestData.getPlayerVideoAVD(
        _playerProfileId,
        _videoPubId,
        _videoProfileId
      ) <
      kinoraQuestData.getMilestoneVideoMinAVD(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) ||
      kinoraQuestData.getPlayerVideoPlayCount(
        _playerProfileId,
        _videoPubId,
        _videoProfileId
      ) <
      kinoraQuestData.getMilestoneVideoMinPlayCount(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) ||
      kinoraQuestData.getPlayerVideoDuration(
        _playerProfileId,
        _videoPubId,
        _videoProfileId
      ) <
      kinoraQuestData.getMilestoneVideoMinDuration(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) ||
      kinoraQuestData.getPlayerVideoSecondaryQuoteOnQuote(
        _playerProfileId,
        _videoPubId,
        _videoProfileId
      ) <
      kinoraQuestData.getMilestoneVideoMinSecondaryQuoteOnQuote(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) ||
      kinoraQuestData.getPlayerVideoSecondaryMirrorOnQuote(
        _playerProfileId,
        _videoPubId,
        _videoProfileId
      ) <
      kinoraQuestData.getMilestoneVideoMinSecondaryMirrorOnQuote(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) ||
      kinoraQuestData.getPlayerVideoSecondaryReactOnQuote(
        _playerProfileId,
        _videoPubId,
        _videoProfileId
      ) <
      kinoraQuestData.getMilestoneVideoMinSecondaryReactOnQuote(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) ||
      kinoraQuestData.getPlayerVideoSecondaryCommentOnQuote(
        _playerProfileId,
        _videoPubId,
        _videoProfileId
      ) <
      kinoraQuestData.getMilestoneVideoMinSecondaryCommentOnQuote(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) ||
      kinoraQuestData.getPlayerVideoSecondaryCollectOnQuote(
        _playerProfileId,
        _videoPubId,
        _videoProfileId
      ) <
      kinoraQuestData.getMilestoneVideoMinSecondaryCollectOnQuote(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) ||
      kinoraQuestData.getPlayerVideoSecondaryQuoteOnComment(
        _playerProfileId,
        _videoPubId,
        _videoProfileId
      ) <
      kinoraQuestData.getMilestoneVideoMinSecondaryQuoteOnComment(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) ||
      kinoraQuestData.getPlayerVideoSecondaryMirrorOnComment(
        _playerProfileId,
        _videoPubId,
        _videoProfileId
      ) <
      kinoraQuestData.getMilestoneVideoMinSecondaryMirrorOnComment(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) ||
      kinoraQuestData.getPlayerVideoSecondaryReactOnComment(
        _playerProfileId,
        _videoPubId,
        _videoProfileId
      ) <
      kinoraQuestData.getMilestoneVideoMinSecondaryReactOnComment(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) ||
      kinoraQuestData.getPlayerVideoSecondaryCommentOnComment(
        _playerProfileId,
        _videoPubId,
        _videoProfileId
      ) <
      kinoraQuestData.getMilestoneVideoMinSecondaryCommentOnComment(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) ||
      kinoraQuestData.getPlayerVideoSecondaryCollectOnComment(
        _playerProfileId,
        _videoPubId,
        _videoProfileId
      ) <
      kinoraQuestData.getMilestoneVideoMinSecondaryCollectOnComment(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      )
    ) {
      revert KinoraErrors.MilestoneInvalid();
    }

    if (
      kinoraQuestData.getMilestoneVideoBookmark(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) &&
      kinoraQuestData.getPlayerVideoBookmark(
        _playerProfileId,
        _videoPubId,
        _videoProfileId
      ) !=
      kinoraQuestData.getMilestoneVideoBookmark(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      )
    ) {
      revert KinoraErrors.MilestoneInvalid();
    }

    if (
      kinoraQuestData.getMilestoneVideoComment(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) &&
      kinoraQuestData.getPlayerVideoComment(
        _playerProfileId,
        _videoPubId,
        _videoProfileId
      ) !=
      kinoraQuestData.getMilestoneVideoComment(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      )
    ) {
      revert KinoraErrors.MilestoneInvalid();
    }

    if (
      kinoraQuestData.getMilestoneVideoReact(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) &&
      kinoraQuestData.getPlayerVideoReact(
        _playerProfileId,
        _videoPubId,
        _videoProfileId
      ) !=
      kinoraQuestData.getMilestoneVideoReact(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      )
    ) {
      revert KinoraErrors.MilestoneInvalid();
    }

    if (
      kinoraQuestData.getMilestoneVideoQuote(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) &&
      kinoraQuestData.getPlayerVideoQuote(
        _playerProfileId,
        _videoPubId,
        _videoProfileId
      ) !=
      kinoraQuestData.getMilestoneVideoQuote(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      )
    ) {
      revert KinoraErrors.MilestoneInvalid();
    }

    if (
      kinoraQuestData.getMilestoneVideoMirror(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) &&
      kinoraQuestData.getPlayerVideoMirror(
        _playerProfileId,
        _videoPubId,
        _videoProfileId
      ) !=
      kinoraQuestData.getMilestoneVideoMirror(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      )
    ) {
      revert KinoraErrors.MilestoneInvalid();
    }
  }

  function _configureRewardEscrow(
    KinoraLibrary.MilestoneParameter[] memory _milestones,
    address _envokerAddress,
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
            kinoraEscrow.depositERC20(
              _milestones[i].rewards[j].tokenAddress,
              _envokerAddress,
              _milestones[i].rewards[j].amount * _maxPlayerCount,
              _questId,
              i
            );
          } else {
            kinoraEscrow.depositERC721(
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
    uint256 _questId,
    uint256 _milestone,
    address _playerAddress
  ) private view {
    bool _isOneOf = kinoraQuestData.getMilestoneGatedOneOf(
      _questId,
      _milestone
    );
    address[] memory _erc20Addresses = kinoraQuestData
      .getMilestoneGatedERC20Addresses(_questId, _milestone);
    uint256[] memory _erc20Thresholds = kinoraQuestData
      .getMilestoneGatedERC20Thresholds(_questId, _milestone);
    address[] memory _erc721Addresses = kinoraQuestData
      .getMilestoneGatedERC721Addresses(_questId, _milestone);
    uint256[][] memory _erc721TokenIds = kinoraQuestData
      .getMilestoneGatedERC721TokenIds(_questId, _milestone);
    string[][] memory _erc721TokenUris = kinoraQuestData
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
    uint256 _questId,
    address _playerAddress
  ) private view {
    bool _isOneOf = kinoraQuestData.getQuestGatedOneOf(_questId);
    address[] memory _erc20Addresses = kinoraQuestData
      .getQuestGatedERC20Addresses(_questId);
    uint256[] memory _erc20Thresholds = kinoraQuestData
      .getQuestGatedERC20Thresholds(_questId);
    address[] memory _erc721Addresses = kinoraQuestData
      .getQuestGatedERC721Addresses(_questId);
    uint256[][] memory _erc721TokenIds = kinoraQuestData
      .getQuestGatedERC721TokenIds(_questId);
    string[][] memory _erc721TokenUris = kinoraQuestData
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
}
