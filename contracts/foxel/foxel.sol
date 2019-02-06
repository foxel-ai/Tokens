/*
Implements EIP20 token standard: https://github.com/ethereum/EIPs/blob/master/EIPS/eip-20.md
.*/


pragma solidity ^0.4.21;

import "../eip20/EIP20Interface.sol";
import "../SafeMath.sol";
import "../eip20/Owned.sol";


contract Foxel is EIP20Interface, Owned {
    using SafeMath for uint;
    uint256 constant private MAX_UINT256 = 2 ** 256 - 1;
    mapping(address => uint256) public balances;
    mapping(address => uint256) public allowedToPurchase;
    mapping(address => mapping(address => uint256)) public allowedToTransfer;

    string  public name;                   // Foxel
    string  public symbol;                 // FXL
    uint256 public totalSupply;
    uint256 public reserveAmount;
    uint256 public price;
    uint256 public reserveThreshold;
    address private owner;
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
        trade = _trade;
    }

    // fallback function that allows contract to accept ETH
    function () onlyOwner payable {
        //TODO What do we want to do here? We can error, accept, revert, accept and give the sender foxel?
    }

    modifier canBuy(address buyer, uint amount) {
        require(amount > 0);
        _;
    }

    modifier canSell(address seller, uint amount) {
        require(amount > 0);
        balanceOfSC() >= reserveAmount;
        balanceOf(seller) > amount;
        _;
    }

    modifier canWithdraw(address seller, uint amount) {
        require(amount > 0);
        balanceOfSC() >= reserveAmount;
        _;
    }

    function buy()
        public
        canBuy(msg.sender, msg.value)
        payable
        returns (bool success) {
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
    public
    canSell(msg.sender, amount)
    returns (bool success) {
        balances[msg.sender] -= amount;
        totalSupply -= amount;
        emit Sell(msg.sender, amount);
        uint256 eth_to_send_back = amount.mul(price);
        // Removing entire amount of transaction from reserve to verify the current funds in reserve
        reserveAmount -= eth_to_send_back;
        msg.sender.transfer(eth_to_send_back);
        return true;
    }

    function transfer(address _to, uint256 _value) public returns (bool success) {
        require(balances[msg.sender] >= _value);
        balances[msg.sender] -= _value;
        balances[_to] += _value;
        emit Transfer(msg.sender, _to, _value); //solhint-disable-line indent, no-unused-vars
        return true;
    }

    function transferFrom(address _from, address _to, uint256 _value) public returns (bool success) {
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

    function balanceOf(address _owner) public view returns (uint256 balance) {
        return balances[_owner];
    }

    function approve(address _spender, uint256 _value) public returns (bool success) {
        allowedToTransfer[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value); //solhint-disable-line indent, no-unused-vars
        return true;
    }

    function allowance(address _owner, address _spender) public view returns (uint256 remaining) {
        return allowedToTransfer[_owner][_spender];
    }

    // TODO TW can't remember what this is for...
    function recoverLost(EIP20Interface token, address loser) public onlyOwner {
        token.transfer(loser, token.balanceOf(this));
    }

    // Admin Functions
    function balanceOfReserve() public view returns (uint256 balance) {
        return address(this).balance;
    }

    // Admin Functions
    function balanceOfSC() onlyOwner public view returns (uint256 balance) {
        return address(this).balance;
    }

    function availableForWithdraw() onlyOwner public view returns (uint256 balance) {
        return balanceOfSC() - reserveAmount;
    }

    function setTrade(address _trade) onlyOwner public view returns (uint256 balance) {
        trade = _trade;
    }

    function withdraw() onlyOwner canWithdraw public view returns (uint256 balance) {
        return balanceOfSC() - reserveAmount;
    }



}
