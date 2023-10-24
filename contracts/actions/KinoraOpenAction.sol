// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.16;

import {HubRestricted} from "./../lens/v2/base/HubRestricted.sol";
import {Types} from "./../lens/v2/libraries/constants/Types.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IPublicationActionModule} from "./../lens/v2/interfaces/IPublicationActionModule.sol";
import {IModuleGlobals} from "./../lens/v2/interfaces/IModuleGlobals.sol";
import "./../KinoraFactory.sol";

contract KinoraOpenAction is HubRestricted, IPublicationActionModule {
  KinoraFactory public kinoraFactory;

  error CurrencyNotWhitelisted();
  error InvalidAddress();
  error InvalidAmounts();

  IModuleGlobals public immutable MODULE_GLOBALS;
  mapping(uint256 => mapping(uint256 => address)) _granteeReceiver;

  event GrantContributed(
    address granteeAddress,
    uint256 level,
    uint256 pubId,
    uint256 profileId,
    uint256 amount
  );
  event LevelsAdded(uint256 profileId, uint256 pubId, address granteeAddress);

  constructor(
    address _hub,
    address _moduleGlobals,
    address _kinoraFactoryAddress
  ) HubRestricted(_hub) {
    MODULE_GLOBALS = IModuleGlobals(_moduleGlobals);
    kinoraFactory = KinoraFactory(_kinoraFactoryAddress);
  }

  function initializePublicationAction(
    uint256 _profileId,
    uint256 _pubId,
    address _granteeAddress,
    bytes calldata _data
  ) external override onlyHub returns (bytes memory) {

    // initiliaze the quest in the quest factory! 
    
    // initailize with an existing quest factory or start new one
    // also need to chnage sdk to now only interact with lens for this i.e. they make a lens posts!! 

    // need to fund all the milestones each time too!

    return _data;
  }

  function processPublicationAction(
    Types.ProcessActionParams calldata _params
  ) external override onlyHub returns (bytes memory) {

    // process join and each milestone claim!
   
  }

}
