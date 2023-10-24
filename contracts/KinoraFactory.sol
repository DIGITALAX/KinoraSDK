// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.19;

import "./KinoraMetrics.sol";
import "./KinoraQuest.sol";
import "./KinoraAccessControl.sol";
import "./KinoraEscrow.sol";
import "./KinoraQuestData.sol";
import "./KinoraNFTCreator.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

contract KinoraFactory {
  string public name;
  string public symbol;
  KinoraQuestData public kinoraQuestData;
  KinoraNFTCreator public kinoraNFTCreator;
  address public kinoraAccessControl;
  address public kinoraQuest;
  address public kinoraEscrow;
  address public kinoraMetrics;
  address public factoryMaintainer;
  address public kinoraOpenAction;

  event KinoraFactoryDeployed(
    address indexed deployerAddress,
    address accessControlAddress,
    address metricsAddress,
    address questAddress,
    address escrowAddress
  );

  mapping(address => address[]) private _deployerToPKPs;
  mapping(address => KinoraLibrary.Kinora) private _deployerPKPToKinora;

  constructor(address _openActionAddress) {
    name = "KinoraFactory";
    symbol = "KFAC";
    factoryMaintainer = msg.sender;
    kinoraOpenAction = _openActionAddress;
  }

  function deployFromKinoraFactory(
    address _pkpAddress,
    address _deployerAddress,
    uint256 _profileId,
    uint256 _pubId
  ) external {
    if (_deployerPKPToKinora[_pkpAddress].profileId != 0) {
      revert KinoraErrors.PkpExists();
    }

    if (msg.sender != kinoraOpenAction) {
      revert KinoraErrors.InvalidAddress();
    }

    (
      address _newKAC,
      address _newKM,
      address _newKQ,
      address _newKE
    ) = _deploySuite(_deployerAddress, _pkpAddress, _profileId, _pubId);

    KinoraEscrow(_newKE).setKinoraQuest(_newKQ);

    KinoraLibrary.Kinora memory _newKinoraFactoryDetails = KinoraLibrary
      .Kinora({
        profileId: _profileId,
        contracts: [_newKAC, _newKM, _newKQ, _newKE],
        deployer: _deployerAddress
      });

    _deployerToPKPs[_deployerAddress].push(_pkpAddress);
    _deployerPKPToKinora[_pkpAddress] = _newKinoraFactoryDetails;

    emit KinoraFactoryDeployed(
      _deployerAddress,
      _newKAC,
      _newKM,
      _newKQ,
      _newKE
    );
  }

  function _deploySuite(
    address _kinoraDeployer,
    address _pkpAddress,
    uint256 _profileId,
    uint256 _pubId
  )
    private
    returns (
      address _newKACA,
      address _newKMA,
      address _newKQA,
      address _newKEA
    )
  {
    address _newKAC = Clones.clone(kinoraAccessControl);
    address _newKE = Clones.clone(kinoraEscrow);
    address _newKQ = Clones.clone(kinoraQuest);
    address _newKM = Clones.clone(kinoraMetrics);

    // Deploy KinoraAccessControl
    KinoraAccessControl(_newKAC).initialize(
      _pkpAddress,
      _kinoraDeployer,
      address(this),
      _profileId
    );

    // Deploy KinoraMetricsAddress
    KinoraMetrics(_newKM).initialize(_newKAC, address(kinoraQuestData));

    // Deploy KinoraEscrowAddress
    KinoraEscrow(_newKE).initialize(
      _newKAC,
      address(this),
      address(kinoraQuestData),
      address(kinoraNFTCreator),
      kinoraOpenAction
    );

    // Deploy KinoraQuestAddress
    KinoraQuest(_newKQ).initialize(_newKAC, _newKE, address(kinoraQuestData));

    kinoraQuestData.setValidQuestContract(_profileId, _pubId, address(_newKQ));
    kinoraNFTCreator.setValidEscrowContract(
      _profileId,
      _pubId,
      address(_newKE)
    );

    return (
      address(_newKAC),
      address(_newKM),
      address(_newKQ),
      address(_newKE)
    );
  }

  function getDeployerToPKPs(
    address _deployerAddress
  ) public view returns (address[] memory) {
    return _deployerToPKPs[_deployerAddress];
  }

  function getPKPToDeployedKinoraAccessControl(
    address _pkpAddress
  ) public view returns (address) {
    return _deployerPKPToKinora[_pkpAddress].contracts[0];
  }

  function getPKPToDeployedKinoraMetrics(
    address _pkpAddress
  ) public view returns (address) {
    return _deployerPKPToKinora[_pkpAddress].contracts[1];
  }

  function getPKPToDeployedKinoraQuest(
    address _pkpAddress
  ) public view returns (address) {
    return _deployerPKPToKinora[_pkpAddress].contracts[2];
  }

  function getPKPToDeployedKinoraEscrow(
    address _pkpAddress
  ) public view returns (address) {
    return _deployerPKPToKinora[_pkpAddress].contracts[3];
  }

  function getPKPToProfileId(
    address _pkpAddress
  ) public view returns (uint256) {
    return _deployerPKPToKinora[_pkpAddress].profileId;
  }

  function getPKPToDeployer(address _pkpAddress) public view returns (address) {
    return _deployerPKPToKinora[_pkpAddress].deployer;
  }

  function setLogicAddresses(
    address _logicAddressAC,
    address _logicAddressQ,
    address _logicAddressE,
    address _logicAddressM,
    address _questDataAddress,
    address _nftCreatorAddress,
    address _kinoraOpenActionAddress
  ) external {
    if (msg.sender != factoryMaintainer) {
      revert KinoraErrors.OnlyAdmin();
    }

    kinoraAccessControl = _logicAddressAC;
    kinoraQuest = _logicAddressQ;
    kinoraEscrow = _logicAddressE;
    kinoraMetrics = _logicAddressM;
    kinoraQuestData = KinoraQuestData(_questDataAddress);
    kinoraNFTCreator = KinoraNFTCreator(_nftCreatorAddress);
    kinoraOpenAction = _kinoraOpenActionAddress;
  }
}
