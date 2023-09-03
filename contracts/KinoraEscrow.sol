// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.19;

import "./KinoraAccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract KinoraEscrow {
  KinoraAccessControl private _accessControl;

  constructor(address _accessControlAddress) {
    _accessControl = KinoraAccessControl(_accessControlAddress);
  }

  mapping(address => mapping(address => uint256)) public erc20Deposits;
  mapping(address => mapping(address => uint256[])) public erc721Deposits;

  event ERC20Deposited(
    address indexed user,
    address indexed tokenAddress,
    uint256 amount
  );
  event ERC721Deposited(
    address indexed user,
    address indexed tokenAddress,
    uint256 tokenId
  );
  event ERC20Withdrawn(
    address indexed user,
    address indexed tokenAddress,
    uint256 amount
  );
  event ERC721Withdrawn(
    address indexed user,
    address indexed tokenAddress,
    uint256 tokenId
  );

  function depositERC20(address tokenAddress, uint256 amount) public {
    require(
      IERC20(tokenAddress).transferFrom(msg.sender, address(this), amount),
      "KinoraEscrow: Transfer failed."
    );

    erc20Deposits[msg.sender][tokenAddress] += amount;

    emit ERC20Deposited(msg.sender, tokenAddress, amount);
  }

  function withdrawERC20(address tokenAddress, uint256 amount) public {
    require(
      erc20Deposits[msg.sender][tokenAddress] >= amount,
      "KinoraEscrow: Insufficient balance."
    );

    require(
      IERC20(tokenAddress).transfer(msg.sender, amount),
      "KinoraEscrow: Transfer failed."
    );

    erc20Deposits[msg.sender][tokenAddress] -= amount;

    emit ERC20Withdrawn(msg.sender, tokenAddress, amount);
  }

  function depositERC721(address tokenAddress, uint256 tokenId) public {
    IERC721(tokenAddress).safeTransferFrom(msg.sender, address(this), tokenId);

    erc721Deposits[msg.sender][tokenAddress].push(tokenId);

    emit ERC721Deposited(msg.sender, tokenAddress, tokenId);
  }

  function withdrawERC721(address tokenAddress, uint256 tokenId) public {
    uint256[] storage depositedTokens = erc721Deposits[msg.sender][
      tokenAddress
    ];
    bool found = false;
    for (uint256 i = 0; i < depositedTokens.length; i++) {
      if (depositedTokens[i] == tokenId) {
        found = true;
        depositedTokens[i] = depositedTokens[depositedTokens.length - 1];
        depositedTokens.pop();
        break;
      }
    }

    require(found, "KinoraEscrow: Token ID not found in deposits.");

    IERC721(tokenAddress).safeTransferFrom(address(this), msg.sender, tokenId);

    emit ERC721Withdrawn(msg.sender, tokenAddress, tokenId);
  }
}
