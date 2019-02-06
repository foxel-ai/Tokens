/*
Implements EIP20 token standard: https://github.com/ethereum/EIPs/blob/master/EIPS/eip-20.md
.*/


pragma solidity ^0.4.21;

import "../eip20/EIP20Interface.sol";
import "../SafeMath.sol";


contract Foxel is EIP20Interface {
    using SafeMath for uint;
    uint256 constant private MAX_UINT256 = 2 ** 256 - 1;
    mapping(address => uint256) public balances;
    mapping(address => bool) public allowedToPurchase;
    mapping(address => mapping(address => uint256)) public allowedToTransfer;

    string  public name;                   // Foxel
    string  public symbol;                 // FXL
    uint256 public totalSupply;
    uint256 public reserveAmount;
    uint256 public price;
    uint256 public reserveThreshold;
    address private owner;
    address private newOwner;
    address private trade;

    event Buy(address _to, uint amount);
    event Sell(address _to, uint amount);

    constructor(
        string  _tokenName,
        string  _tokenSymbol,
        uint256 _price,
        address _trade
    ) public {
        name =   _tokenName;
        symbol = _tokenSymbol;
        price = _price;
        totalSupply = 0;
        reserveAmount = 0;
        reserveThreshold = 10;     //This is supposed to be a percentage of totalSupply
        owner = msg.sender;
        allowedToPurchase[owner] = true;
        trade = _trade;
    }

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    modifier canBuy() {
        //TODO TW msg.sender, check for registration
        require(msg.value > 0);
        require(allowedToPurchase[msg.sender] == true);
        _;
    }

    modifier canSell(uint256 amount) {
        require(amount > 0);
        require(balanceOfSC() >= reserveAmount);
        require(balanceOf(msg.sender) >= amount);
        _;
    }

    modifier canWithdraw(address seller, uint256 amount) {
        require(amount > 0);
        require(msg.sender == trade);
        require(address(this).balance >= reserveAmount);
        _;
    }

    function buy()
    canBuy()
    public payable returns (bool success) {
        // Adding 10% of wei sent to our reserve amount.
        // The reserve amount is the lowest amount we can withdraw for trading.
        // If we have more funds in the contract than need we only add 10% of funds to the reserve
        if (balanceOfSC() >= reserveAmount){
            reserveAmount += msg.value.mul(100).div(reserveThreshold).div(100);
        // Otherwise we'll add the whole amount transferred
        } else {
            reserveAmount += msg.value;
        }

        uint amount = msg.value.div(price);
        balances[msg.sender] += amount;
        totalSupply += amount;
        emit Buy(msg.sender, amount);
        return true;
    }

    function sell(uint256 amount)
    canSell(amount)
    public returns (bool success) {
        balances[msg.sender] -= amount;
        totalSupply -= amount;
        uint256 eth_to_send_back = amount.mul(price);
        // Removing entire amount of transaction from reserve to verify the current funds in reserve
        if ( reserveAmount - eth_to_send_back >= 0) {
            reserveAmount -= eth_to_send_back;
        } else {
            reserveAmount = 0;
        }
        msg.sender.transfer(eth_to_send_back);
        emit Sell(msg.sender, amount);
        return true;
    }

    function transfer(address _to, uint256 _value)
    public returns (bool success) {
        require(balances[msg.sender] >= _value);
        balances[msg.sender] -= _value;
        balances[_to] += _value;
        emit Transfer(msg.sender, _to, _value); //solhint-disable-line indent, no-unused-vars
        return true;
    }

    function transferFrom(address _from, address _to, uint256 _value)
    public returns (bool success) {
        uint256 allowance = allowedToTransfer[_from][msg.sender];
        require(balances[_from] >= _value && allowance >= _value);
        balances[_to] += _value;
        balances[_from] -= _value;
        if (allowance < MAX_UINT256) {
            allowedToTransfer[_from][msg.sender] -= _value;
        }
        emit Transfer(_from, _to, _value); //solhint-disable-line indent, no-unused-vars
        return true;
    }

    function balanceOf(address _owner)
    public view returns (uint256 balance) {
        return balances[_owner];
    }

    function approve(address _spender, uint256 _value)
    public returns (bool success) {
        allowedToTransfer[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value); //solhint-disable-line indent, no-unused-vars
        return true;
    }

    function allowance(address _owner, address _spender)
    public view returns (uint256 remaining) {
        return allowedToTransfer[_owner][_spender];
    }

    // TODO TW can't remember what this is for...
    function recoverLost(EIP20Interface token, address loser)
    public onlyOwner {
        token.transfer(loser, token.balanceOf(this));
    }

    // Admin Functions
    function balanceOfReserve()
    public view returns (uint256 balance) {
        return reserveAmount;
    }

    // Admin Functions
    function addBuyer(address buyer)
    onlyOwner
    public returns (bool wasAdded){
        allowedToPurchase[buyer] = true;
    }

    // Admin Functions
    function removeBuyer(address buyer)
    onlyOwner
    public returns (bool wasAdded){
        allowedToPurchase[buyer] = false;
    }

    function balanceOfSC()
    onlyOwner
    public view returns (uint256 balance) {
        return address(this).balance;
    }

    function availableForWithdraw()
    onlyOwner
    public view returns (uint256 balance) {
        return balanceOfSC() - reserveAmount;
    }

    function setTrade(address _trade)
    onlyOwner
    public {
        trade = _trade;
    }

    function withdraw(uint256 amount)
    canWithdraw (msg.sender, amount)
    public {
        trade.transfer(amount);
    }

    function changeOwner(address _newOwner)
    onlyOwner
    public {
        newOwner = _newOwner;
    }

    function acceptOwnership()
    public {
        if (msg.sender == newOwner) {
            owner = newOwner;
            newOwner = 0x0000000000000000000000000000000000000000;
        }
    }

    // fallback function that allows contract to accept ETH
    function () onlyOwner public payable {
        //TODO What do we want to do here? We can error, accept, revert, accept and give the sender foxel?
    }

}
