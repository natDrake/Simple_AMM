const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { BigNumber, ethers } = require("hardhat");

describe("AMM contract", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployFixture() {
    const ONE_GWEI = 1_000_000_000;
    let tokenName1 = "Token-ABC";
    let tokenSymbol1 = "ABC";

    let tokenName2 = "Token-DEF";
    let tokenSymbol2 = "DEF";

    // let _forwarderDomain = "BSCForwarder";
    // let _version = "0.0.1";

    console.log(tokenName1);

    // Contracts are deployed using the first signer/account by default
    const [owner, user1, user2] = await ethers.getSigners();

    // deploy token contract ABC token
    const TokenContract = await ethers.getContractFactory("Token");
    const tokenContract1 = await TokenContract.deploy(tokenName1, tokenSymbol1);
    console.log(
      `Token: ${tokenSymbol1} contract deployed at: ${tokenContract1.address}`
    );

    // deploy token contract DEF token
    const tokenContract2 = await TokenContract.deploy(tokenName2, tokenSymbol2);
    console.log(
      `Token: ${tokenSymbol2} contract deployed at: ${tokenContract2.address}`
    );

    let lpTokenName = "LP-TOKEN-ABC-DEF";
    let lpTokenSymbol = "LP-ABC-DEF";

    // deploy LP token contract for ABC-DEF pair
    const lpContract = await TokenContract.deploy(lpTokenName, lpTokenSymbol);
    console.log(
      `Token: ${lpTokenSymbol} contract deployed at: ${lpContract.address}`
    );

    //deploy bridge contract
    const AmmContract = await ethers.getContractFactory("Amm");
    const ammContract = await AmmContract.deploy(
      tokenContract1.address,
      tokenContract2.address,
      lpContract.address
    );
    console.log(`AMM contract deployed at: ${ammContract.address}`);

    //provide amm contract approval for lp token contract
    let AMM_ROLE = await lpContract.AMM_ROLE();
    console.log("AMM ROLE: ", AMM_ROLE);

    await lpContract.connect(owner).grantRole(AMM_ROLE, ammContract.address);

    await tokenContract1
      .connect(owner)
      .mint(user1.address, ethers.utils.parseEther("150"));

    await tokenContract2
      .connect(owner)
      .mint(user1.address, ethers.utils.parseEther("250"));

    await tokenContract1
      .connect(owner)
      .mint(user2.address, ethers.utils.parseEther("150"));

    await tokenContract2
      .connect(owner)
      .mint(user2.address, ethers.utils.parseEther("250"));

    return {
      tokenContract1,
      tokenContract2,
      lpContract,
      ammContract,
      owner,
      user1,
      user2,
    };
  }

  describe("Deployment", function () {
    it("Should deploy token and LPtoken contract and user1,user2 should have 150,250 stake tokens", async function () {
      const {
        tokenContract1,
        tokenContract2,
        lpContract,
        ammContract,
        owner,
        user1,
        user2,
      } = await loadFixture(deployFixture);

      expect(await tokenContract1.balanceOf(user1.address)).to.equal(
        ethers.utils.parseEther("150")
      );
      expect(await tokenContract2.balanceOf(user1.address)).to.equal(
        ethers.utils.parseEther("250")
      );
      expect(await tokenContract1.balanceOf(user2.address)).to.equal(
        ethers.utils.parseEther("150")
      );
      expect(await tokenContract2.balanceOf(user2.address)).to.equal(
        ethers.utils.parseEther("250")
      );
    });

    it("User1 should be able to successfully add genesis liquidity for ABC-DEF AMM pair and receive 100 LP token in return", async function () {
      const {
        tokenContract1,
        tokenContract2,
        lpContract,
        ammContract,
        owner,
        user1,
        user2,
      } = await loadFixture(deployFixture);

      //ABC token approval
      await tokenContract1
        .connect(user1)
        .approve(ammContract.address, ethers.utils.parseEther("150"));

      //DEF token approval
      await tokenContract2
        .connect(user1)
        .approve(ammContract.address, ethers.utils.parseEther("250"));

      await ammContract
        .connect(user1)
        .addLiquidity(
          tokenContract1.address,
          tokenContract2.address,
          ethers.utils.parseEther("150"),
          ethers.utils.parseEther("250")
        );

      expect(await tokenContract1.balanceOf(user1.address)).to.equal(
        ethers.utils.parseEther("0")
      );

      expect(await tokenContract2.balanceOf(user1.address)).to.equal(
        ethers.utils.parseEther("0")
      );

      expect(await tokenContract1.balanceOf(ammContract.address)).to.equal(
        ethers.utils.parseEther("150")
      );
      expect(await tokenContract2.balanceOf(ammContract.address)).to.equal(
        ethers.utils.parseEther("250")
      );
      //LP tokens for user1
      expect(await lpContract.balanceOf(user1.address)).to.equal(
        ethers.utils.parseEther("100")
      );
    });

    it("User2 should be able to successfully add liquidity for ABC-DEF AMM pair with 15,25 tokens and receive 10 LP tokens,AFTER user1 adds genesis liquidity of 150-250", async function () {
      const {
        tokenContract1,
        tokenContract2,
        lpContract,
        ammContract,
        owner,
        user1,
        user2,
      } = await loadFixture(deployFixture);

      //USER1 ADD GENESIS LIQUIDITY FIRST
      //ABC token approval
      await tokenContract1
        .connect(user1)
        .approve(ammContract.address, ethers.utils.parseEther("150"));

      //DEF token approval
      await tokenContract2
        .connect(user1)
        .approve(ammContract.address, ethers.utils.parseEther("250"));

      await ammContract
        .connect(user1)
        .addLiquidity(
          tokenContract1.address,
          tokenContract2.address,
          ethers.utils.parseEther("150"),
          ethers.utils.parseEther("250")
        );

      //USER2 ADDS FURTHER LIQUIDITY FOR ABC-DEF AMM
      //ABC token approval
      await tokenContract1
        .connect(user2)
        .approve(ammContract.address, ethers.utils.parseEther("15")); //15 ABC TOKENS

      //DEF token approval
      await tokenContract2
        .connect(user2)
        .approve(ammContract.address, ethers.utils.parseEther("25")); //25 DEF TOKENS

      await ammContract
        .connect(user2)
        .addLiquidity(
          tokenContract1.address,
          tokenContract2.address,
          ethers.utils.parseEther("15"),
          ethers.utils.parseEther("25")
        );

      expect(await tokenContract1.balanceOf(user2.address)).to.equal(
        ethers.utils.parseEther("135") //135 ABC TOKENS
      );

      expect(await tokenContract2.balanceOf(user2.address)).to.equal(
        ethers.utils.parseEther("225") //225 DEF TOKENS
      );

      expect(await tokenContract1.balanceOf(ammContract.address)).to.equal(
        ethers.utils.parseEther("165") //165 ABC TOKENS
      );
      expect(await tokenContract2.balanceOf(ammContract.address)).to.equal(
        ethers.utils.parseEther("275") //275 DEF TOKENS
      );
      //LP tokens for user1
      expect(await lpContract.balanceOf(user2.address)).to.equal(
        ethers.utils.parseEther("10") //10 LP TOKens
      );
    });

    it("User1 should be able to successfully add genesis liquidity for ABC-DEF AMM pair and remove liquidity later for 25 shares", async function () {
      const {
        tokenContract1,
        tokenContract2,
        lpContract,
        ammContract,
        owner,
        user1,
        user2,
      } = await loadFixture(deployFixture);

      //ABC token approval
      await tokenContract1
        .connect(user1)
        .approve(ammContract.address, ethers.utils.parseEther("150"));

      //DEF token approval
      await tokenContract2
        .connect(user1)
        .approve(ammContract.address, ethers.utils.parseEther("250"));

      await ammContract
        .connect(user1)
        .addLiquidity(
          tokenContract1.address,
          tokenContract2.address,
          ethers.utils.parseEther("150"),
          ethers.utils.parseEther("250")
        );

      expect(await tokenContract1.balanceOf(user1.address)).to.equal(
        ethers.utils.parseEther("0")
      );

      expect(await tokenContract2.balanceOf(user1.address)).to.equal(
        ethers.utils.parseEther("0")
      );

      expect(await tokenContract1.balanceOf(ammContract.address)).to.equal(
        ethers.utils.parseEther("150")
      );
      expect(await tokenContract2.balanceOf(ammContract.address)).to.equal(
        ethers.utils.parseEther("250")
      );
      //LP tokens for user1
      expect(await lpContract.balanceOf(user1.address)).to.equal(
        ethers.utils.parseEther("100")
      );

      await ammContract
        .connect(user1)
        .removeLiquidity(ethers.utils.parseEther("25"));

      expect(await tokenContract1.balanceOf(user1.address)).to.equal(
        ethers.utils.parseEther("37.5")
      );

      expect(await tokenContract2.balanceOf(user1.address)).to.equal(
        ethers.utils.parseEther("62.5")
      );

      expect(await tokenContract1.balanceOf(ammContract.address)).to.equal(
        ethers.utils.parseEther("112.5")
      );
      expect(await tokenContract2.balanceOf(ammContract.address)).to.equal(
        ethers.utils.parseEther("187.5")
      );
      //LP tokens for user1
      expect(await lpContract.balanceOf(user1.address)).to.equal(
        ethers.utils.parseEther("75")
      );
    });
  });
});
