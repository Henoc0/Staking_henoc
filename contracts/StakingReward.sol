// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./interfaces/IStakingReward.sol";
//On importe le fichier de l'interface pour écrire toutes les fonctions qui y sont ratachés sans faire d'erreur
//C'est le protocole syntethics qui donne cette structure pour la réalisation de ce staking

//On fait hériter notre contrat des fonctions de l'interface
//Les contrats doivent vérifier le CEI : Check, Effect, interact 
contract StakingReward is IStakingReward{
    IERC20 public immutable StakingToken;
    IERC20 public immutable RewardToken;

    //Il faut ajouter un constructeur pour initialiser les variables déclarés comme immutable pour que le code soit correct
    constructor(address _rewardToken, address _stakingToken) {
        if (_rewardToken == address(0) || _stakingToken == address(0)) revert InvalidAddress();

        StakingToken = IERC20(_stakingToken);
        RewardToken = IERC20(_rewardToken);
    }

    uint256 public totalSupply;
    mapping(address => uint256) public balance;
    mapping(address => uint256) public rewardPerTokenPaid;
    mapping(address => uint256) public reward;



    event staked(address user, uint256 amount);
    event withdrawn(address user, uint256 amount);

    // reward variable
    uint256 public rewardRate; //Récompense par secondes 
    uint256 public rewarDuration; //Durée totale des récompenses, a quel fréquence les earned sont générés
    uint256 public rewardPerTokenStored; //Récompense pour chaque token
    uint256 public periodFinish;
    uint256 public lastUpdateTime;

    //Décrire une erreur sous forme de fonction comme ça pour consommer moins de frais de gas
    //On doit éviter au maximum les chaines de caractères pour réduire les frais de gas quand on fait du solidity
    error needMoreThanZero(); 
    error InvalidAddress();

    //Les modifier, des fonctions qui peuvent etre utilisé dans d'autres fonction
    modifier moreThanZero(uint256 _amount){
        if(_amount ==0) revert needMoreThanZero();
        _;
    }

    //Un modifier pour faire la mise a jour des données
    modifier updateReward(address user){
        rewardPerTokenStored = RewardPerToken();
        reward[msg.sender] = earned(user);
        rewardPerTokenPaid[user] = rewardPerTokenStored;
        _;
    }


    function stake(uint256 _amount) external moreThanZero((_amount)) updateReward(msg.sender){
        balance[msg.sender]+= _amount;
        totalSupply += _amount;
        StakingToken.transferFrom(msg.sender, address(this), _amount);
        emit staked(msg.sender, _amount);
    }

    function withdraw(uint256 _amount) external  moreThanZero((_amount)) updateReward(msg.sender){
        balance[msg.sender]-= _amount;
        totalSupply -= _amount;
        StakingToken.transfer(msg.sender, _amount);
        emit withdrawn(msg.sender, _amount);
    }

    //Calcule la récompense cumulative par token staké
    function RewardPerToken() public view returns(uint256) {
        if (totalSupply==0) return rewardPerTokenStored;
        uint256 timeDelta = LastTimeReward()-lastUpdateTime;
        return rewardPerTokenStored + (timeDelta * rewarDuration * 1e18)/totalSupply;
    }

    //Calcule le moment ou les récompenses doivent etre calculé
    function LastTimeReward() public view returns(uint256){
        uint256 finish = periodFinish;
        return block.timestamp < finish ? block.timestamp : finish;
    }

    //Calcul les récompenses gagnés par un utilisateur 
    function earned(address _user) public view returns(uint256){
        return (balance[_user] * RewardPerToken() - rewardPerTokenPaid[_user])/1e18 + reward[_user];
    }
}
//npx hardhat compile pour compiler