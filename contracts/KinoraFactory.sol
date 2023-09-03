// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.19;

import "./KinoraMetrics.sol";
import "./KinoraQuest.sol";
import "./KinoraAccessControl.sol";
import "./KinoraEscrow.sol";
import "./KinoraGlobalAccessControl.sol";
import "./KinoraGlobalPKPDB.sol";
import "./Kinora721QuestReward.sol";

contract KinoraFactory {
  KinoraGlobalAccessControl private _globalAccessControl;
  KinoraGlobalPKPDB private _globalPKPDB;
  string public name;
  string public symbol;
  uint256 private _kinoraIDCount;

  struct Kinora {
    string[] playbackIds;
    address[5] contracts;
    address deployer;
    uint256 kinoraID;
    uint256 timestamp;
  }

  event KinoraFactoryDeployed(
    address indexed deployerAddress,
    address accessControlAddress,
    address metricsAddress,
    address questAddress,
    address escrowAddress,
    address questReward,
    uint256 timestamp
  );
  event KinoraGlobalAccessControlUpdate(
    address newAccessControlAddress,
    address deployerAddress
  );
  event KinoraGlobalPKPDBUpdate(
    address newPKPDBAddress,
    address deployerAddress
  );

  mapping(address => address[]) private _deployerToPKPs;
  mapping(address => Kinora) private _deployerPKPToKinora;

  modifier onlyAdmin() {
    require(
      _globalAccessControl.isAdmin(msg.sender),
      "GlobalKinoraAccessControl: Only admin can perform this action."
    );
    _;
  }

  constructor(address _accessControlsAddress, address _pkpDBAddress) {
    name = "KinoraFactory";
    symbol = "KFAC";
    _globalAccessControl = KinoraGlobalAccessControl(_accessControlsAddress);
    _globalPKPDB = KinoraGlobalPKPDB(_pkpDBAddress);
  }

  function deployFromKinoraFactory(address _pkpAddress) public {
    address _kinoraDeployer = msg.sender;

    (
      address _newKinoraAccessControlAddress,
      address _newKinoraMetricsAddress,
      address _newKinoraQuestAddress,
      address _newKinoraEscrowAddress,
      address _newKinora721QuestReward
    ) = _deploySuite(_kinoraDeployer, _pkpAddress);

    KinoraAccessControl(_newKinoraAccessControlAddress).addAdmin(
      _kinoraDeployer
    );
    KinoraEscrow(_newKinoraEscrowAddress).setKinoraQuest(
      _newKinoraQuestAddress
    );
    KinoraEscrow(_newKinoraEscrowAddress).setKinora721QuestReward(
      _newKinora721QuestReward
    );

    _kinoraIDCount++;

    Kinora memory _newKinoraFactoryDetails = Kinora({
      kinoraID: _kinoraIDCount,
      playbackIds: new string[](0),
      contracts: [
        _newKinoraAccessControlAddress,
        _newKinoraMetricsAddress,
        _newKinoraQuestAddress,
        _newKinoraEscrowAddress,
        _newKinora721QuestReward
      ],
      deployer: _kinoraDeployer,
      timestamp: block.timestamp
    });

    _deployerToPKPs[_kinoraDeployer].push(_pkpAddress);
    _deployerPKPToKinora[_pkpAddress] = _newKinoraFactoryDetails;

    emit KinoraFactoryDeployed(
      msg.sender,
      _newKinoraAccessControlAddress,
      _newKinoraMetricsAddress,
      _newKinoraQuestAddress,
      _newKinoraEscrowAddress,
      _newKinora721QuestReward,
      block.timestamp
    );
  }

  function _deploySuite(
    address _kinoraDeployer,
    address _pkpAddress
  )
    private
    returns (
      address newKinoraAccessControlAddress,
      address newKinoraMetricsAddress,
      address newKinoraQuestAddress,
      address newKinoraEscrowAddress,
      address newKinora721QuestReward
    )
  {
    // Deploy KinoraAccessControl
    KinoraAccessControl _newKinoraAccessControlAddress = new KinoraAccessControl(
        _pkpAddress,
        _kinoraDeployer
      );

    // Deploy KinoraMetricsAddress
    KinoraMetrics _newKinoraMetricsAddress = new KinoraMetrics(
      address(_newKinoraAccessControlAddress)
    );

    KinoraEscrow _newKinoraEscrowAddress = new KinoraEscrow(
      address(_newKinoraAccessControlAddress),
      address(this)
    );

    // Deploy KinoraQuestAddress
    KinoraQuest _newKinoraQuestAddress = new KinoraQuest(
      address(_newKinoraAccessControlAddress),
      address(_newKinoraEscrowAddress),
      address(_globalPKPDB)
    );

    Kinora721QuestReward _newKinora721QuestReward = new Kinora721QuestReward(
      address(_newKinoraQuestAddress),
      address(_newKinoraEscrowAddress)
    );

    return (
      address(_newKinoraAccessControlAddress),
      address(_newKinoraMetricsAddress),
      address(_newKinoraQuestAddress),
      address(_newKinoraEscrowAddress),
      address(_newKinora721QuestReward)
    );
  }

  function getDeployerToPKPs(
    address _deployerAddress
  ) public view returns (address[] memory) {
    return _deployerToPKPs[_deployerAddress];
  }

  function getDeployedKinoraAccessControlToPKP(
    address _pkpAddress
  ) public view returns (address) {
    return _deployerPKPToKinora[_pkpAddress].contracts[0];
  }

  function getDeployedKinoraMetricToPKP(
    address _pkpAddress
  ) public view returns (address) {
    return _deployerPKPToKinora[_pkpAddress].contracts[1];
  }

  function getDeployedKinoraQuestToPKP(
    address _pkpAddress
  ) public view returns (address) {
    return _deployerPKPToKinora[_pkpAddress].contracts[2];
  }

  function getDeployedKinoraEscrowToPKP(
    address _pkpAddress
  ) public view returns (address) {
    return _deployerPKPToKinora[_pkpAddress].contracts[3];
  }

  function getKinoraIDToPKP(address _pkpAddress) public view returns (uint256) {
    return _deployerPKPToKinora[_pkpAddress].kinoraID;
  }

  function getKinoraDeployerToPKP(
    address _pkpAddress
  ) public view returns (address) {
    return _deployerPKPToKinora[_pkpAddress].deployer;
  }

  function getKinoraPlaybackIdsToPKP(
    address _pkpAddress
  ) public view returns (string[] memory) {
    return _deployerPKPToKinora[_pkpAddress].playbackIds;
  }

  function getKinoraBlockTimestampToPKP(
    address _pkpAddress
  ) public view returns (uint256) {
    return _deployerPKPToKinora[_pkpAddress].timestamp;
  }

  function getGlobalAccessControlContract() public view returns (address) {
    return address(_globalAccessControl);
  }

  function getGlobalPKPDBContract() public view returns (address) {
    return address(_globalPKPDB);
  }

  function getKinoraIDCount() public view returns (uint256) {
    return _kinoraIDCount;
  }

  function setGlobalAccessControl(
    address _newAccessControlAddress
  ) external onlyAdmin {
    _globalAccessControl = KinoraGlobalAccessControl(_newAccessControlAddress);
    emit KinoraGlobalAccessControlUpdate(_newAccessControlAddress, msg.sender);
  }

  function setGlobalPKPDBControl(address _newPKPDBAddress) external onlyAdmin {
    _globalPKPDB = KinoraGlobalPKPDB(_newPKPDBAddress);
    emit KinoraGlobalPKPDBUpdate(_newPKPDBAddress, msg.sender);
  }
}
