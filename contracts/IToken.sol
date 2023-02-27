// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface IToken {
    function mint(address account, uint256 amount) external;

    function burn(address account, uint256 amount) external;

    function totalSupply() external view returns (uint256);

    function balanceOf(address account) external view returns (uint256);

    function pause() external;

    function unpause() external;
}
