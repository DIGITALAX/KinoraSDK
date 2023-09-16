// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.19;

import "./KinoraMetrics.sol";
import "./KinoraQuest.sol";
import "./KinoraAccessControl.sol";
import "./KinoraEscrow.sol";
import "./Kinora721QuestReward.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

interface IKinoraAccessControl {
  function isAdmin(address _address) external view returns (bool);
}

contract KinoraFactory {
  address private _globalAccessControl;
  address private _globalPKPDB;
  address private _kinoraAccessControl;
  address private _kinoraQuest;
  address private _kinoraEscrow;
  address private _kinoraMetrics;
  address private _kinoraQuestReward;
  string public name;
  string public symbol;
  uint256 private _kinoraIDCount;

  struct Kinora {
    address[5] contracts;
    bytes32 playbackIdsString;
    address deployer;
    uint256 kinoraID;
  }

  event KinoraFactoryDeployed(
    address indexed deployerAddress,
    address accessControlAddress,
    address metricsAddress,
    address questAddress,
    address escrowAddress,
    address questRewardAddress
  );

  mapping(address => address[]) private _deployerToPKPs;
  mapping(address => Kinora) private _deployerPKPToKinora;

  modifier onlyAdmin() {
    require(
      IKinoraAccessControl(_globalAccessControl).isAdmin(msg.sender),
      "GlobalKinoraAccessControl: Admin Only."
    );
    _;
  }

  constructor(address _accessControlsAddress, address _pkpDBAddress) {
    name = "KinoraFactory";
    symbol = "KFAC";
    _globalAccessControl = _accessControlsAddress;
    _globalPKPDB = _pkpDBAddress;
    _kinoraIDCount = 0;
  }

  function deployFromKinoraFactory(address _pkpAddress) public {
    require(
      _deployerPKPToKinora[_pkpAddress].kinoraID == 0,
      "KinoraFactory: PKP already mapped to contract factory."
    );

    (
      address _newKAC,
      address _newKM,
      address _newKQ,
      address _newKE,
      address _newKQR
    ) = _deploySuite(msg.sender, _pkpAddress);

    KinoraEscrow(_newKE).setKinoraQuest(_newKQ);
    KinoraEscrow(_newKE).setKinora721QuestReward(_newKQR);

    _kinoraIDCount++;

    Kinora memory _newKinoraFactoryDetails = Kinora({
      kinoraID: _kinoraIDCount,
      playbackIdsString: "",
      contracts: [_newKAC, _newKM, _newKQ, _newKE, _newKQR],
      deployer: msg.sender
    });

    _deployerToPKPs[msg.sender].push(_pkpAddress);
    _deployerPKPToKinora[_pkpAddress] = _newKinoraFactoryDetails;

    emit KinoraFactoryDeployed(
      msg.sender,
      _newKAC,
      _newKM,
      _newKQ,
      _newKE,
      _newKQR
    );
  }

  function _deploySuite(
    address _kinoraDeployer,
    address _pkpAddress
  )
    private
    returns (
      address _newKACA,
      address _newKMA,
      address _newKQA,
      address _newKEA,
      address _newKQRA
    )
  {
    address _newKAC = Clones.clone(_kinoraAccessControl);
    address _newKM = Clones.clone(_kinoraMetrics);
    address _newKE = Clones.clone(_kinoraEscrow);
    address _newKQ = Clones.clone(_kinoraQuest);
    address _newKQR = Clones.clone(_kinoraQuestReward);

    // Deploy KinoraAccessControl
    KinoraAccessControl(_newKAC).initialize(
      _pkpAddress,
      _kinoraDeployer,
      address(this)
    );

    // Deploy KinoraMetricsAddress
    KinoraMetrics(_newKM).initialize(_newKAC);

    // Deploy KinoraEscrowAddress
    KinoraEscrow(_newKE).initialize(_newKAC, address(this));

    // Deploy KinoraQuestAddress
    KinoraQuest(_newKQ).initialize(_newKAC, _newKE, _globalPKPDB);

    // Deploy Kinora721QuestRewardAddress
    Kinora721QuestReward(_newKQR).initialize(_newKQ, _newKE);

    return (
      address(_newKAC),
      address(_newKM),
      address(_newKQ),
      address(_newKE),
      address(_newKQR)
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

  function getDeployedKinoraMetricsToPKP(
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

  function getDeployedKinoraQuestRewardToPKP(
    address _pkpAddress
  ) public view returns (address) {
    return _deployerPKPToKinora[_pkpAddress].contracts[4];
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
  ) public view returns (bytes32) {
    return _deployerPKPToKinora[_pkpAddress].playbackIdsString;
  }

  function getGlobalAccessControlContract() public view returns (address) {
    return _globalAccessControl;
  }

  function getGlobalPKPDBContract() public view returns (address) {
    return _globalPKPDB;
  }

  function getKinoraIDCount() public view returns (uint256) {
    return _kinoraIDCount;
  }

  function getKinoraMetricsLogicAddress() public view returns (address) {
    return _kinoraMetrics;
  }

  function getKinoraEscrowLogicAddress() public view returns (address) {
    return _kinoraEscrow;
  }

  function getKinoraQuestRewardLogicAddress() public view returns (address) {
    return _kinoraQuestReward;
  }

  function getKinoraQuestLogicAddress() public view returns (address) {
    return _kinoraQuest;
  }

  function getKinoraAccessControlLogicAddress() public view returns (address) {
    return _kinoraAccessControl;
  }

  function setGlobalAccessControl(
    address _newAccessControlAddress
  ) external onlyAdmin {
    _globalAccessControl = _newAccessControlAddress;
  }

  function setGlobalPKPDBControl(address _newPKPDBAddress) external onlyAdmin {
    _globalPKPDB = _newPKPDBAddress;
  }

  function setLogicAddresses(
    address _logicAddressAC,
    address _logicAddressQ,
    address _logicAddressE,
    address _logicAddressM,
    address _logicAddressQR
  ) external onlyAdmin {
    _kinoraAccessControl = _logicAddressAC;
    _kinoraQuest = _logicAddressQ;
    _kinoraEscrow = _logicAddressE;
    _kinoraMetrics = _logicAddressM;
    _kinoraQuestReward = _logicAddressQR;
  }
}
