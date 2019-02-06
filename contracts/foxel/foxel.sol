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

    /*
        This modifier is to secure our admin methods so that only owner can use them. Which
        keeps other users from acting maliciously.
    */
    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    /*
        This modifier checks to see if the buyer has registered with us and the amount they want to purchase
        is greater than zero.
    */
    modifier canBuy() {
        require(msg.value > 0);
        require(allowedToPurchase[msg.sender] == true);
        _;
    }

    /*
        This modifier is used to verify that we've got enough wei currently stored in the contract to
        fulfill the sell amount. Also, it makes sure the user has the amount of currency in the ledger
        as they're requesting to sell. This also verifies the amount, in wei, that is being requested to
        be sold is available to be transferred. Since we are trading on exchanges we will not always have
        all the eth in this contract.

        TODO TW: I think we could spend some more time here talking about edge cases
        1) Send event if we don't have enough funds to cover a sell?
    */
    modifier canSell(uint256 amount) {
        require(amount > 0);
        require(address(this).balance >= reserveAmount);
        require(balanceOf(msg.sender) >= amount);
        uint256 eth_to_send_back = amount.mul(price);
        require(address(this).balance >= eth_to_send_back);
        _;
    }

    /*
        This modifier is for our application to make sure that it is not withdrawing more funds than the
        reserve allows. It also makes sure that the person withdrawing is the trading wallet address.
    */
    modifier canWithdraw(address seller, uint256 amount) {
        require(amount > 0);
        require(msg.sender == trade);
        require(address(this).balance >= reserveAmount);
        _;
    }

    /*
        This method takes in eth, via the 'payable' flag, and calculates the amount of fxl its worth.
        The fxl amount is then added to the users' address in our ledger. We also take a percentage of
        the funds sent in and automatically add them to the reserve so they cannot be withdrawn.
    */
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

    /*
        This method allows for owners of fxl to sell them back for wei at the current price of fxl.
        We then update the reserve based on the amount of wei we're returning. If the sell amount in wei
        is larger than what we're requiring for reserves then we set the reserves to 0. Otherwise we
        subtract the entire amount of wei from reserves.

        Users are not required to have registered with us in order to sell any fxl that they may have
        acquired in our ledger.

        TODO TW: We should verify the reserve amount math logic I'm doing here to make sure it makes sense.
    */
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

    /*
        This function is apart of the ERC20 interface. This allows the sender to transfer a given
        amount of fxl to another address.
    */
    function transfer(address _to, uint256 _value)
    public returns (bool success) {
        require(balances[msg.sender] >= _value);
        balances[msg.sender] -= _value;
        balances[_to] += _value;
        emit Transfer(msg.sender, _to, _value); //solhint-disable-line indent, no-unused-vars
        return true;
    }

    /*
        This function is apart of the ERC20 interface. This allows any authorized address to
        transfer funds from an authorized address to any address. Any transfer from an address
        that has not authorized the message sender will fail.
    */
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

    /*
        This function is apart of the ERC20 interface. Any user can call this method to find
        the value of the given address. If the address is not in our ledger 0 will be returned.
    */
    function balanceOf(address _owner)
    public view returns (uint256 balance) {
        return balances[_owner];
    }

    /*
         This function is apart of the ERC20 interface. This allows the user to set a fxl amount that
         another address can transfer fxl on their behalf. If you would like to stop an approved address
         from making  transfers just call this method again with the address in question and the value of 0
    */
    function approve(address _spender, uint256 _value)
    public returns (bool success) {
        allowedToTransfer[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value); //solhint-disable-line indent, no-unused-vars
        return true;
    }
    /*
        This function is apart of the ERC20 interface and returns the allowance between two address.
    */
    function allowance(address _owner, address _spender)
    public view returns (uint256 remaining) {
        return allowedToTransfer[_owner][_spender];
    }
    /*
        This method will return the amount of wei we have left in reserves.
    */
    function balanceOfReserve()
    public view returns (uint256 balance) {
        return reserveAmount;
    }

    // Admin Functions
    /*
        We use this method to control the address that are allowed to buy fxl. This keeps random
        address from purchasing.
    */
    function addBuyer(address buyer)
    onlyOwner
    public returns (bool wasAdded){
        allowedToPurchase[buyer] = true;
    }

    /*
        Inverse of addBuyer, we will use this if a user breaks any of our terms or conditions.
    */
    function removeBuyer(address buyer)
    onlyOwner
    public returns (bool wasAdded){
        allowedToPurchase[buyer] = false;
    }

    /*
        This returns the current amount of wei stored on the contract. We use this to determine
        withdraw limits.
    */
    function balanceOfSC()
    onlyOwner
    public view returns (uint256 balance) {
        return address(this).balance;
    }

    /*
        This returns the amount of wei that is not being held on to by the reserve. We use this
        value if we want to withdraw the maximum amount of funds.
    */
    function availableForWithdraw()
    onlyOwner
    public view returns (uint256 balance) {
        return balanceOfSC() - reserveAmount;
    }

    /*
        This method allows us to change the address that is allowed to withdraw wei from the contract.

        TODO TW: I hate this name with a passion. trade..ugh  bad
    */
    function setTrade(address _trade)
    onlyOwner
    public {
        trade = _trade;
    }

    /*
        This method is what we use to transfer wei from the contract to our address in exchanges.
        Only the address on the exchange will be able to make this call and we also must be above our
        reserves.
    */
    function withdraw(uint256 amount)
    canWithdraw (msg.sender, amount)
    public {
        trade.transfer(amount);
    }

    /*
        If we ever need to transfer this contract to a new address we've added the ability to set the
        new owner.
    */
    function changeOwner(address _newOwner)
    onlyOwner
    public {
        newOwner = _newOwner;
    }

    /*
        This is a safety function that force the 'new' owner to actually have control of their address.
        And if they make this call without

        TODO TW; We can make take all the gas by doing an assert instead of an if.
    */
    function acceptOwnership()
    public {
        if (msg.sender == newOwner) {
            owner = newOwner;
            newOwner = 0x0000000000000000000000000000000000000000;
        }
    }

    /*
        If an address sends us wei without a specific function this function will fail and revert
        the transaction. This will charge gas for the transaction but will return any unused gas and
        the wei sent.
    */
    function () onlyOwner public payable {
        //TODO What do we want to do here? We can error, accept, revert, accept and give the sender foxel?
    }

}
