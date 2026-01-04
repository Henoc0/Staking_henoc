import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers"
import { expect } from "chai"

const { ethers } = hre


//Cette partie marque l'initialisation et est obligatoire
describe("StakingReward", function () {
  //On crée toutes les variables pour ne pas avoir à les réécrire encore plus tard
    async function deployFixture(){
      const [owner, user, other] = await (ethers).getSigners() //cela représente nos utilisateurs qui vont intéragir avec nos contracts
                                                            //Quand on ne précise pas qui utilise le contract avec .connect(user) dans le deployment du contract, c'est le premier qui est pris

      // //On va importer le contrat du ERC20 qu'on a fait dans notre Mock
      const MockERC20 = await ethers.getContractFactory("MockERC20") 
      
      // On va initialiser nos token avec le contract principal
      const StakingToken = await MockERC20.deploy("Staking Token", "STK", 0) 
      await StakingToken.waitForDeployment();

      const RewardToken = await MockERC20.deploy("Reward Token", "RWT", 0)
      await RewardToken.waitForDeployment();

      const StakingReward = await ethers.getContractFactory("StakingReward")
      const stakingContractDeploy = await StakingReward.deploy(await StakingToken.getAddress(), await RewardToken.getAddress())
      stakingContractDeploy.waitForDeployment()

      //On va créditer le compte du user
      //On me la variable mint qui est sensé convertir nos ether en weight (1 ether = 10^18 weight)
      const InitialMint = ethers.parseEther("1000") 
      await (StakingToken as any).mint(await user.getAddress(), InitialMint)
      await (RewardToken as any).mint(await user.getAddress(), InitialMint)


      return {stakingContractDeploy, RewardToken, StakingToken, user, owner, StakingReward, InitialMint}
  }
    
   

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
      ).to.be.revertedWithCustomError(StakingReward, "InvalidAddress")
      
      //Cas ou le rewardToken = 0
      await expect(
         StakingReward.deploy(await testStakingToken.getAddress(), ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(StakingReward, "InvalidAddress")

      //Cas ou les deux sont = 0
      await expect(
         StakingReward.deploy(ethers.ZeroAddress, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(StakingReward, "InvalidAddress")
    })
  })

  //Vérification des variables d'état
  describe("Check initial value", function(){
    it ("Has 0 RewardPerToken and earned", async function() {
      const {stakingContractDeploy, user} = await loadFixture(deployFixture)
      expect(
      await stakingContractDeploy.RewardPerToken()
      ).to.equal(0n)

      expect(
      await stakingContractDeploy.earned(await user.getAddress())
      ).to.equal(0n)
    })

     it("lastTimeRewardApplicable is 0 initially", async function () {
      const {stakingContractDeploy} = await loadFixture(deployFixture)
      expect(
      await stakingContractDeploy.LastTimeReward()
      ).to.equal(0n)
    })
  })

  //Vérification du staking 
  describe("Function Staking test", async function(){
    it("Test the modifier", async function(){
      const {stakingContractDeploy, user} = await loadFixture(deployFixture)
      await expect(
        stakingContractDeploy.connect(user).stake(0n)
      ).to.be.revertedWithCustomError(stakingContractDeploy, "needMoreThanZero")
    })

    it.only("Transfer token, update total supply and emit events", async function(){
      const {stakingContractDeploy, StakingToken, user} = await loadFixture(deployFixture) 
      const amount = ethers.parseEther('100')

      // Vérifier que le user a bien des tokens
      const userBalance = await (StakingToken as any).balanceOf(await user.getAddress())
      console.log("User balance before approval:", userBalance.toString())
      
      // Autoriser le contrat a prendre les tokens du user
      const allowance = await (StakingToken as any).allowance(await user.getAddress(), await stakingContractDeploy.getAddress())
      const approveTx = await (StakingToken as any).connect(user).approve(await stakingContractDeploy.getAddress(), amount)
      await approveTx.wait() // Attendre que la transaction soit confirmée
      
      // Vérifier que l'approbation a bien été faite
      const adresse = await stakingContractDeploy.getAddress()
      const sold = await (StakingToken as any).balanceOf(await adresse)
      console.log("Allowance:", allowance.toString())
      console.log("Adresse du contrat:" ,adresse)
      console.log("Solde du contrat: ", sold);
      

      // expect(allowance).to.equal(amount)

      const userBefore = await (StakingToken as any).balanceOf(await user.getAddress()) //Avoir l'habitude de ne pas utiliser user seul, la plupart du temps, on ne veut que l'adresse
      // console.log(userBefore);
      const contractBefore = await (StakingToken as any).balanceOf(await stakingContractDeploy.getAddress())
      // console.log(contractBefore);
      const totalBefore = await (stakingContractDeploy as any).totalSupply()
      // console.log(totalBefore);
      

      await expect(
        stakingContractDeploy.connect(user).stake(amount)
      ).to.emit(stakingContractDeploy, "staked").withArgs(await user.getAddress(), amount)

      const userAfter = await (StakingToken as any).balanceOf(await user.getAddress())
      console.log(userAfter);
      const contractAfter = await (StakingToken as any).balanceOf(await stakingContractDeploy.getAddress())
      console.log(contractAfter);
      const totalAfter = await (stakingContractDeploy as any).totalSupply()
      console.log(totalAfter);
      

      expect(userAfter).to.equal(userBefore - amount)
      expect(contractAfter).to.equal(contractBefore + amount)
      expect(totalAfter).to.equal(totalBefore + amount)
    })
  })
  //Vérification du reward
  // describe("Function reward test", async function(){
  //   it("Rward more than staked")
  // })

})
  
