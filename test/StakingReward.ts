import assert from "node:assert/strict";
import { describe, it } from "node:test";
import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers"
import { expect } from "chai"

const { ethers } = hre


//Cette partie marque l'initialisation et est obligatoire
describe("StakingReward", function () {
  //On crée toutes les variables pour ne pas avoir à les réécrire encore plus tard
  let owner:any
  let user:any
  let other:any
  let StakingToken:any
  let RewardToken:any
  let stakingContractDeploy:any

  beforeEach(
    async ()=>{
       [owner, user, other] = await (ethers as any).getSigners() //cela représente nos utilisateurs qui vont intéragir avec nos contracts
                                                           //Quand on ne précise pas qui utilise le contract avec .connect(user) dans le deployment du contract, c'est le premier qui est pris

    //On me la variable mint qui est sensé convertir nos ether en weight (1 ether = 10^18 weight)
    const amountToMint = ethers.parseEther("1000") 
    console.log(amountToMint)

    // //On va importer le contrat du ERC20 qu'on a fait dans notre Mock
    const MockERC20 = await ethers.getContractFactory("MockERC20") 
    
    // On va initialiser nos token avec le contract principal
    StakingToken = await MockERC20.deploy("Staking Token", "STK", amountToMint) 
    await StakingToken.waitForDeployment();

    RewardToken = await MockERC20.deploy("Reward Token", "RWT", amountToMint)
    await RewardToken.waitForDeployment();

    const StakingReward = await ethers.getContractFactory("StakingReward")
    stakingContractDeploy = await StakingReward.deploy(await StakingToken.getAddress(), await RewardToken.getAddress())
    stakingContractDeploy.waitForDeployment()

    //On va créditer le compte du user
    await (StakingToken as any).mint(await user.getAddress(), amountToMint)
    await (RewardToken as any).mint(await user.getAddress(), amountToMint)


    return{ stakingContractDeploy, RewardToken, StakingToken, user, owner}

  })
    
   

  describe("Constructor",function () {
    it("Test if there is an error when token adresses are zero", async function (){
      const StakingReward = await ethers.getContractFactory("StakingReward")
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const testStakingToken = await MockERC20.deploy("Test Staking", "TSTK", ethers.parseEther("1000"));
      const testRewardToken = await MockERC20.deploy("Test Reward", "TRWD", ethers.parseEther("1000"));

      await testStakingToken.waitForDeployment();
      await testRewardToken.waitForDeployment();

      //On ajoute le expect pour retourner l'erreur proprement
      //Cas ou le stakingToken = 0
       await expect(
         StakingReward.deploy(ethers.ZeroAddress, await testStakingToken.getAddress())
      ).to.be.revertedWithCustomError(stakingContractDeploy, "InvalidAddress")
      
      //Cas ou le rewardToken = 0
      await expect(
         StakingReward.deploy(await testStakingToken.getAddress(), ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(stakingContractDeploy, "InvalidAddress")

      //Cas ou les deux sont = 0
      await expect(
         StakingReward.deploy(ethers.ZeroAddress, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(stakingContractDeploy, "InvalidAddress")
    })
  })

  //Vérification des variables d'état
  describe("Check initial value", function(){
    it ("Has 0 RewardPerToken and earned", async function() {
      await expect(
        stakingContractDeploy.RewardPerToken()
      ).to.be.equal(0n)

      await expect(
        stakingContractDeploy.earned(await user.getAddress())
      ).to.be.equal(0n)

      await expect(
        stakingContractDeploy.lastTimeRewardApplicable()
      ).to.be.equal(0n)
    })
  })

  //Vérification du staking 
  describe("Function Staking test", async function(){
    it.only("Test the modifier", async function(){
      await expect(
        stakingContractDeploy.connect(user).stake(0n)
      ).to.be.revertedWithCustomError(stakingContractDeploy, "needMoreThanZero")
    })
  })


})