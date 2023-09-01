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

    struct Kinora {
        string[] streamIds;
        address[3] contracts;
        address deployer;
        uint256 timestamp;
    }

    event GlobalAccessControlSet(
        address indexed oldGlobalAccessControl,
        address indexed newGlobalAccessControl,
        address updater
    );
    event KinoraFactoryDeployed(
        address indexed deployerAddress,
        address accessControlAddress,
        address metricsAddress,
        address questAddress,
        uint256 timestamp
    );
    event GrantStatusUpdated(
        string grantName,
        address deployerAddress,
        string status
    );
    event KinoraGlobalAccessControlSet(
        address newAccessControlAddress,
        address deployerAddress
    );

    mapping(address => Kinora[]) private _deployerToKinora;
    mapping(address => address[])
        private _deployedKinoraAccessControlsAddresses;
    mapping(address => address[]) private _deployedKinoraQuestAddresses;
    mapping(address => address[]) private _deployedKinoraMetricsAddresses;

    modifier onlyAdmin() {
        require(
            _globalAccessControl.isAdmin(msg.sender),
            "GlobalKinoraAccessControl: Only admin can perform this action"
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

        Kinora memory _newKinoraFactoryDetails = Kinora({
            streamIds: new string[](0),
            contracts: [
                _newKinoraAccessControlAddress,
                _newKinoraMetricsAddress,
                _newKinoraQuestAddress
            ],
            deployer: _kinoraDeployer,
            timestamp: block.timestamp
        });

        _deployerToKinora[_kinoraDeployer].push(_newKinoraFactoryDetails);

        _deployedKinoraAccessControlsAddresses[_kinoraDeployer].push(
            _newKinoraAccessControlAddress
        );
        _deployedKinoraMetricsAddresses[_kinoraDeployer].push(
            _newKinoraMetricsAddress
        );
        _deployedKinoraQuestAddresses[_kinoraDeployer].push(
            _newKinoraQuestAddress
        );

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

    function getDeployedKinoraAccessControls(
        address _deployerAddress
    ) public view returns (address[] memory) {
        return _deployedKinoraAccessControlsAddresses[_deployerAddress];
    }

    function getDeployedKinoraMetrics(
        address _deployerAddress
    ) public view returns (address[] memory) {
        return _deployedKinoraMetricsAddresses[_deployerAddress];
    }

    function getDeployedKinoraQuests(
        address _deployerAddress
    ) public view returns (address[] memory) {
        return _deployedKinoraQuestAddresses[_deployerAddress];
    }

    function getGlobalAccessControlContract() public view returns (address) {
        return address(_globalAccessControl);
    }

    function setGlobalAccessControl(
        address _newAccessControlAddress
    ) external onlyAdmin {
        _globalAccessControl = KinoraGlobalAccessControl(
            _newAccessControlAddress
        );
        emit KinoraGlobalAccessControlSet(_newAccessControlAddress, msg.sender);
    }
}
