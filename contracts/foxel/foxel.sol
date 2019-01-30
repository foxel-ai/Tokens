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
    mapping(address => mapping(address => uint256)) public allowed;

    string  public name;                   // Foxel
    string  public symbol;                 // FXL
    uint256 public totalSupply;
    uint256 public reserveAmount;
    uint256 public price;
    uint256 public reserveThreshold;

    event Buy(address _to, uint amount);

    constructor(
        string _tokenName,
        string _tokenSymbol,
        uint256 _price
    ) public {
        name = _tokenName;
        symbol = _tokenSymbol;
        price = _price;
        totalSupply = 0;
        reserveAmount = 0;
        reserveThreshold = 10;     //This is supposed to be a percentage of totalSupply
    }

    // fallback function that allows contract to accept ETH
    function () payable {}

    modifier canBuy(address to, uint amount) {
        require(amount > 0);
        _;
    }

    function buy()
        public
        canBuy(msg.sender, msg.value)
        payable
        returns (bool success) {
            uint amount = msg.value.div(price);
            balances[msg.sender] += amount;
            totalSupply += amount;
            emit Buy(msg.sender, amount);
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
        uint256 allowance = allowed[_from][msg.sender];
        require(balances[_from] >= _value && allowance >= _value);
        balances[_to] += _value;
        balances[_from] -= _value;
        if (allowance < MAX_UINT256) {
            allowed[_from][msg.sender] -= _value;
        }
        emit Transfer(_from, _to, _value); //solhint-disable-line indent, no-unused-vars
        return true;
    }

    function balanceOf(address _owner) public view returns (uint256 balance) {
        return balances[_owner];
    }

    function balanceOfSC() public view returns (uint256 balance) {
        return this.balance;
    }

    function approve(address _spender, uint256 _value) public returns (bool success) {
        allowed[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value); //solhint-disable-line indent, no-unused-vars
        return true;
    }

    function allowance(address _owner, address _spender) public view returns (uint256 remaining) {
        return allowed[_owner][_spender];
    }
}
