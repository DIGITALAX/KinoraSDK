// SPDX-License-Identifier: UNLICENSE
pragma solidity ^0.8.19;

import "./KinoraAccessControl.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./KinoraGlobalPKPDB.sol";

library MetricsParamsLibrary {
  struct MetricParams {
    string playbackId;
    string metricJSONHash;
    bool encrypted;
  }
}

contract KinoraMetrics is Initializable {
  KinoraAccessControl private _accessControl;
  KinoraGlobalPKPDB private _pkpDB;

  error pkpAccountNotActive();
  error onlyPKP();

  struct UserLivePeerMetrics {
    string _playbackId;
    string _metricJSONHash;
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

  modifier onlyDeveloperPKP() {
    if (msg.sender != _accessControl.getAssignedPKPAddress()) {
      revert onlyPKP();
    }
    _;
  }

  function initialize(
    address _accessControlAddress,
    address _pkpDBAddress
  ) public {
    _accessControl = KinoraAccessControl(_accessControlAddress);
    _pkpDB = KinoraGlobalPKPDB(_pkpDBAddress);
  }

  function addUserMetrics(
    address _userPKPAddress,
    MetricsParamsLibrary.MetricParams memory _args
  ) public onlyDeveloperPKP {
    if (!_pkpDB.userExists(_userPKPAddress)) {
      revert pkpAccountNotActive();
    }
    UserLivePeerMetrics memory _newUserLivePeerMetrics;
    _newUserLivePeerMetrics = UserLivePeerMetrics({
      _playbackId: _args.playbackId,
      _metricJSONHash: _args.metricJSONHash,
      _encrypted: _args.encrypted
    });

    _pkpToUserLivePeerMetricsByPlaybackId[_userPKPAddress][
      _args.playbackId
    ] = _newUserLivePeerMetrics;

    emit AddUserMetrics(
      _args.playbackId,
      _args.metricJSONHash,
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

  function getUserMetricsJSONHashByPlaybackId(
    address _userPKPAddress,
    string memory _playbackId
  ) public view returns (string memory) {
    return
      _pkpToUserLivePeerMetricsByPlaybackId[_userPKPAddress][_playbackId]
        ._metricJSONHash;
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
