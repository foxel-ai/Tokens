/* eslint-disable */
const messageBuild = require('../build/contracts/EIP20.json');
const contract = require('truffle-contract');
const EIP20 = contract(messageBuild);

module.exports = (callback) => {
  EIP20.setProvider(web3.currentProvider);

  var creator = web3.eth.accounts[0];
  var purchaser = web3.eth.accounts[1];

  web3.eth.defaultAccount = creator;
  // web3.personal.unlockAccount(creator);

  EIP20.defaults({
    from: creator,
    to: purchaser
  });
  var amount_to_transfer = 10;

  var contract = null;
  EIP20.deployed()
    .then(inst => {
      return contract = inst;
    })
    .then(() => {
      console.log('Balance of Main:', creator);
      return contract.balanceOf(creator);
    })
    .then((msg) => {
      console.log('Balance of Main:', creator, ' is:', msg.toString());
    })
    .then(() => {
      console.log('Checking Balance:', purchaser);
      return contract.balanceOf(purchaser);
    })
    .catch((error) => {
      console.error('\n==>error', error);
    })
    .then((msg) => {
      console.log('The balance for:', purchaser, ' is:', msg.toString());
    })
    .then(() => {
      console.log('Sending Tokens to:', purchaser, 'amount', amount_to_transfer);
      return contract.transfer(purchaser, amount_to_transfer);
    })
    .catch((error) => {
      console.error('\n==>error', error);
    })
    .then((msg) => {
      console.log('Transfer was:', msg);
    })
    .then(() => {
      console.log('Checking Balance:', purchaser);
      return contract.balanceOf(purchaser);
    })
    .catch((error) => {
      console.error('\nn==>error', error);
    })
    .then((msg) => {
      console.log('The balance for:', purchaser, ' is:', msg.toString());
    })
    .then(() => {
        return console.log('End');
        return callback();
      }
    );


};
