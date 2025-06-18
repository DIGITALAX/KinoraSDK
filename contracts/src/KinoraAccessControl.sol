// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.26;

import "./KinoraErrors.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract KinoraAccessControl is Initializable {
  address private _kinoraEscrow;
  address private _kinoraQuestData;
  address private _kinoraMetrics;
  address private _kinoraNFTCreator;
  address private _coreEnvoker;
  address private _kinoraOpenAction;

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
    address coreEnvokerAddress,
    address kinoraOpenActionAddress
  ) public initializer {
    if (_kinoraOpenAction != address(0)) {
      revert KinoraErrors.AlreadyInitialized();
    }
    _kinoraOpenAction = kinoraOpenActionAddress;
    _envokers[coreEnvokerAddress] = true;
    _coreEnvoker = coreEnvokerAddress;
  }

  function setRelatedContract(
    address _kinoraEscrowAddress,
    address _kinoraQuestDataAddress,
    address _kinoraMetricsAddress,
    address _kinoraNFTCreatorAddress
  ) external {
    if (msg.sender != _kinoraOpenAction) {
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

  function changeCoreEnvoker(address newEnvoker) external onlyCoreEnvoker {
    _envokers[_coreEnvoker] = false;
    _coreEnvoker = newEnvoker;
    _envokers[newEnvoker] = true;
    emit CoreEnvokerChanged(newEnvoker);
  }

  function isEnvoker(address envoker) public view returns (bool) {
    return _envokers[envoker];
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

  function getKinoraOpenAction() public view returns (address) {
    return _kinoraOpenAction;
  }

  function symbol() public pure returns (string memory) {
    return "KAC";
  }

  function name() public pure returns (string memory) {
    return "KinoraAccessControl";
  }
}
