// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "./IToken.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract Amm is AccessControl {
    address[] public swapTokens;
    mapping(address => bool) public swapTokensAllowed;

    // //token->userAddress->depositAmount. Not required to maintain as LP shares token will be given.
    // mapping(address => mapping(address => uint256)) public userTokenBalance;

    //token->token->Lptoken
    mapping(address => mapping(address => address))
        public liquidityProviderTokenAddress;

    //Lptoken->userAddress->LPshare
    mapping(address => mapping(address => uint256))
        public liquidityProviderShare;

    uint256 totalShares;

    uint256 constant PRECISION = 10**18; // Precision of 18 digits

    constructor(
        address _token1,
        address _token2,
        address _lpToken
    ) {
        swapTokensAllowed[_token1] = true;
        swapTokensAllowed[_token2] = true;
        swapTokens.push(_token1);
        swapTokens.push(_token2);
        liquidityProviderTokenAddress[_token1][_token2] = _lpToken;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Amm: Not an Admin");
        _;
    }

    //enable new token to be swapped via this Amm contract
    function enableSwapToken(address _newToken) external onlyAdmin {
        require(_newToken != address(0), "Amm:Null Address");
        require(
            swapTokensAllowed[_newToken] != true,
            "Amm: Swap Token already exists"
        );
        // swapTokens.push(_newToken);
        swapTokensAllowed[_newToken] = true;
    }

    function getLPtokenAddress(address _token1, address _token2)
        public
        view
        returns (address lpToken)
    {
        lpToken = (liquidityProviderTokenAddress[_token1][_token2] !=
            address(0))
            ? liquidityProviderTokenAddress[_token1][_token2]
            : liquidityProviderTokenAddress[_token2][_token1];
    }

    function getLPtokenShare(address _lpToken, address _user)
        public
        view
        returns (uint256 share)
    {
        share = liquidityProviderShare[_lpToken][_user];
    }

    // Returns the balance of the user
    function getMyHoldings()
        external
        view
        returns (
            // uint256 amountToken1,
            // uint256 amountToken2,
            uint256 myShare
        )
    {
        // amountToken1 = token1Balance[msg.sender];
        // amountToken2 = token2Balance[msg.sender];
        myShare = getLPtokenShare(
            getLPtokenAddress(swapTokens[0], swapTokens[1]),
            msg.sender
        );
    }

    // Returns the total amount of tokens locked in the pool and the total shares issued corresponding to it
    function getPoolDetails()
        external
        view
        returns (
            uint256,
            uint256,
            uint256
        )
    {
        IERC20 token1 = IERC20(swapTokens[0]);
        IERC20 token2 = IERC20(swapTokens[1]);
        return (
            token1.balanceOf(address(this)),
            token2.balanceOf(address(this)),
            totalShares
        );
    }

    // Returns amount of Token1 required when providing liquidity with _amountToken2 quantity of Token2
    function getEquivalentToken1Estimate(uint256 _amountToken2)
        public
        view
        returns (uint256 reqToken1)
    {
        IERC20 token1 = IERC20(swapTokens[0]);
        IERC20 token2 = IERC20(swapTokens[1]);
        reqToken1 =
            (token1.balanceOf(address(this)) * (_amountToken2)) /
            (token2.balanceOf(address(this)));
    }

    // Returns amount of Token2 required when providing liquidity with _amountToken1 quantity of Token1
    function getEquivalentToken2Estimate(uint256 _amountToken1)
        public
        view
        returns (uint256 reqToken2)
    {
        IERC20 token1 = IERC20(swapTokens[0]);
        IERC20 token2 = IERC20(swapTokens[1]);
        reqToken2 =
            (token2.balanceOf(address(this)) * (_amountToken1)) /
            (token1.balanceOf(address(this)));
    }

    /*ADD LIQUIDITY BY User.
    This AMM follows constant product x*y = k formula for liquidity.
        How much dx, dy to add?

        xy = k
        (x + dx)(y + dy) = k'

        No price change, before and after adding liquidity
        x / y = (x + dx) / (y + dy)

        x(y + dy) = y(x + dx)
        x * dy = y * dx

        x / y = dx / dy
        dy = y / x * dx

    */
    function addLiquidity(
        address _token1,
        address _token2,
        uint256 _amount1,
        uint256 _amount2
    ) external returns (uint256) {
        require(
            swapTokensAllowed[_token1] == true &&
                swapTokensAllowed[_token2] == true,
            "Amm: Token not enabled in AMM contract"
        );
        require(_amount1 > 0 && _amount2 > 0, "Amm: Invalid token amount");

        IERC20 token1 = IERC20(_token1);
        IERC20 token2 = IERC20(_token2);
        IToken lpToken = IToken(
            liquidityProviderTokenAddress[_token1][_token2]
        );

        uint256 shares;

        //genesis liquidity
        if (
            token1.balanceOf(address(this)) == 0 &&
            token2.balanceOf(address(this)) == 0
        ) {
            // //deploy LP token contract
            // string memory _name = string(
            //     abi.encodePacked("LPtoken-", token1.symbol(), token2.symbol())
            // );
            // ERC20 lpToken = new ERC20(_name, _name);
            shares = 100 * PRECISION;
        } else {
            require(
                token1.balanceOf(address(this)) * _amount2 ==
                    token2.balanceOf(address(this)) * _amount1,
                "AMM: Wrong balance sent for deposit"
            );
            //shares calculation
            shares = (totalShares * _amount1) / token1.balanceOf(address(this));
        }
        totalShares += shares;
        //mint lp tokens for liquidity provider
        lpToken.mint(msg.sender, shares);
        //deposit token1 into this address from liquidity provider
        token1.transferFrom(msg.sender, address(this), _amount1);
        //deposit token2 into this address from liquidity provider
        token2.transferFrom(msg.sender, address(this), _amount2);
        liquidityProviderShare[address(lpToken)][msg.sender] += shares;
        return shares;
    }

    //remove liquidity by user
    function removeLiquidity(uint256 _shares)
        external
        returns (uint256, uint256)
    {
        require(
            _shares <=
                liquidityProviderShare[
                    liquidityProviderTokenAddress[swapTokens[0]][swapTokens[1]]
                ][msg.sender],
            "AMM:Invalid shares"
        );

        IERC20 token1 = IERC20(swapTokens[0]);
        IERC20 token2 = IERC20(swapTokens[1]);
        IToken lpToken = IToken(
            getLPtokenAddress(swapTokens[0], swapTokens[1])
        );

        require(
            lpToken.balanceOf(msg.sender) >= _shares,
            "AMM:Insufficient user LP token balance"
        );

        uint256 _token1 = (_shares * token1.balanceOf(address(this))) /
            totalShares;
        uint256 _token2 = (_shares * token2.balanceOf(address(this))) /
            totalShares;

        //transfer token1 back to user
        token1.transfer(msg.sender, _token1);
        //transfer token2 back to user
        token2.transfer(msg.sender, _token2);
        //burn user LP tokens on removing liquidity
        lpToken.burn(msg.sender, _shares);
        //reduce total shares
        totalShares -= _shares;
        return (_token1, _token2);
    }

    function _indexOfToken(address _tokenAddress)
        private
        view
        returns (uint256 i)
    {
        for (i = 0; i < swapTokens.length; i++) {
            if (swapTokens[i] == _tokenAddress) {
                return i;
            }
        }
    }

    /*
        xy = k
        (x + dx)(y - dy) = k
        y - dy = k / (x + dx)
        y - k / (x + dx) = dy
        y - xy / (x + dx) = dy
        (yx + ydx - xy) / (x + dx) = dy
        ydx / (x + dx) = dy
    */
    function swap(address _tokenToSwap, uint256 _amountToSwap)
        external
        returns (uint256)
    {
        require(
            _tokenToSwap == swapTokens[0] || _tokenToSwap == swapTokens[1],
            "AMM:wrong token to swap"
        );
        require(_amountToSwap > 0, "AMM:invalid token amount to swap");
        uint256 swapTokenIndex = _indexOfToken(_tokenToSwap);

        IERC20 token1 = IERC20(swapTokens[swapTokenIndex]);
        IERC20 token2 = IERC20(
            swapTokens[
                swapTokenIndex - 1 >= 0
                    ? swapTokenIndex - 1
                    : swapTokenIndex + 1
            ]
        );
        require(
            token1.balanceOf(msg.sender) >= _amountToSwap,
            "AMM: insufficient balance with user"
        );

        uint256 _swappedAmount = (token2.balanceOf(address(this)) *
            _amountToSwap) / (token1.balanceOf(address(this)) + _amountToSwap);

        //transfer swap token from user to this contract
        token1.transferFrom(msg.sender, address(this), _amountToSwap);
        //transfer swapped token from this contract to user
        token2.transfer(address(this), _swappedAmount);
        return _swappedAmount;
    }
}
