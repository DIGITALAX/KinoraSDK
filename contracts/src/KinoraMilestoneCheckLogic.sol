// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.26;

import "./KinoraQuestData.sol";
import "./KinoraAccessControl.sol";
import "./KinoraOpenAction.sol";

contract KinoraMilestoneCheckLogic {
  KinoraOpenAction public kinoraOpenAction;

  function freezeSetKinoraOpenAction(address kinoraOpenActionAddress) public {
    if (address(kinoraOpenAction) != address(0)) {
      revert KinoraErrors.InvalidAddress();
    }

    kinoraOpenAction = KinoraOpenAction(kinoraOpenActionAddress);
  }

  function checkMilestoneLogic(
    address kqd,
    address playerProfile,
    uint256 milestone,
    uint256 questId,
    uint256 videoPostId
  ) external view {
    uint256[] memory _factoryIds = KinoraQuestData(kqd)
      .getMilestoneVideoFactoryIds(questId, milestone, videoPostId);

    if (_factoryIds.length < 1) {
      _checkEligibilityLoopLocal(
        kqd,
        playerProfile,
        questId,
        milestone,
        videoPostId
      );
    } else {
      KinoraLibrary.AggregateParams memory _agParams = _aggregateGlobalMetrics(
        _factoryIds,
        kqd,
        playerProfile,
        videoPostId
      );

      _checkEligibilityLoopGlobal(
        _agParams,
        kqd,
        questId,
        milestone,
        videoPostId
      );
    }
  }

  function _aggregateGlobalMetrics(
    uint256[] memory factoryIds,
    address kqd,
    address playerProfile,
    uint256 videoPostId
  ) private view returns (KinoraLibrary.AggregateParams memory) {
    KinoraLibrary.AggregateParams memory _agged;

    for (uint256 h = 0; h <= factoryIds.length; h++) {
      KinoraQuestData kinoraQuestDataContract;
      if (h == factoryIds.length) {
        kinoraQuestDataContract = KinoraQuestData(kqd);
      } else {
        kinoraQuestDataContract = KinoraQuestData(
          KinoraAccessControl(
            kinoraOpenAction.getContractFactoryMap(factoryIds[h])
          ).getKinoraQuestData()
        );
      }

      _agged.avd += kinoraQuestDataContract.getPlayerVideoAVD(
        playerProfile,
        videoPostId
      );
      _agged.playCount += kinoraQuestDataContract.getPlayerVideoPlayCount(
        playerProfile,
        videoPostId
      );
      _agged.secondaryQuoteOnQuote += kinoraQuestDataContract
        .getPlayerVideoSecondaryQuoteOnQuote(playerProfile, videoPostId);
      _agged.secondaryMirrorOnQuote += kinoraQuestDataContract
        .getPlayerVideoSecondaryMirrorOnQuote(playerProfile, videoPostId);
      _agged.secondaryReactOnQuote += kinoraQuestDataContract
        .getPlayerVideoSecondaryReactOnQuote(playerProfile, videoPostId);
      _agged.secondaryCommentOnQuote += kinoraQuestDataContract
        .getPlayerVideoSecondaryCommentOnQuote(playerProfile, videoPostId);
      _agged.secondaryCollectOnQuote += kinoraQuestDataContract
        .getPlayerVideoSecondaryCollectOnQuote(playerProfile, videoPostId);
      _agged.secondaryQuoteOnComment += kinoraQuestDataContract
        .getPlayerVideoSecondaryQuoteOnComment(playerProfile, videoPostId);
      _agged.secondaryMirrorOnComment += kinoraQuestDataContract
        .getPlayerVideoSecondaryMirrorOnComment(playerProfile, videoPostId);
      _agged.secondaryReactOnComment += kinoraQuestDataContract
        .getPlayerVideoSecondaryReactOnComment(playerProfile, videoPostId);
      _agged.secondaryCommentOnComment += kinoraQuestDataContract
        .getPlayerVideoSecondaryCommentOnComment(playerProfile, videoPostId);
      _agged.secondaryCollectOnComment += kinoraQuestDataContract
        .getPlayerVideoSecondaryCollectOnComment(playerProfile, videoPostId);
      _agged.duration += kinoraQuestDataContract.getPlayerVideoDuration(
        playerProfile,
        videoPostId
      );

      if (!_agged.hasQuoted) {
        _agged.hasQuoted = kinoraQuestDataContract.getPlayerVideoQuote(
          playerProfile,
          videoPostId
        );
      }

      if (!_agged.hasReacted) {
        _agged.hasReacted = kinoraQuestDataContract.getPlayerVideoReact(
          playerProfile,
          videoPostId
        );
      }

      if (!_agged.hasBookmarked) {
        _agged.hasBookmarked = kinoraQuestDataContract.getPlayerVideoBookmark(
          playerProfile,
          videoPostId
        );
      }

      if (!_agged.hasCommented) {
        _agged.hasCommented = kinoraQuestDataContract.getPlayerVideoComment(
          playerProfile,
          videoPostId
        );
      }

      if (!_agged.hasMirrored) {
        _agged.hasMirrored = kinoraQuestDataContract.getPlayerVideoMirror(
          playerProfile,
          videoPostId
        );
      }
    }

    return _agged;
  }

  function _checkEligibilityLoopGlobal(
    KinoraLibrary.AggregateParams memory agParams,
    address kqd,
    uint256 questId,
    uint256 milestone,
    uint256 videoPostId
  ) private view {
    if (
      agParams.avd <
      KinoraQuestData(kqd).getMilestoneVideoMinAVD(
        questId,
        milestone,
        videoPostId
      ) ||
      agParams.playCount <
      KinoraQuestData(kqd).getMilestoneVideoMinPlayCount(
        questId,
        milestone,
        videoPostId
      ) ||
      agParams.duration <
      KinoraQuestData(kqd).getMilestoneVideoMinDuration(
        questId,
        milestone,
        videoPostId
      ) ||
      agParams.secondaryQuoteOnQuote <
      KinoraQuestData(kqd).getMilestoneVideoMinSecondaryQuoteOnQuote(
        questId,
        milestone,
        videoPostId
      ) ||
      agParams.secondaryMirrorOnQuote <
      KinoraQuestData(kqd).getMilestoneVideoMinSecondaryMirrorOnQuote(
        questId,
        milestone,
        videoPostId
      ) ||
      agParams.secondaryReactOnQuote <
      KinoraQuestData(kqd).getMilestoneVideoMinSecondaryReactOnQuote(
        questId,
        milestone,
        videoPostId
      ) ||
      agParams.secondaryCommentOnQuote <
      KinoraQuestData(kqd).getMilestoneVideoMinSecondaryCommentOnQuote(
        questId,
        milestone,
        videoPostId
      ) ||
      agParams.secondaryCollectOnQuote <
      KinoraQuestData(kqd).getMilestoneVideoMinSecondaryCollectOnQuote(
        questId,
        milestone,
        videoPostId
      ) ||
      agParams.secondaryQuoteOnComment <
      KinoraQuestData(kqd).getMilestoneVideoMinSecondaryQuoteOnComment(
        questId,
        milestone,
        videoPostId
      ) ||
      agParams.secondaryMirrorOnComment <
      KinoraQuestData(kqd).getMilestoneVideoMinSecondaryMirrorOnComment(
        questId,
        milestone,
        videoPostId
      ) ||
      agParams.secondaryReactOnComment <
      KinoraQuestData(kqd).getMilestoneVideoMinSecondaryReactOnComment(
        questId,
        milestone,
        videoPostId
      ) ||
      agParams.secondaryCommentOnComment <
      KinoraQuestData(kqd).getMilestoneVideoMinSecondaryCommentOnComment(
        questId,
        milestone,
        videoPostId
      ) ||
      agParams.secondaryCollectOnComment <
      KinoraQuestData(kqd).getMilestoneVideoMinSecondaryCollectOnComment(
        questId,
        milestone,
        videoPostId
      )
    ) {
      revert KinoraErrors.MilestoneInvalid();
    }

    if (
      KinoraQuestData(kqd).getMilestoneVideoBookmark(
        questId,
        milestone,
        videoPostId
      ) &&
      agParams.hasBookmarked !=
      KinoraQuestData(kqd).getMilestoneVideoBookmark(
        questId,
        milestone,
        videoPostId
      )
    ) {
      revert KinoraErrors.MilestoneInvalid();
    }

    if (
      KinoraQuestData(kqd).getMilestoneVideoComment(
        questId,
        milestone,
        videoPostId
      ) &&
      agParams.hasCommented !=
      KinoraQuestData(kqd).getMilestoneVideoComment(
        questId,
        milestone,
        videoPostId
      )
    ) {
      revert KinoraErrors.MilestoneInvalid();
    }

    if (
      KinoraQuestData(kqd).getMilestoneVideoReact(
        questId,
        milestone,
        videoPostId
      ) &&
      agParams.hasReacted !=
      KinoraQuestData(kqd).getMilestoneVideoReact(
        questId,
        milestone,
        videoPostId
      )
    ) {
      revert KinoraErrors.MilestoneInvalid();
    }

    if (
      KinoraQuestData(kqd).getMilestoneVideoQuote(
        questId,
        milestone,
        videoPostId
      ) &&
      agParams.hasQuoted !=
      KinoraQuestData(kqd).getMilestoneVideoQuote(
        questId,
        milestone,
        videoPostId
      )
    ) {
      revert KinoraErrors.MilestoneInvalid();
    }

    if (
      KinoraQuestData(kqd).getMilestoneVideoMirror(
        questId,
        milestone,
        videoPostId
      ) &&
      agParams.hasMirrored !=
      KinoraQuestData(kqd).getMilestoneVideoMirror(
        questId,
        milestone,
        videoPostId
      )
    ) {
      revert KinoraErrors.MilestoneInvalid();
    }
  }

  function _checkEligibilityLoopLocal(
    address kqd,
    address playerProfile,
    uint256 questId,
    uint256 milestone,
    uint256 videoPostId
  ) private view {
    if (
      KinoraQuestData(kqd).getPlayerVideoAVD(playerProfile, videoPostId) <
      KinoraQuestData(kqd).getMilestoneVideoMinAVD(
        questId,
        milestone,
        videoPostId
      ) ||
      KinoraQuestData(kqd).getPlayerVideoPlayCount(playerProfile, videoPostId) <
      KinoraQuestData(kqd).getMilestoneVideoMinPlayCount(
        questId,
        milestone,
        videoPostId
      ) ||
      KinoraQuestData(kqd).getPlayerVideoDuration(playerProfile, videoPostId) <
      KinoraQuestData(kqd).getMilestoneVideoMinDuration(
        questId,
        milestone,
        videoPostId
      ) ||
      KinoraQuestData(kqd).getPlayerVideoSecondaryQuoteOnQuote(
        playerProfile,
        videoPostId
      ) <
      KinoraQuestData(kqd).getMilestoneVideoMinSecondaryQuoteOnQuote(
        questId,
        milestone,
        videoPostId
      ) ||
      KinoraQuestData(kqd).getPlayerVideoSecondaryMirrorOnQuote(
        playerProfile,
        videoPostId
      ) <
      KinoraQuestData(kqd).getMilestoneVideoMinSecondaryMirrorOnQuote(
        questId,
        milestone,
        videoPostId
      ) ||
      KinoraQuestData(kqd).getPlayerVideoSecondaryReactOnQuote(
        playerProfile,
        videoPostId
      ) <
      KinoraQuestData(kqd).getMilestoneVideoMinSecondaryReactOnQuote(
        questId,
        milestone,
        videoPostId
      ) ||
      KinoraQuestData(kqd).getPlayerVideoSecondaryCommentOnQuote(
        playerProfile,
        videoPostId
      ) <
      KinoraQuestData(kqd).getMilestoneVideoMinSecondaryCommentOnQuote(
        questId,
        milestone,
        videoPostId
      ) ||
      KinoraQuestData(kqd).getPlayerVideoSecondaryCollectOnQuote(
        playerProfile,
        videoPostId
      ) <
      KinoraQuestData(kqd).getMilestoneVideoMinSecondaryCollectOnQuote(
        questId,
        milestone,
        videoPostId
      ) ||
      KinoraQuestData(kqd).getPlayerVideoSecondaryQuoteOnComment(
        playerProfile,
        videoPostId
      ) <
      KinoraQuestData(kqd).getMilestoneVideoMinSecondaryQuoteOnComment(
        questId,
        milestone,
        videoPostId
      ) ||
      KinoraQuestData(kqd).getPlayerVideoSecondaryMirrorOnComment(
        playerProfile,
        videoPostId
      ) <
      KinoraQuestData(kqd).getMilestoneVideoMinSecondaryMirrorOnComment(
        questId,
        milestone,
        videoPostId
      ) ||
      KinoraQuestData(kqd).getPlayerVideoSecondaryReactOnComment(
        playerProfile,
        videoPostId
      ) <
      KinoraQuestData(kqd).getMilestoneVideoMinSecondaryReactOnComment(
        questId,
        milestone,
        videoPostId
      ) ||
      KinoraQuestData(kqd).getPlayerVideoSecondaryCommentOnComment(
        playerProfile,
        videoPostId
      ) <
      KinoraQuestData(kqd).getMilestoneVideoMinSecondaryCommentOnComment(
        questId,
        milestone,
        videoPostId
      ) ||
      KinoraQuestData(kqd).getPlayerVideoSecondaryCollectOnComment(
        playerProfile,
        videoPostId
      ) <
      KinoraQuestData(kqd).getMilestoneVideoMinSecondaryCollectOnComment(
        questId,
        milestone,
        videoPostId
      )
    ) {
      revert KinoraErrors.MilestoneInvalid();
    }

    if (
      KinoraQuestData(kqd).getMilestoneVideoBookmark(
        questId,
        milestone,
        videoPostId
      ) &&
      KinoraQuestData(kqd).getPlayerVideoBookmark(playerProfile, videoPostId) !=
      KinoraQuestData(kqd).getMilestoneVideoBookmark(
        questId,
        milestone,
        videoPostId
      )
    ) {
      revert KinoraErrors.MilestoneInvalid();
    }

    if (
      KinoraQuestData(kqd).getMilestoneVideoComment(
        questId,
        milestone,
        videoPostId
      ) &&
      KinoraQuestData(kqd).getPlayerVideoComment(playerProfile, videoPostId) !=
      KinoraQuestData(kqd).getMilestoneVideoComment(
        questId,
        milestone,
        videoPostId
      )
    ) {
      revert KinoraErrors.MilestoneInvalid();
    }

    if (
      KinoraQuestData(kqd).getMilestoneVideoReact(
        questId,
        milestone,
        videoPostId
      ) &&
      KinoraQuestData(kqd).getPlayerVideoReact(playerProfile, videoPostId) !=
      KinoraQuestData(kqd).getMilestoneVideoReact(
        questId,
        milestone,
        videoPostId
      )
    ) {
      revert KinoraErrors.MilestoneInvalid();
    }

    if (
      KinoraQuestData(kqd).getMilestoneVideoQuote(
        questId,
        milestone,
        videoPostId
      ) &&
      KinoraQuestData(kqd).getPlayerVideoQuote(playerProfile, videoPostId) !=
      KinoraQuestData(kqd).getMilestoneVideoQuote(
        questId,
        milestone,
        videoPostId
      )
    ) {
      revert KinoraErrors.MilestoneInvalid();
    }

    if (
      KinoraQuestData(kqd).getMilestoneVideoMirror(
        questId,
        milestone,
        videoPostId
      ) &&
      KinoraQuestData(kqd).getPlayerVideoMirror(playerProfile, videoPostId) !=
      KinoraQuestData(kqd).getMilestoneVideoMirror(
        questId,
        milestone,
        videoPostId
      )
    ) {
      revert KinoraErrors.MilestoneInvalid();
    }
  }

  function symbol() public pure returns (string memory) {
    return "KMCL";
  }

  function name() public pure returns (string memory) {
    return "KinoraMilestoneCheckLogic";
  }
}
