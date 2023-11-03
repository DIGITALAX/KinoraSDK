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
  string public name; // Name of the factory
  string public symbol; // Symbol of the factory

  // References to other contracts within the Kinora ecosystem
  KinoraQuestData public kinoraQuestData;
  KinoraNFTCreator public kinoraNFTCreator;
  address public lensHub;
  address public kinoraAccessControl;
  address public kinoraQuest;
  address public kinoraEscrow;
  address public kinoraMetrics;
  address public factoryMaintainer;
  address public kinoraOpenAction; 

  // Event emitted when a new suite of contracts is deployed via the KinoraFactory
  event KinoraFactoryDeployed(
    address indexed deployerAddress,
    address accessControlAddress,
    address metricsAddress,
    address questAddress,
    address escrowAddress
  );

  // Mappings to store the relationship between deployers, PKPs, and deployed contracts
  mapping(address => address[]) private _deployerToPKPs;
  mapping(address => KinoraLibrary.Kinora) private _deployerPKPToKinora;

  /**
   * @dev Constructor initializes the contract with the name, symbol, and factory maintainer address.
   */
  constructor() {
    name = "KinoraFactory";
    symbol = "KFAC";
    factoryMaintainer = msg.sender;
  }

  /**
   * @dev Deploys a suite of contracts from the KinoraFactory.
   * @param _pkpAddress Address of the PKP.
   * @param _deployerAddress Address of the deployer.
   * @param _profileId Lens Profile Id associated with the deployment.
   * @param _pubId Lens Pub Id associated with the deployment.
   * @return The addresses of the deployed KinoraQuest and KinoraEscrow contracts.
   */
  function deployFromKinoraFactory(
    address _pkpAddress,
    address _deployerAddress,
    uint256 _profileId,
    uint256 _pubId
  ) external returns (address, address) {
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

    return (_newKQ, _newKE);
  }

  /**
   * @dev Internal function to handle the suite deployment logic.
   * @param _kinoraDeployer Address of the Kinora deployer.
   * @param _pkpAddress Address of the PKP.
   * @param _profileId Lens Profile Id associated with the deployment.
   * @param _pubId Lens Pub Id associated with the deployment.
   * @return _newKACA Address of the newly deployed KinoraAccessControl contract.
   * @return _newKMA Address of the newly deployed KinoraMetrics contract.
   * @return _newKQA Address of the newly deployed KinoraQuest contract.
   * @return _newKEA Address of the newly deployed KinoraEscrow contract.
   */
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
    KinoraMetrics(_newKM).initialize(
      _newKAC,
      address(kinoraQuestData),
      lensHub
    );

    // Deploy KinoraEscrowAddress
    KinoraEscrow(_newKE).initialize(
      _newKAC,
      address(this),
      address(kinoraQuestData),
      address(kinoraNFTCreator),
      kinoraOpenAction
    );

    // Deploy KinoraQuestAddress
    KinoraQuest(_newKQ).initialize(
      _newKAC,
      _newKE,
      address(kinoraQuestData),
      kinoraOpenAction
    );

    kinoraQuestData.setValidQuestContract(_profileId, _pubId, address(_newKQ));
    kinoraQuestData.setValidMetricsContract(
      _profileId,
      _pubId,
      address(_newKM)
    );
    kinoraQuestData.setValidEscrowContract(_profileId, _pubId, address(_newKE));
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

  /**
   * @dev Retrieves the array of PKP addresses associated with a particular deployer.
   * @param _deployerAddress The address of the deployer.
   * @return An array of PKP addresses.
   */
  function getDeployerToPKPs(
    address _deployerAddress
  ) public view returns (address[] memory) {
    return _deployerToPKPs[_deployerAddress];
  }

  /**
   * @dev Retrieves the address of the KinoraAccessControl contract deployed for a particular PKP.
   * @param _pkpAddress The address of the PKP.
   * @return The address of the KinoraAccessControl contract.
   */
  function getPKPToDeployedKinoraAccessControl(
    address _pkpAddress
  ) public view returns (address) {
    return _deployerPKPToKinora[_pkpAddress].contracts[0];
  }

  /**
   * @dev Retrieves the address of the KinoraMetrics contract deployed for a particular PKP.
   * @param _pkpAddress The address of the PKP.
   * @return The address of the KinoraMetrics contract.
   */
  function getPKPToDeployedKinoraMetrics(
    address _pkpAddress
  ) public view returns (address) {
    return _deployerPKPToKinora[_pkpAddress].contracts[1];
  }

  /**
   * @dev Retrieves the address of the KinoraQuest contract deployed for a particular PKP.
   * @param _pkpAddress The address of the PKP.
   * @return The address of the KinoraQuest contract.
   */
  function getPKPToDeployedKinoraQuest(
    address _pkpAddress
  ) public view returns (address) {
    return _deployerPKPToKinora[_pkpAddress].contracts[2];
  }

  /**
   * @dev Retrieves the address of the KinoraEscrow contract deployed for a particular PKP.
   * @param _pkpAddress The address of the PKP.
   * @return The address of the KinoraEscrow contract.
   */
  function getPKPToDeployedKinoraEscrow(
    address _pkpAddress
  ) public view returns (address) {
    return _deployerPKPToKinora[_pkpAddress].contracts[3];
  }

  /**
   * @dev Retrieves the Lens Profile Id associated with a particular PKP.
   * @param _pkpAddress The address of the PKP.
   * @return The Lens Profile Id.
   */
  function getPKPToProfileId(
    address _pkpAddress
  ) public view returns (uint256) {
    return _deployerPKPToKinora[_pkpAddress].profileId;
  }

  /**
   * @dev Retrieves the deployer address associated with a particular PKP.
   * @param _pkpAddress The address of the PKP.
   * @return The address of the deployer.
   */
  function getPKPToDeployer(address _pkpAddress) public view returns (address) {
    return _deployerPKPToKinora[_pkpAddress].deployer;
  }

  /**
   * @dev Sets the addresses of the logic contracts and other essential contracts.
   * Only callable by the factory maintainer.
   * @param _logicAddressAC The address of the KinoraAccessControl logic contract.
   * @param _logicAddressQ The address of the KinoraQuest logic contract.
   * @param _logicAddressE The address of the KinoraEscrow logic contract.
   * @param _logicAddressM The address of the KinoraMetrics logic contract.
   * @param _questDataAddress The address of the KinoraQuestData contract.
   * @param _nftCreatorAddress The address of the KinoraNFTCreator contract.
   * @param _kinoraOpenActionAddress The address of the KinoraOpenAction contract.
   * @param _lensHub The address of Lens Hub contract
   */
  function setLogicAddresses(
    address _logicAddressAC,
    address _logicAddressQ,
    address _logicAddressE,
    address _logicAddressM,
    address _questDataAddress,
    address _nftCreatorAddress,
    address _kinoraOpenActionAddress,
    address _lensHub
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
    lensHub = _lensHub;
  }
}
