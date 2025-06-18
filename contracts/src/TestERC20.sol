// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.26;


import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestERC20 is ERC20 {
  uint constant _initial_supply = 20000 * (10 ** 18);

  constructor() ERC20("TestERC20", "TEST") {
    _mint(msg.sender, _initial_supply);
  }

  function mint(address to, uint256 amount) public {
    _mint(to, amount);
  }
}
