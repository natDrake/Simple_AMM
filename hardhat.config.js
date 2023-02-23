require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("hardhat-docgen");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      chainId: 31337,
    },
    mumbai: {
      url: `${process.env.MUMBAI_RPC_URL}`,
      chainId: 80001,
      accounts: [
        `0x${process.env.DEPLOYER_PRIVATE_KEY}`,
        `0x${process.env.USER_PRIVATE_KEY}`,
      ],
      gas: 2000000,
      gasPrice: 30000000000,
    },
    bsc: {
      url: `${process.env.BSC_TESTNET_RPC_URL}`,
      chainId: 97,
      accounts: [
        `0x${process.env.DEPLOYER_PRIVATE_KEY}`,
        `0x${process.env.USER_PRIVATE_KEY}`,
      ],
      gas: 2000000,
      gasPrice: 20000000000,
    },
    avax: {
      url: `${process.env.AVALANCHE_TESTNET_RPC_URL}`,
      chainId: 43113,
      accounts: [
        `0x${process.env.DEPLOYER_PRIVATE_KEY}`,
        `0x${process.env.USER_PRIVATE_KEY}`,
      ],
      gas: 2000000,
      gasPrice: 20000000000,
    },
  },
  solidity: {
    version: "0.8.9",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 40000,
  },
  docgen: {
    path: "./docs",
    clear: true,
    runOnCompile: true,
  },
};
