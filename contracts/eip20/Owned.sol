pragma solidity ^0.4.0;

contract Owned {
    address private owner;
    address private newOwner;


    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    /// @notice The Constructor assigns the message sender to be `owner`
    function Owned() {
        owner = msg.sender;
    }


    function changeOwner(address _newOwner) onlyOwner {
        newOwner = _newOwner;
    }

    function acceptOwnership() {
        if (msg.sender == newOwner) {
            owner = newOwner;
            newOwner = 0x0000000000000000000000000000000000000000;
        }
    }
}
