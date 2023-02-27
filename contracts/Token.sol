// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract Token is ERC20, AccessControl, Pausable {
    // uint256 public initialSupply;
    bytes32 public constant AMM_ROLE = keccak256("AMM_ROLE");

    constructor(string memory _assetName, string memory _assetSymbol)
        ERC20(_assetName, _assetSymbol)
    {
        // initialSupply = _initalSupply;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "Token: Only Admin");
        _;
    }

    /**
     @dev modifier to check if the sender is AMM or not
     * Revert if the sender is not AMM contract
     */
    modifier onlyAMM() {
        require(hasRole(AMM_ROLE, _msgSender()), "Token: Only AMM");
        _;
    }

    /**
     @dev modifier to check if the sender is either AMM or Admin
     * Revert if the sender is neither AMM contract nor Admin
     */
    modifier AMMOorAdmin() {
        require(
            hasRole(AMM_ROLE, _msgSender()) ||
                hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "Token: Only AMM or Admin"
        );
        _;
    }

    function mint(address account, uint256 amount)
        external
        AMMOorAdmin
        whenNotPaused
    {
        _mint(account, amount);
    }

    function burn(address account, uint256 amount)
        external
        AMMOorAdmin
        whenNotPaused
    {
        _burn(account, amount);
    }

    function pause() external onlyAdmin {
        _pause();
    }

    function unpause() external onlyAdmin {
        _unpause();
    }
}
