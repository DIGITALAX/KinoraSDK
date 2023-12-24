// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.16;

import {HubRestricted} from "./v2/base/HubRestricted.sol";
import {Types} from "./v2/libraries/constants/Types.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IPublicationActionModule} from "./v2/interfaces/IPublicationActionModule.sol";
import "./KinoraLibrary.sol";
import "./KinoraQuest.sol";
import "./KinoraEscrow.sol";
import "./KinoraErrors.sol";
import "./KinoraQuestData.sol";
import {ILensModule} from "./v2/interfaces/ILensModule.sol";
import {IModuleRegistry} from "./v2/interfaces/IModuleRegistry.sol";

contract KinoraOpenAction is
  HubRestricted,
  ILensModule,
  IPublicationActionModule
{
  KinoraQuest kinoraQuest;
  KinoraEscrow kinoraEscrow;
  KinoraQuestData kinoraQuestData;
  string private _metadata;

  mapping(uint256 => mapping(uint256 => uint256)) _questGroups;

  IModuleRegistry public immutable MODULE_GLOBALS;

  event PlayerCompletedMilestone(
    uint256 questId,
    uint256 milestoneId,
    uint256 pubId,
    uint256 profileId,
    address envokerAddress
  );
  event PlayerCompletedQuest(
    uint256 questId,
    uint256 pubId,
    uint256 profileId,
    address envokerAddress
  );
  event QuestInitialized(
    uint256 questId,
    uint256 pubId,
    uint256 profileId,
    address envokerAddress
  );

  constructor(
    string memory _metadataDetails,
    address _kinoraQuest,
    address _kinoraEscrow,
    address _kinoraQuestData,
    address _hub,
    address _moduleGlobals
  ) HubRestricted(_hub) {
    MODULE_GLOBALS = IModuleRegistry(_moduleGlobals);
    kinoraQuest = KinoraQuest(_kinoraQuest);
    kinoraEscrow = KinoraEscrow(_kinoraEscrow);
    kinoraQuestData = KinoraQuestData(_kinoraQuestData);
    _metadata = _metadataDetails;
  }

  function initializePublicationAction(
    uint256 _profileId,
    uint256 _pubId,
    address _executor,
    bytes calldata _data
  ) external override onlyHub returns (bytes memory) {
    (
      KinoraLibrary.GatingLogic memory _gateLogic,
      uint256 _maxPlayerCount,
      KinoraLibrary.Milestone[] memory _milestones,
      address _envokerAddress
    ) = abi.decode(
        _data,
        (KinoraLibrary.GatingLogic, uint256, KinoraLibrary.Milestone[], address)
      );

    for (uint256 i = 0; i < _milestones.length; i++) {
      for (uint256 j = 0; j < _milestones[i].rewards.length; j++) {
        if (
          _milestones[i].rewards[j].rewardType == KinoraLibrary.RewardType.ERC20
        ) {
          if (
            !MODULE_GLOBALS.isErc20CurrencyRegistered(
              _milestones[i].rewards[j].tokenAddress
            )
          ) {
            revert KinoraErrors.CurrencyNotWhitelisted();
          }

          if (_milestones[i].rewards[j].amount <= 0) {
            revert KinoraErrors.InvalidRewardAmount();
          }
        }
      }
    }

    _configureRewardEscrow(_milestones, _envokerAddress);

    uint256 _questId = kinoraQuest.configureQuest(
      KinoraLibrary.NewQuestParams({
        maxPlayerCount: _maxPlayerCount,
        gateLogic: _gateLogic,
        milestones: _milestones,
        envokerAddress: _envokerAddress,
        pubId: _pubId,
        profileId: _profileId
      })
    );

    _questGroups[_profileId][_pubId] = _questId;

    emit QuestInitialized(_questId, _profileId, _pubId, _envokerAddress);

    return abi.encode(_questId, _profileId, _pubId);
  }

  function processPublicationAction(
    Types.ProcessActionParams calldata _params
  ) external override onlyHub returns (bytes memory) {
    KinoraLibrary.GatingLogic memory _gateLogic = abi.decode(
      _params.actionModuleData,
      (KinoraLibrary.GatingLogic)
    );

    uint256 _questId = _questGroups[publicationActedProfileId][
      publicationActedId
    ];

    bool _playerJoined = kinoraQuestData.getPlayerHasJoinedQuest(
      _params.actorProfileId
    );

    if (_playerJoined) {
      uint256 _playerMilestone = kinoraQuestData
        .getPlayerMilestonesCompletedPerQuest(_questId);
      uint256 _videoLength = kinoraQuestData.getMilestoneVideoLength();

      for (uint256 = i; i < _videoLength; i++) {
        KinoraLibrary.Video memory _video = kinoraQuestData
          .getMilestoneVideoByIndex(i);

        _checkMilestoneEligibility(
          _video,
          _playerMilestone,
          _questId,
          _params.actorProfileId
        );
      }

      kinoraQuest.playerCompleteMilestone(
        _params.publicationActedProfileId,
        _params.publicationActedId,
        _playerMilestone,
        _params.actorProfileId
      );

      emit PlayerCompletedMilestone(
        _params.actorProfileOwner,
        _questId,
        _milestoneId,
        _params.publicationActedId,
        _params.publicationActedProfileId
      );
    } else {
      if (
        kinoraQuestData.getQuestMaxPlayerCount() ==
        kinoraQuestData.getQuestPlayers().length
      ) {
        revert KinoraErrors.MaxPlayerCountReached();
      }

      _checkJoinEligibility(_questId);

      kinoraQuest.playerJoinQuest(
        _params.actorProfileOwner,
        _params.publicationActedId,
        _params.publicationActedProfileId
      );

      emit PlayerJoinedQuest(
        _params.actorProfileOwner,
        _questId,
        _params.publicationActedId,
        _params.publicationActedProfileId
      );
    }

    return abi.encode(_questId);
  }

  function setKinoraQuestContract(
    address _newKinoraQuestAddress
  ) public onlyAdmin {
    kinoraQuest = KinoraQuest(_newKinoraQuestAddress);
  }

  function setKinoraQuestDataContract(
    address _newKinoraQuestDataAddress
  ) public onlyAdmin {
    kinoraQuestData = KinoraQuestData(_newKinoraQuestDataAddress);
  }

  function setKinoraEscrowContract(
    address _newKinoraQuestDataAddress
  ) public onlyAdmin {
    kinoraEscrowData = KinoraEscrowData(_newKinoraEscrowAddress);
  }

  function _checkMilestoneEligibility(
    KinoraLibrary.Video memory _video,
    uint256 _milestone,
    uint256 _questId,
    uint256 _playerProfileId,
    uint256 _videoIndex
  ) private {
    kinoraQuestData.getVideoMilestoneMinEngagementRate(_questId, _milestone);
    kinoraQuestData.getMilestoneMinDuration(_questId, _milestone);
    kinoraQuestData.getMilestoneLensQuote(_questId, _milestone);
    kinoraQuestData.getMilestoneLensMirror(_questId, _milestone);
    kinoraQuestData.getMilestoneLensComment(_questId, _milestone);
    kinoraQuestData.getMilestoneLensCollect(_questId, _milestone);
    kinoraQuestData.getMilestoneLensReact(_questId, _milestone);
    kinoraQuestData.getMilestoneLensBookmark(_questId, _milestone);

    if (
      kinoraQuestData.getPlayerMilestonePlayCount(
        _questId,
        _milestone,
        _playerProfileId,
        _videIndex
      ) <
      _video.minPlayCount ||
      kinoraQuestData.getPlayerMilestoneCTR(
        _questId,
        _milestone,
        _playerProfileId,
        _videIndex
      ) <
      _video.minCTR ||
      kinoraQuestData.getPlayerMilestoneAVD(
        _questId,
        _milestone,
        _playerProfileId,
        _videoIndex
      ) <
      _video.minAVD ||
      kinoraQuestData.getPlayerMilestoneImpressionCount(
        _questId,
        _milestone,
        _playerProfileId,
        _videoIndex
      ) <
      _video.minImpressionCount ||
      kinoraQuestData.getPlayerMilestoneEngagementRate(
        _questId,
        _milestone,
        _playerProfileId,
        _videoIndex
      ) <
      _video.minEngagementRate ||
      kinoraQuestData.getPlayerMilestoneComment(
        _questId,
        _milestone,
        _playerProfileId,
        _videoIndex
      ) <
      _video.comment ||
      kinoraQuestData.getPlayerMilestoneReact(
        _questId,
        _milestone,
        _playerProfileId,
        _videoIndex
      ) <
      _video.react ||
      kinoraQuestData.getPlayerMilestoneCollect(
        _questId,
        _milestone,
        _playerProfileId,
        _videoIndex
      ) <
      _video.collect ||
      kinoraQuestData.getPlayerMilestoneQuote(
        _questId,
        _milestone,
        _playerProfileId,
        _videoIndex
      ) <
      _video.quote ||
      kinoraQuestData.getPlayerMilestoneMirror(
        _questId,
        _milestone,
        _playerProfileId,
        _videoIndex
      ) <
      _video.mirror ||
      kinoraQuestData.getPlayerMilestoneBookmark(
        _questId,
        _milestone,
        _playerProfileId,
        _videoIndex
      ) <
      _video.bookmark
    ) {
      revert KinoraErrors.MilestoneInvalid();
    }
  }

  function _configureRewardEscrow(
    KinoraLibrary.Milestone[] _milestones,
    address _envokerAddress,
    uint256 _pubId,
    uint256 _profileId
  ) private {
    for (uint256 i = 0; i < _milestones.length; i++) {
      for (uint256 j = 0; j < _milestones[i].rewards.length; j++) {
        if (
          _milestones[i].rewards[j].rewardType == KinoraLibrary.RewardType.ERC20
        ) {
          IERC20(_milestones[i].rewards[j].tokenAddress).depositERC20(
            _envokerAddress,
            address(_kinoraEscrow),
            _milestones[i].rewards[j].amount
          );
          kinoraEscrow.depositERC20(
            _milestones[i].rewards[j].tokenAddress,
            _envokerAddress,
            _milestones[i].rewards[j].amount,
            _pubId,
            _profileId,
            i
          );
        } else {
          kinoraEscrow.depositERC721(
            _milestones[i].rewards[j].uri,
            _pubId,
            _profileId,
            i
          );
        }
      }
    }
  }

  function _checkMilestoneGate(
    uint256 _questId,
    address _playerAddress
  ) private {
    bool isOneOf = kinoraQuestData.getQuestMilestoneGatedOneOf(_questId);
    address[] memory erc20Addresses = kinoraQuestData
      .getQuestMilestoneGatedERC20Addresses(_questId);
    uint256[] memory erc20Thresholds = kinoraQuestData
      .getQuestMilestoneGatedERC20Thresholds(_questId);
    address[] memory erc721Addresses = kinoraQuestData
      .getQuestMilestoneGatedERC721Addresses(_questId);
    uint256[][] memory erc721Tokens = kinoraQuestData
      .getQuestMilestoneGatedERC721Tokens(_questId);

    if (
      !_gateChecker(
        isOneOf,
        erc20Addresses,
        erc20Thresholds,
        erc721Addresses,
        erc721Tokens
      )
    ) {
      revert KinoraErrors.PlayerNotEligible();
    }
  }

  function _checkJoinEligibility(uint256 _milestone) private {
    bool isOneOf = kinoraQuestData.getQuestGatedOneOf(_questId);
    address[] memory erc20Addresses = kinoraQuestData
      .getQuestGatedERC20Addresses(_questId);
    uint256[] memory erc20Thresholds = kinoraQuestData
      .getQuestGatedERC20Thresholds(_questId);
    address[] memory erc721Addresses = kinoraQuestData
      .getQuestGatedERC721Addresses(_questId);
    uint256[][] memory erc721Tokens = kinoraQuestData.getQuestGatedERC721Tokens(
      _questId
    );

    if (
      !_gateChecker(
        isOneOf,
        erc20Addresses,
        erc20Thresholds,
        erc721Addresses,
        erc721Tokens
      )
    ) {
      revert KinoraErrors.PlayerNotEligible();
    }
  }

  function _gateChecker() private returns (bool) {
    bool oneERC20ConditionMet = false;
    bool oneERC721ConditionMet = false;

    for (uint i = 0; i < erc20Addresses.length; i++) {
      uint256 playerBalance = IERC20(erc20Addresses[i]).balanceOf(
        _playerAddress
      );
      if (playerBalance >= erc20Thresholds[i]) {
        if (isOneOf) {
          oneERC20ConditionMet = true;
          break;
        }
      } else if (!isOneOf) {
        return false;
      }
    }

    if (isOneOf && oneERC20ConditionMet) {
      return true;
    }

    for (uint i = 0; i < erc721Addresses.length; i++) {
      for (uint j = 0; j < erc721Tokens[i].length; j++) {
        if (
          IERC721(erc721Addresses[i]).ownerOf(erc721Tokens[i][j]) ==
          _playerAddress
        ) {
          if (isOneOf) {
            oneERC721ConditionMet = true;
            break;
          }
        } else if (!isOneOf) {
          return false;
        }
      }

      if (isOneOf && oneERC721ConditionMet) {
        return true;
      }
    }

    if (isOneOf) {
      return false;
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
}
