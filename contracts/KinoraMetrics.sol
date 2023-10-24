// SPDX-License-Identifier: UNLICENSE
pragma solidity ^0.8.19;

import "./KinoraAccessControl.sol";
import "./KinoraLibrary.sol";
import "./KinoraQuestData.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract KinoraMetrics is Initializable {
  string public name;
  string public symbol;
  KinoraAccessControl public accessControl;
  KinoraQuestData public kinoraQuestData;

  mapping(address => mapping(string => KinoraLibrary.PlayerLivePeerMetrics))
    private _playerLivePeerMetricsByPlaybackId;

  event AddPlayerMetrics(
    string playbackId,
    string metricJSON,
    uint256 playerProfileId,
    bool encrypted
  );

  modifier onlyDeveloperPKP() {
    if (msg.sender != accessControl.getAssignedPKPAddress()) {
      revert KinoraErrors.OnlyPKP();
    }
    _;
  }

  function initialize(
    address _accessControlAddress,
    address _kinoraQuestDataAddress
  ) public {
    name = "KinoraMetrics";
    symbol = "KME";
    accessControl = KinoraAccessControl(_accessControlAddress);
    kinoraQuestData = KinoraQuestData(_kinoraQuestDataAddress);
  }

  function addPlayerMetrics(
    string memory _playbackId,
    string memory _json,
    uint256 _playerProfileId,
    uint256 _pubId,
    bool _encrypted
  ) public onlyDeveloperPKP {
    uint256 _profileId = accessControl.getProfileId();

    kinoraQuestData.updatePlayerMetrics(
      _playbackId,
      _json,
      _playerProfileId,
      _profileId,
      _pubId,
      _encrypted
    );

    emit AddPlayerMetrics(_playbackId, _json, _playerProfileId, _encrypted);
  }
}
