// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.9;

import "./KinoraMetrics.sol";
import "./KinoraQuest.sol";
import "./KinoraAccessControl.sol";
import "./KinoraGlobalAccessControl.sol";

contract KinoraFactory {
    KinoraGlobalAccessControl private _globalAccessControl;
    string public name;
    string public symbol;
    uint256 private _kinoraIDCount;

    struct Kinora {
        string[] playbackIds;
        address[3] contracts;
        address deployer;
        uint256 kinoraID;
        uint256 timestamp;
    }

    event KinoraFactoryDeployed(
        address indexed deployerAddress,
        address accessControlAddress,
        address metricsAddress,
        address questAddress,
        uint256 timestamp
    );
    event KinoraGlobalAccessControlUpdate(
        address newAccessControlAddress,
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

    constructor(address _accessControlsAddress) {
        name = "KinoraFactory";
        symbol = "KFAC";
        _globalAccessControl = KinoraGlobalAccessControl(
            _accessControlsAddress
        );
    }

    function deployFromKinoraFactory(address _pkpAddress) public {
        address _kinoraDeployer = msg.sender;

        (
            address _newKinoraAccessControlAddress,
            address _newKinoraMetricsAddress,
            address _newKinoraQuestAddress
        ) = _deploySuite(_kinoraDeployer, _pkpAddress);

        KinoraAccessControl(_newKinoraAccessControlAddress).addAdmin(
            _kinoraDeployer
        );

        _kinoraIDCount++;

        Kinora memory _newKinoraFactoryDetails = Kinora({
            kinoraID: _kinoraIDCount,
            playbackIds: new string[](0),
            contracts: [
                _newKinoraAccessControlAddress,
                _newKinoraMetricsAddress,
                _newKinoraQuestAddress
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
            address newKinoraQuestAddress
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

        // Deploy KinoraQuestAddress
        KinoraQuest _newKinoraQuestAddress = new KinoraQuest(
            address(_newKinoraAccessControlAddress)
        );

        return (
            address(_newKinoraAccessControlAddress),
            address(_newKinoraMetricsAddress),
            address(_newKinoraQuestAddress)
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

    function getKinoraIDToPKP(
        address _pkpAddress
    ) public view returns (uint256) {
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

    function getKinoraIDCount() public view returns (uint256) {
        return _kinoraIDCount;
    }

    function setGlobalAccessControl(
        address _newAccessControlAddress
    ) external onlyAdmin {
        _globalAccessControl = KinoraGlobalAccessControl(
            _newAccessControlAddress
        );
        emit KinoraGlobalAccessControlUpdate(
            _newAccessControlAddress,
            msg.sender
        );
    }
}
