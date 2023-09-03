// SPDX-License-Identifier: UNLICENSE
pragma solidity ^0.8.19;

import "./KinoraAccessControl.sol";

library MetricsParamsLibrary {
  struct MetricParams {
    string playbackId;
    string metricJSON;
    bool encrypted;
  }
}

contract KinoraMetrics {
  KinoraAccessControl private _accessControl;

  struct UserLivePeerMetrics {
    string _playbackId;
    string _metricJSON;
    bool _encrypted;
  }

  mapping(address => mapping(string => UserLivePeerMetrics))
    private _pkpToUserLivePeerMetricsByPlaybackId;

  event AddUserPKP(address addedUserPKPAddress);
  event RemoveUserPKP(address removedUserPKPAddress);
  event AddUserMetrics(
    string playbackId,
    string metricJSON,
    address userPKPAddress,
    bool encrypted
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
    _newUserLivePeerMetrics = UserLivePeerMetrics({
      _playbackId: _args.playbackId,
      _metricJSON: _args.metricJSON,
      _encrypted: _args.encrypted
    });

    _pkpToUserLivePeerMetricsByPlaybackId[_userPKPAddress][
      _args.playbackId
    ] = _newUserLivePeerMetrics;

    emit AddUserMetrics(
      _args.playbackId,
      _args.metricJSON,
      _userPKPAddress,
      _args.encrypted
    );
  }

  function getUserEncryptedByPlaybackId(
    address _userPKPAddress,
    string memory _playbackId
  ) public view returns (bool) {
    return
      _pkpToUserLivePeerMetricsByPlaybackId[_userPKPAddress][_playbackId]
        ._encrypted;
  }

  function getUserMetricsJSONByPlaybackId(
    address _userPKPAddress,
    string memory _playbackId
  ) public view returns (string memory) {
    return
      _pkpToUserLivePeerMetricsByPlaybackId[_userPKPAddress][_playbackId]
        ._metricJSON;
  }

  function getUserPlaybackIdByPlaybackId(
    address _userPKPAddress,
    string memory _playbackId
  ) public view returns (string memory) {
    return
      _pkpToUserLivePeerMetricsByPlaybackId[_userPKPAddress][_playbackId]
        ._playbackId;
  }

  function getKinoraAccessControl() public view returns (address) {
    return address(_accessControl);
  }
}
