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

contract KinoraOpenAction is
  HubRestricted,
  ILensModule,
  IPublicationActionModule
{
  KinoraEscrow kinoraEscrow;
  KinoraQuestData kinoraQuestData;
  KinoraAccessControl kinoraAccess;
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
    address _executor,
    bytes calldata _data
  ) external override onlyHub returns (bytes memory) {
    KinoraLibrary.ActionParameters memory _params = abi.decode(
      _data,
      (KinoraLibrary.ActionParameters)
    );

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
    }

    uint256 _questId = kinoraQuestData.getTotalQuestCount() + 1;

    _configureRewardEscrow(
      _params.milestones,
      _params.envokerAddress,
      _questId
    );

    kinoraQuestData.configureNewQuest(
      KinoraLibrary.NewQuestParams({
        maxPlayerCount: _params.maxPlayerCount,
        gateLogic: _params.gateLogic,
        milestones: _params.milestones,
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
    (uint256 _videoProfileId, uint256 _videoPubId) = abi.decode(
      _params.actionModuleData,
      (uint256, uint256)
    );

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
      uint256 _videoLength = kinoraQuestData.getMilestoneVideoLength(
        _questId,
        _playerMilestone
      );

      if (
        !kinoraQuestData.getPlayerEligibleToClaimMilestone(
          _questId,
          _playerMilestone,
          _params.actorProfileId
        )
      ) {
        revert KinoraErrors.PlayerNotEligible();
      }

      for (uint256 i = 0; i < _videoLength; i++) {
        _checkMilestoneEligibility(
          _playerMilestone,
          _questId,
          _params.actorProfileId,
          _videoProfileId,
          _videoPubId
        );
      }

      _checkMilestoneGate(
        _questId,
        _playerMilestone,
        _params.actorProfileOwner
      );

      uint256 _rewardLength = kinoraQuestData.getMilestoneRewardsLength(
        _questId,
        _playerMilestone
      );

      for (uint256 k = 0; k < _rewardLength; k++) {
        if (
          kinoraQuestData.getMilestoneRewardType(
            _questId,
            k,
            _playerMilestone
          ) == KinoraLibrary.RewardType.ERC20
        ) {
          kinoraEscrow.withdrawERC20(
            _params.actorProfileOwner,
            _questId,
            _playerMilestone
          );
        } else {
          kinoraEscrow.mintERC721(
            _params.actorProfileOwner,
            _questId,
            _playerMilestone
          );
        }
      }

      kinoraQuestData.completeMilestone(_questId, _params.actorProfileId);

      emit PlayerCompletedMilestone(
        _questId,
        _playerMilestone,
        _params.actorProfileOwner
      );
    } else {
      if (
        kinoraQuestData.getQuestMaxPlayerCount(_questId) ==
        kinoraQuestData.getQuestPlayers(_questId).length
      ) {
        revert KinoraErrors.MaxPlayerCountReached();
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
      kinoraQuestData.getPlayerVideoCTR(
        _playerProfileId,
        _videoPubId,
        _videoProfileId
      ) <
      kinoraQuestData.getMilestoneVideoMinCTR(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) ||
      kinoraQuestData.getPlayerVideoImpressionCount(
        _playerProfileId,
        _videoPubId,
        _videoProfileId
      ) <
      kinoraQuestData.getMilestoneVideoMinImpressionCount(
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
      kinoraQuestData.getPlayerVideoEngagementRate(
        _playerProfileId,
        _videoPubId,
        _videoProfileId
      ) <
      kinoraQuestData.getMilestoneVideoMinEngagementRate(
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
      ) ||
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
      ) ||
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
      ) ||
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
      ) ||
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
    uint256 _questId
  ) private {
    for (uint256 i = 0; i < _milestones.length; i++) {
      for (uint256 j = 0; j < _milestones[i].rewards.length; j++) {
        if (
          _milestones[i].rewards[j].rewardType == KinoraLibrary.RewardType.ERC20
        ) {
          kinoraEscrow.depositERC20(
            _milestones[i].rewards[j].tokenAddress,
            _envokerAddress,
            _milestones[i].rewards[j].amount,
            _questId,
            i
          );
        } else {
          kinoraEscrow.depositERC721(
            _milestones[i].rewards[j].uri,
            _questId,
            i
          );
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
    KinoraLibrary.TokenData[] memory _erc721Tokens = kinoraQuestData
      .getMilestoneGatedERC721Tokens(_questId, _milestone);
    if (
      !_gateChecker(
        _erc721Tokens,
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
    KinoraLibrary.TokenData[] memory _erc721Tokens = kinoraQuestData
      .getQuestGatedERC721Tokens(_questId);
    if (
      !_gateChecker(
        _erc721Tokens,
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
    KinoraLibrary.TokenData[] memory _erc721TokensData,
    address[] memory _erc20Addresses,
    address[] memory _erc721Addresses,
    uint256[] memory _erc20Thresholds,
    address _playerAddress,
    bool _isOneOf
  ) private view returns (bool) {
    bool _oneERC20ConditionMet = false;
    bool _oneERC721ConditionMet = false;

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

    if (_isOneOf && _oneERC20ConditionMet) {
      return true;
    }

    for (uint i = 0; i < _erc721Addresses.length; i++) {
      KinoraLibrary.TokenData memory tokenData = _erc721TokensData[i];

      if (tokenData.matchType == KinoraLibrary.TokenType.Token) {
        for (uint j = 0; j < tokenData.ids.length; j++) {
          if (
            IERC721(_erc721Addresses[i]).ownerOf(tokenData.ids[j]) ==
            _playerAddress
          ) {
            if (_isOneOf) {
              return true;
            }
            _oneERC721ConditionMet = true;
            break;
          }
        }
      } else if (tokenData.matchType == KinoraLibrary.TokenType.Collection) {
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
          for (uint256 k = 0; k < tokenData.uris.length; k++) {
            if (
              keccak256(abi.encodePacked(_tokenURI)) ==
              keccak256(abi.encodePacked(tokenData.uris[k]))
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
      if (_oneERC721ConditionMet && !_isOneOf) {
        break;
      }
    }

    if (_isOneOf && (_oneERC20ConditionMet || _oneERC721ConditionMet)) {
      return true;
    } else if (!_isOneOf && _oneERC20ConditionMet && _oneERC721ConditionMet) {
      return true;
    }
    return false;
  }

  function _fetchTokenIdByIndex(
    address _erc721Address,
    address _owner,
    uint256 _index
  ) private view returns (uint256) {
    return
      IERC721Enumerable(_erc721Address).tokenOfOwnerByIndex(_owner, _index);
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
