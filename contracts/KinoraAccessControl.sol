// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "./KinoraErrors.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract KinoraAccessControl {
  string public symbol;
  string public name;
  address private _kinoraEscrow;
  address private _kinoraQuestData;
  address private _kinoraMetrics;
  address private _kinoraNFTCreator;
  address private _coreEnvoker;
  address public kinoraOpenAction;

  mapping(address => bool) private _envokers;

  event EnvokerAdded(address indexed envoker);
  event EnvokerRemoved(address indexed envoker);
  event CoreEnvokerChanged(address indexed newEnvoker);

  modifier onlyCoreEnvoker() {
    if (msg.sender != _coreEnvoker) {
      revert KinoraErrors.OnlyCoreEnvoker();
    }
    _;
  }

  function initialize(
    address _coreEnvokerAddress,
    address _kinoraOpenActionAddress
  ) external {
    if (kinoraOpenAction != address(0)) {
      revert KinoraErrors.AlreadyInitialized();
    }
    symbol = "KAC";
    name = "KinoraAccessControl";
    kinoraOpenAction = _kinoraOpenActionAddress;
    _envokers[_coreEnvokerAddress] = true;
    _coreEnvoker = _coreEnvokerAddress;
  }

  function setRelatedContract(
    address _kinoraEscrowAddress,
    address _kinoraQuestDataAddress,
    address _kinoraMetricsAddress,
    address _kinoraNFTCreatorAddress
  ) external {
    if (msg.sender != kinoraOpenAction) {
      revert KinoraErrors.InvalidAddress();
    }

    _kinoraEscrow = _kinoraEscrowAddress;
    _kinoraQuestData = _kinoraQuestDataAddress;
    _kinoraMetrics = _kinoraMetricsAddress;
    _kinoraNFTCreator = _kinoraNFTCreatorAddress;
  }

  function addEnvoker(address _envoker) external onlyCoreEnvoker {
    if (_envoker == msg.sender || _envokers[_envoker]) {
      revert KinoraErrors.InvalidAddress();
    }

    _envokers[_envoker] = true;
    emit EnvokerAdded(_envoker);
  }

  function removeEnvoker(address _envoker) external onlyCoreEnvoker {
    if (_envoker == msg.sender || !_envokers[_envoker]) {
      revert KinoraErrors.InvalidAddress();
    }
    delete _envokers[_envoker];
    emit EnvokerRemoved(_envoker);
  }

  function changeCoreEnvoker(address _newEnvoker) external onlyCoreEnvoker {
    _envokers[_coreEnvoker] = false;
    _coreEnvoker = _newEnvoker;
    _envokers[_newEnvoker] = true;
    emit CoreEnvokerChanged(_newEnvoker);
  }

  function isEnvoker(address _address) public view returns (bool) {
    return _envokers[_address];
  }

  function isCoreEnvoker() public view returns (address) {
    return _coreEnvoker;
  }

  function getKinoraEscrow() public view returns (address) {
    return _kinoraEscrow;
  }

  function getKinoraMetrics() public view returns (address) {
    return _kinoraMetrics;
  }

  function getKinoraQuestData() public view returns (address) {
    return _kinoraQuestData;
  }

  function getKinoraNFTCreator() public view returns (address) {
    return _kinoraNFTCreator;
  }
}
