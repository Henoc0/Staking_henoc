// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface IStakingReward {
    function stake(uint256 amount) external;
    function withdraw(uint256 amount) external;

}