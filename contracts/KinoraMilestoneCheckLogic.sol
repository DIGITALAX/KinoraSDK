// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "./KinoraQuestData.sol";
import "./KinoraAccessControl.sol";
import "./KinoraOpenAction.sol";

contract KinoraMilestoneCheckLogic {
  string public symbol;
  string public name;
  KinoraOpenAction public kinoraOpenAction;

  constructor() {
    name = "KinoraMilestoneCheckLogic";
    symbol = "KMCL";
  }

  function freezeSetKinoraOpenAction(address _kinoraOpenActionAddress) public {
    if (address(kinoraOpenAction) != address(0)) {
      revert KinoraErrors.InvalidAddress();
    }

    kinoraOpenAction = KinoraOpenAction(_kinoraOpenActionAddress);
  }

  function checkMilestoneLogic(
    address _kqd,
    uint256 _milestone,
    uint256 _questId,
    uint256 _playerProfileId,
    uint256 _videoPubId,
    uint256 _videoProfileId
  ) external view {
    uint256[] memory _factoryIds = KinoraQuestData(_kqd)
      .getMilestoneVideoFactoryIds(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      );

    if (_factoryIds.length < 1) {
      _checkEligibilityLoopLocal(
        _kqd,
        _questId,
        _milestone,
        _playerProfileId,
        _videoPubId,
        _videoProfileId
      );
    } else {
      KinoraLibrary.AggregateParams memory _agParams = _aggregateGlobalMetrics(
        _factoryIds,
        _kqd,
        _playerProfileId,
        _videoPubId,
        _videoProfileId
      );

      _checkEligibilityLoopGlobal(
        _agParams,
        _kqd,
        _questId,
        _milestone,
        _playerProfileId,
        _videoPubId,
        _videoProfileId
      );
    }
  }

  function _aggregateGlobalMetrics(
    uint256[] memory _factoryIds,
    address _kqd,
    uint256 _playerProfileId,
    uint256 _videoPubId,
    uint256 _videoProfileId
  ) private view returns (KinoraLibrary.AggregateParams memory) {
    KinoraLibrary.AggregateParams memory _agged;

    for (uint256 h = 0; h <= _factoryIds.length; h++) {
      KinoraQuestData kinoraQuestDataContract;
      if (h == _factoryIds.length) {
        kinoraQuestDataContract = KinoraQuestData(_kqd);
      } else {
        kinoraQuestDataContract = KinoraQuestData(
          KinoraAccessControl(
            kinoraOpenAction.getContractFactoryMap(_factoryIds[h])
          ).getKinoraQuestData()
        );
      }

      _agged.avd += kinoraQuestDataContract.getPlayerVideoAVD(
        _playerProfileId,
        _videoPubId,
        _videoProfileId
      );
      _agged.playCount += kinoraQuestDataContract.getPlayerVideoPlayCount(
        _playerProfileId,
        _videoPubId,
        _videoProfileId
      );
      _agged.secondaryQuoteOnQuote += kinoraQuestDataContract
        .getPlayerVideoSecondaryQuoteOnQuote(
          _playerProfileId,
          _videoPubId,
          _videoProfileId
        );
      _agged.secondaryMirrorOnQuote += kinoraQuestDataContract
        .getPlayerVideoSecondaryMirrorOnQuote(
          _playerProfileId,
          _videoPubId,
          _videoProfileId
        );
      _agged.secondaryReactOnQuote += kinoraQuestDataContract
        .getPlayerVideoSecondaryReactOnQuote(
          _playerProfileId,
          _videoPubId,
          _videoProfileId
        );
      _agged.secondaryCommentOnQuote += kinoraQuestDataContract
        .getPlayerVideoSecondaryCommentOnQuote(
          _playerProfileId,
          _videoPubId,
          _videoProfileId
        );
      _agged.secondaryCollectOnQuote += kinoraQuestDataContract
        .getPlayerVideoSecondaryCollectOnQuote(
          _playerProfileId,
          _videoPubId,
          _videoProfileId
        );
      _agged.secondaryQuoteOnComment += kinoraQuestDataContract
        .getPlayerVideoSecondaryQuoteOnComment(
          _playerProfileId,
          _videoPubId,
          _videoProfileId
        );
      _agged.secondaryMirrorOnComment += kinoraQuestDataContract
        .getPlayerVideoSecondaryMirrorOnComment(
          _playerProfileId,
          _videoPubId,
          _videoProfileId
        );
      _agged.secondaryReactOnComment += kinoraQuestDataContract
        .getPlayerVideoSecondaryReactOnComment(
          _playerProfileId,
          _videoPubId,
          _videoProfileId
        );
      _agged.secondaryCommentOnComment += kinoraQuestDataContract
        .getPlayerVideoSecondaryCommentOnComment(
          _playerProfileId,
          _videoPubId,
          _videoProfileId
        );
      _agged.secondaryCollectOnComment += kinoraQuestDataContract
        .getPlayerVideoSecondaryCollectOnComment(
          _playerProfileId,
          _videoPubId,
          _videoProfileId
        );
      _agged.duration += kinoraQuestDataContract.getPlayerVideoDuration(
        _playerProfileId,
        _videoPubId,
        _videoProfileId
      );

      if (!_agged.hasQuoted) {
        _agged.hasQuoted = kinoraQuestDataContract.getPlayerVideoQuote(
          _playerProfileId,
          _videoPubId,
          _videoProfileId
        );
      }

      if (!_agged.hasReacted) {
        _agged.hasReacted = kinoraQuestDataContract.getPlayerVideoReact(
          _playerProfileId,
          _videoPubId,
          _videoProfileId
        );
      }

      if (!_agged.hasBookmarked) {
        _agged.hasBookmarked = kinoraQuestDataContract.getPlayerVideoBookmark(
          _playerProfileId,
          _videoPubId,
          _videoProfileId
        );
      }

      if (!_agged.hasCommented) {
        _agged.hasCommented = kinoraQuestDataContract.getPlayerVideoComment(
          _playerProfileId,
          _videoPubId,
          _videoProfileId
        );
      }

      if (!_agged.hasMirrored) {
        _agged.hasMirrored = kinoraQuestDataContract.getPlayerVideoMirror(
          _playerProfileId,
          _videoPubId,
          _videoProfileId
        );
      }
    }

    return _agged;
  }

  function _checkEligibilityLoopGlobal(
    KinoraLibrary.AggregateParams memory _agParams,
    address _kqd,
    uint256 _questId,
    uint256 _milestone,
    uint256 _playerProfileId,
    uint256 _videoPubId,
    uint256 _videoProfileId
  ) private view {
    if (
      _agParams.avd <
      KinoraQuestData(_kqd).getMilestoneVideoMinAVD(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) ||
      _agParams.playCount <
      KinoraQuestData(_kqd).getMilestoneVideoMinPlayCount(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) ||
      _agParams.duration <
      KinoraQuestData(_kqd).getMilestoneVideoMinDuration(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) ||
      _agParams.secondaryQuoteOnQuote <
      KinoraQuestData(_kqd).getMilestoneVideoMinSecondaryQuoteOnQuote(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) ||
      _agParams.secondaryMirrorOnQuote <
      KinoraQuestData(_kqd).getMilestoneVideoMinSecondaryMirrorOnQuote(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) ||
      _agParams.secondaryReactOnQuote <
      KinoraQuestData(_kqd).getMilestoneVideoMinSecondaryReactOnQuote(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) ||
      _agParams.secondaryCommentOnQuote <
      KinoraQuestData(_kqd).getMilestoneVideoMinSecondaryCommentOnQuote(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) ||
      _agParams.secondaryCollectOnQuote <
      KinoraQuestData(_kqd).getMilestoneVideoMinSecondaryCollectOnQuote(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) ||
      _agParams.secondaryQuoteOnComment <
      KinoraQuestData(_kqd).getMilestoneVideoMinSecondaryQuoteOnComment(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) ||
      _agParams.secondaryMirrorOnComment <
      KinoraQuestData(_kqd).getMilestoneVideoMinSecondaryMirrorOnComment(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) ||
      _agParams.secondaryReactOnComment <
      KinoraQuestData(_kqd).getMilestoneVideoMinSecondaryReactOnComment(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) ||
      _agParams.secondaryCommentOnComment <
      KinoraQuestData(_kqd).getMilestoneVideoMinSecondaryCommentOnComment(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) ||
      _agParams.secondaryCollectOnComment <
      KinoraQuestData(_kqd).getMilestoneVideoMinSecondaryCollectOnComment(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      )
    ) {
      revert KinoraErrors.MilestoneInvalid();
    }

    if (
      KinoraQuestData(_kqd).getMilestoneVideoBookmark(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) &&
      _agParams.hasBookmarked !=
      KinoraQuestData(_kqd).getMilestoneVideoBookmark(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      )
    ) {
      revert KinoraErrors.MilestoneInvalid();
    }

    if (
      KinoraQuestData(_kqd).getMilestoneVideoComment(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) &&
      _agParams.hasCommented !=
      KinoraQuestData(_kqd).getMilestoneVideoComment(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      )
    ) {
      revert KinoraErrors.MilestoneInvalid();
    }

    if (
      KinoraQuestData(_kqd).getMilestoneVideoReact(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) &&
      _agParams.hasReacted !=
      KinoraQuestData(_kqd).getMilestoneVideoReact(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      )
    ) {
      revert KinoraErrors.MilestoneInvalid();
    }

    if (
      KinoraQuestData(_kqd).getMilestoneVideoQuote(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) &&
      _agParams.hasQuoted !=
      KinoraQuestData(_kqd).getMilestoneVideoQuote(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      )
    ) {
      revert KinoraErrors.MilestoneInvalid();
    }

    if (
      KinoraQuestData(_kqd).getMilestoneVideoMirror(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) &&
      _agParams.hasMirrored !=
      KinoraQuestData(_kqd).getMilestoneVideoMirror(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      )
    ) {
      revert KinoraErrors.MilestoneInvalid();
    }
  }

  function _checkEligibilityLoopLocal(
    address _kqd,
    uint256 _questId,
    uint256 _milestone,
    uint256 _playerProfileId,
    uint256 _videoPubId,
    uint256 _videoProfileId
  ) private view {
    if (
      KinoraQuestData(_kqd).getPlayerVideoAVD(
        _playerProfileId,
        _videoPubId,
        _videoProfileId
      ) <
      KinoraQuestData(_kqd).getMilestoneVideoMinAVD(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) ||
      KinoraQuestData(_kqd).getPlayerVideoPlayCount(
        _playerProfileId,
        _videoPubId,
        _videoProfileId
      ) <
      KinoraQuestData(_kqd).getMilestoneVideoMinPlayCount(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) ||
      KinoraQuestData(_kqd).getPlayerVideoDuration(
        _playerProfileId,
        _videoPubId,
        _videoProfileId
      ) <
      KinoraQuestData(_kqd).getMilestoneVideoMinDuration(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) ||
      KinoraQuestData(_kqd).getPlayerVideoSecondaryQuoteOnQuote(
        _playerProfileId,
        _videoPubId,
        _videoProfileId
      ) <
      KinoraQuestData(_kqd).getMilestoneVideoMinSecondaryQuoteOnQuote(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) ||
      KinoraQuestData(_kqd).getPlayerVideoSecondaryMirrorOnQuote(
        _playerProfileId,
        _videoPubId,
        _videoProfileId
      ) <
      KinoraQuestData(_kqd).getMilestoneVideoMinSecondaryMirrorOnQuote(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) ||
      KinoraQuestData(_kqd).getPlayerVideoSecondaryReactOnQuote(
        _playerProfileId,
        _videoPubId,
        _videoProfileId
      ) <
      KinoraQuestData(_kqd).getMilestoneVideoMinSecondaryReactOnQuote(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) ||
      KinoraQuestData(_kqd).getPlayerVideoSecondaryCommentOnQuote(
        _playerProfileId,
        _videoPubId,
        _videoProfileId
      ) <
      KinoraQuestData(_kqd).getMilestoneVideoMinSecondaryCommentOnQuote(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) ||
      KinoraQuestData(_kqd).getPlayerVideoSecondaryCollectOnQuote(
        _playerProfileId,
        _videoPubId,
        _videoProfileId
      ) <
      KinoraQuestData(_kqd).getMilestoneVideoMinSecondaryCollectOnQuote(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) ||
      KinoraQuestData(_kqd).getPlayerVideoSecondaryQuoteOnComment(
        _playerProfileId,
        _videoPubId,
        _videoProfileId
      ) <
      KinoraQuestData(_kqd).getMilestoneVideoMinSecondaryQuoteOnComment(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) ||
      KinoraQuestData(_kqd).getPlayerVideoSecondaryMirrorOnComment(
        _playerProfileId,
        _videoPubId,
        _videoProfileId
      ) <
      KinoraQuestData(_kqd).getMilestoneVideoMinSecondaryMirrorOnComment(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) ||
      KinoraQuestData(_kqd).getPlayerVideoSecondaryReactOnComment(
        _playerProfileId,
        _videoPubId,
        _videoProfileId
      ) <
      KinoraQuestData(_kqd).getMilestoneVideoMinSecondaryReactOnComment(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) ||
      KinoraQuestData(_kqd).getPlayerVideoSecondaryCommentOnComment(
        _playerProfileId,
        _videoPubId,
        _videoProfileId
      ) <
      KinoraQuestData(_kqd).getMilestoneVideoMinSecondaryCommentOnComment(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) ||
      KinoraQuestData(_kqd).getPlayerVideoSecondaryCollectOnComment(
        _playerProfileId,
        _videoPubId,
        _videoProfileId
      ) <
      KinoraQuestData(_kqd).getMilestoneVideoMinSecondaryCollectOnComment(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      )
    ) {
      revert KinoraErrors.MilestoneInvalid();
    }

    if (
      KinoraQuestData(_kqd).getMilestoneVideoBookmark(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) &&
      KinoraQuestData(_kqd).getPlayerVideoBookmark(
        _playerProfileId,
        _videoPubId,
        _videoProfileId
      ) !=
      KinoraQuestData(_kqd).getMilestoneVideoBookmark(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      )
    ) {
      revert KinoraErrors.MilestoneInvalid();
    }

    if (
      KinoraQuestData(_kqd).getMilestoneVideoComment(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) &&
      KinoraQuestData(_kqd).getPlayerVideoComment(
        _playerProfileId,
        _videoPubId,
        _videoProfileId
      ) !=
      KinoraQuestData(_kqd).getMilestoneVideoComment(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      )
    ) {
      revert KinoraErrors.MilestoneInvalid();
    }

    if (
      KinoraQuestData(_kqd).getMilestoneVideoReact(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) &&
      KinoraQuestData(_kqd).getPlayerVideoReact(
        _playerProfileId,
        _videoPubId,
        _videoProfileId
      ) !=
      KinoraQuestData(_kqd).getMilestoneVideoReact(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      )
    ) {
      revert KinoraErrors.MilestoneInvalid();
    }

    if (
      KinoraQuestData(_kqd).getMilestoneVideoQuote(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) &&
      KinoraQuestData(_kqd).getPlayerVideoQuote(
        _playerProfileId,
        _videoPubId,
        _videoProfileId
      ) !=
      KinoraQuestData(_kqd).getMilestoneVideoQuote(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      )
    ) {
      revert KinoraErrors.MilestoneInvalid();
    }

    if (
      KinoraQuestData(_kqd).getMilestoneVideoMirror(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      ) &&
      KinoraQuestData(_kqd).getPlayerVideoMirror(
        _playerProfileId,
        _videoPubId,
        _videoProfileId
      ) !=
      KinoraQuestData(_kqd).getMilestoneVideoMirror(
        _questId,
        _milestone,
        _videoProfileId,
        _videoPubId
      )
    ) {
      revert KinoraErrors.MilestoneInvalid();
    }
  }
}
