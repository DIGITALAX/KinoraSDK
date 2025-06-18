// SPDX-License-Identifier: UNLICENSE

pragma solidity ^0.8.26;


import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

contract TestERC721 is ERC721Enumerable {
  uint constant _initial_supply = 20000 * (10 ** 18);

  mapping(uint256 => string) public tokenURIs;

  constructor() ERC721("TestERC721", "TEST") {
    _safeMint(msg.sender, 1);
    _safeMint(msg.sender, 2);
    _safeMint(msg.sender, 3);
    _safeMint(msg.sender, 4);

    tokenURIs[1] = "ipfs://QmPs78ezRnRzXu5pnD3zkeSWfFHuYS2bwS7pBpu7y9tS9a";
    tokenURIs[2] = "ipfs://QmcdAXfprAtwjWnYcjWFf2u4N34GRuEzkbyEffDZKq5ncj";
    tokenURIs[3] = "ipfs://QmPs78ezRnRzXu5pnD3zkeSWfFHuYS2bwS7pBpu7y9tS9a";
    tokenURIs[4] = "different";
  }

  function mint(address to, uint256 amount) public {
    _mint(to, amount);
  }

  function tokenURI(
    uint256 tokenId
  ) public view override returns (string memory) {
    return tokenURIs[tokenId];
  }
}
