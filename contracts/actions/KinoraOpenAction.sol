// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.16;

import {HubRestricted} from "./../lens/v2/base/HubRestricted.sol";
import {Types} from "./../lens/v2/libraries/constants/Types.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IPublicationActionModule} from "./../lens/v2/interfaces/IPublicationActionModule.sol";
import {IModuleGlobals} from "./../lens/v2/interfaces/IModuleGlobals.sol";
import "./../KinoraFactory.sol";
import "./../KinoraQuestData.sol";

interface IKinoraEscrow {
  function depositERC20(
    address tokenAddress,
    address fromAddress,
    uint256 amount,
    uint256 pubId,
    uint256 milestone
  ) external;

  function depositERC721(
    string memory uri,
    uint256 pubId,
    uint256 milestone
  ) external;
}

interface IKinoraQuest {
  function instantiateNewQuest(
    KinoraLibrary.Milestone[] memory milestones,
    bytes32 joinHash,
    uint256 maxPlayerCount,
    uint256 pubId,
    uint256 profileId
  ) external;

  function playerJoinQuest(
    address playerAddress,
    uint256 pubId,
    uint256 playerProfileId
  ) external;

  function playerCompleteMilestone(
    uint256 pubId,
    uint256 milestone,
    uint256 playerProfileId
  ) external;
}

contract KinoraOpenAction is HubRestricted, IPublicationActionModule {
  KinoraFactory public kinoraFactory;
  KinoraQuestData public kinoraQuestData;

  error CurrencyNotWhitelisted();
  error InvalidAddress();
  error InvalidAmounts();

  IModuleGlobals public immutable MODULE_GLOBALS;
  mapping(uint256 => mapping(uint256 => address)) _granteeReceiver;

  event QuestInitialized(
    address questDeployer,
    uint256 profileId,
    uint256 pubId,
    bytes32 joinHash
  );
  event MilestoneCompleted(
    uint256 playerProfileId,
    uint256 profileId,
    uint256 pubId,
    uint256 milestone
  );
  event QuestJoined(
    address playerAddress,
    uint256 playerProfileId,
    uint256 profileId,
    uint256 pubId
  );

  constructor(
    address _hub,
    address _moduleGlobals,
    address _kinoraFactoryAddress,
    address _kinoraQuestDataAddress
  ) HubRestricted(_hub) {
    MODULE_GLOBALS = IModuleGlobals(_moduleGlobals);
    kinoraFactory = KinoraFactory(_kinoraFactoryAddress);
    kinoraQuestData = KinoraQuestData(_kinoraQuestDataAddress);
  }

  function initializePublicationAction(
    uint256 _profileId,
    uint256 _pubId,
    address _questDeployer,
    bytes calldata _data
  ) external override onlyHub returns (bytes memory) {
    (
      KinoraLibrary.InitializeAction memory _params,
      KinoraLibrary.Milestone[] memory _milestones
    ) = abi.decode(
        _data,
        (KinoraLibrary.InitializeAction, KinoraLibrary.Milestone[])
      );

    address _questContract;
    address _escrowContract;
    if (
      _questDeployer != kinoraFactory.getPKPToDeployer(_params.developerPKP)
    ) {
      (_questContract, _escrowContract) = kinoraFactory.deployFromKinoraFactory(
        _params.developerPKP,
        _questDeployer,
        _profileId,
        _pubId
      );
    } else {
      _questContract = kinoraFactory.getPKPToDeployedKinoraQuest(
        _params.developerPKP
      );
      _escrowContract = kinoraFactory.getPKPToDeployedKinoraEscrow(
        _params.developerPKP
      );
    }

    _depositMilestoneRewards(
      KinoraLibrary.InitializeDeposit({
        milestones: _milestones,
        joinHash: _params.joinHash,
        escrowContract: _escrowContract,
        questContract: _questContract,
        questDeployer: _questDeployer,
        maxPlayerCount: _params.maxPlayerCount,
        profileId: _profileId,
        pubId: _pubId
      })
    );

    emit QuestInitialized(_questDeployer, _profileId, _pubId, _params.joinHash);

    return _data;
  }

  function processPublicationAction(
    Types.ProcessActionParams calldata _params
  ) external override onlyHub returns (bytes memory) {
    (address _developerPKP, uint256 _milestone) = abi.decode(
      _params.actionModuleData,
      (address, uint256)
    );

    address _kinoraQuest = kinoraFactory.getPKPToDeployedKinoraQuest(
      _developerPKP
    );

    if (
      kinoraQuestData.getPlayerHasJoinedQuest(
        _params.actorProfileId,
        _params.publicationActedProfileId,
        _params.publicationActedId
      ) && _milestone != 0
    ) {
      IKinoraQuest(_kinoraQuest).playerCompleteMilestone(
        _params.publicationActedId,
        _milestone,
        _params.actorProfileId
      );

      emit MilestoneCompleted(
        _params.actorProfileId,
        _params.publicationActedProfileId,
        _params.publicationActedId,
        _milestone
      );
    } else {
      IKinoraQuest(_kinoraQuest).playerJoinQuest(
        _params.transactionExecutor,
        _params.publicationActedId,
        _params.actorProfileId
      );

      emit QuestJoined(
        _params.transactionExecutor,
        _params.actorProfileId,
        _params.publicationActedProfileId,
        _params.publicationActedId
      );
    }

    return abi.encode(_developerPKP, _milestone);
  }

  function _depositMilestoneRewards(
    KinoraLibrary.InitializeDeposit memory _params
  ) internal {
    for (uint256 i; i < _params.milestones.length; i++) {
      if (
        _params.milestones[i].reward.rewardType ==
        KinoraLibrary.RewardType.ERC20
      ) {
        IKinoraEscrow(_params.escrowContract).depositERC20(
          _params.milestones[i].reward.tokenAddress,
          _params.questDeployer,
          _params.milestones[i].reward.amount,
          _params.pubId,
          i + 1
        );
      } else {
        IKinoraEscrow(_params.escrowContract).depositERC721(
          _params.milestones[i].reward.uri,
          _params.pubId,
          i + 1
        );
      }
    }

    IKinoraQuest(_params.questContract).instantiateNewQuest(
      _params.milestones,
      _params.joinHash,
      _params.maxPlayerCount,
      _params.pubId,
      _params.profileId
    );
  }
}
