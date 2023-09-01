// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.9;

import "./KinoraAccessControl.sol";

library MetricsParamsLibrary {
  struct MetricParams {
    string streamId;
    uint256 avd;
    uint256 crt;
    uint256 recordingNumber;
    uint256 assetEngagement;
    uint256 userEngagementRatio;
    uint256 multiStreamUsageRate;
    uint256 taskFailureRate;
    uint256 recordingPerSession;
  }
}

contract KinoraMetrics {
  KinoraAccessControl private _accessControl;

  struct UserLivePeerMetrics {
    string _streamId;
    uint256 _avd;
    uint256 _crt;
    uint256 _recordingNumber;
    uint256 _assetEngagement;
    uint256 _userEngagementRatio;
    uint256 _multiStreamUsageRate;
    uint256 _taskFailureRate;
    uint256 _recordingPerSession;
  }

  mapping(address => mapping(string => UserLivePeerMetrics))
    private _pkpToUserLivePeerMetricsByStreamId;
  mapping(address => string[]) private _pkpToStreamId;

  event AddUserPKP(address addedUserPKPAddress);
  event RemoveUserPKP(address removedUserPKPAddress);
  event AddUserMetrics(
    string streamId,
    address userPKPAddress,
    uint256 avd,
    uint256 crt,
    uint256 recordingNumber,
    uint256 assetEngagement,
    uint256 userEngagementRatio,
    uint256 multiStreamUsageRate,
    uint256 taskFailureRate,
    uint256 recordingPerSession
  );

  modifier onlyUserPKP() {
    require(
      msg.sender == _accessControl.getAssignedPKPAddress(),
      "KinoraAccessControl: Only Assigned PKP can perform this action."
    );
    _;
  }

  constructor(address _accessControlAddress) {
    _accessControl = KinoraAccessControl(_accessControlAddress);
  }

  function addUserMetrics(
    address _userPKPAddress,
    MetricsParamsLibrary.MetricParams memory _args
  ) public onlyUserPKP {
    UserLivePeerMetrics memory _newUserLivePeerMetrics;
    if (_pkpToStreamId[_userPKPAddress].length > 0) {
      _newUserLivePeerMetrics = UserLivePeerMetrics({
        _streamId: _args.streamId,
        _avd: _args.avd,
        _crt: _args.crt,
        _recordingNumber: _args.recordingNumber,
        _assetEngagement: _args.assetEngagement,
        _userEngagementRatio: _args.userEngagementRatio,
        _multiStreamUsageRate: _args.multiStreamUsageRate,
        _taskFailureRate: _args.taskFailureRate,
        _recordingPerSession: _args.recordingPerSession
      });
    } else {
      // update and combine user metrics
      _newUserLivePeerMetrics = UserLivePeerMetrics({
        _streamId: _args.streamId,
        _avd: _args.avd,
        _crt: _args.crt,
        _recordingNumber: _args.recordingNumber,
        _assetEngagement: _args.assetEngagement,
        _userEngagementRatio: _args.userEngagementRatio,
        _multiStreamUsageRate: _args.multiStreamUsageRate,
        _taskFailureRate: _args.taskFailureRate,
        _recordingPerSession: _args.recordingPerSession
      });
    }

    _pkpToUserLivePeerMetricsByStreamId[_userPKPAddress][
      _args.streamId
    ] = _newUserLivePeerMetrics;

    emit AddUserMetrics(
      _args.streamId,
      _userPKPAddress,
      _args.avd,
      _args.crt,
      _args.recordingNumber,
      _args.assetEngagement,
      _args.userEngagementRatio,
      _args.multiStreamUsageRate,
      _args.taskFailureRate,
      _args.recordingPerSession
    );
  }

  function getKinoraAccessControl() public view returns (address) {
    return address(_accessControl);
  }
}
