const { assertRevert } = require('../helpers/assertRevert');

const FOXEL = artifacts.require('foxel');
const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');

const web3 = new Web3(ganache.provider());
const json = require('./../../build/contracts/Foxel.json');
// let lastSnapshot;

const saveState = async () => {
  // const { result } = await web3.currentProvider.send({
  //   jsonrpc: '2.0',
  //   method: 'evm_snapshot',
  //   id: 0,
  // });
  // return parseInt(result, 0);
};
const revertState = async () => {
  // await web3.currentProvider.send({
  //   jsonrpc: '2.0',
  //   method: 'evm_revert',
  //   params: lastSnapshot,
  //   id: 0,
  // });
  // lastSnapshot = await saveState();
};

let FXL;
const price = 1e+16;
contract('Foxel', (accounts) => {
  let id;
  const ethAmount = 1e18;
  const ownerAddress = accounts[0];
  const cbWalletAddress = accounts[9];

  beforeEach('setup contract for each test', async () => {
    FXL = await FOXEL.new('Foxel', 'FXL', price, cbWalletAddress, { from: ownerAddress });
    await FXL.buy.sendTransaction({
      value: ethAmount,
      from: ownerAddress,
    });
  });

  afterEach(async () => {
    // console.log(result);
    await revertState(id);
  });

  it('buying: test aftering be allowed to buy address can buy coins', async () => {
    await FXL.addBuyer.call(accounts[1], { from: ownerAddress });
    const wasAllowed = await FXL.buy.sendTransaction({
      value: ethAmount,
      from: ownerAddress,
    });
    assert(wasAllowed, true, 'Buyer was not allowed to purchase');
  });

  it('reserve: test can sell if sender does have correct amount of funds', async () => {
    const beforeAmount = await FXL.balanceOfSC.call();
    const amount = await FXL.availableForWithdraw.call();
    const sell = await FXL.withdraw.sendTransaction(amount, { from: cbWalletAddress });
    assert(sell != null, 'Issue selling token');
    const afterAmount = await FXL.balanceOfSC.call();
    console.log('Before: ', beforeAmount, ' After: ', afterAmount, ' Amount: ', amount);
    assert((beforeAmount - amount), afterAmount, 'Available amount left is incorrect');
  });
  it('reserve: test can sell if sender does have correct amount of funds', async () => {
    const reserveAmount = await FXL.reserveAmount.call();
    const balance = await FXL.balanceOfSC.call();
    assert(balance >= reserveAmount, 'Balance less than  reserve');

    const amount = (ethAmount / price);
    const sell = await FXL.sell.sendTransaction(amount, { from: ownerAddress });
    assert(sell != null, 'Issue selling token');
  });

  it('creation: test correct settings of contract', async () => {
    const name = await FXL.name.call();
    assert.strictEqual(name, 'Foxel', 'Name was wrong');

    const symbol = await FXL.symbol.call();
    assert.strictEqual(symbol, 'FXL', 'Symbol was wrong');

    const priceFromContract = await FXL.price.call();
    assert.strictEqual(priceFromContract.toNumber(), price, 'Price was wrong');

    const totalSupply = await FXL.totalSupply.call();
    console.log('Total supply: ', totalSupply.toNumber());
    assert.strictEqual(totalSupply.toNumber(), 100, 'Total Supply was wrong');

    const reserveAmountExpected = 1e+17; // 10% of ether
    const reserveAmount = await FXL.reserveAmount.call();
    assert.strictEqual(reserveAmount.toNumber(), reserveAmountExpected, 'Reserve Amount was wrong');

    const reserveThreshold = await FXL.reserveThreshold.call();
    assert.strictEqual(reserveThreshold.toNumber(), 10, 'Reserve Threshold was wrong');
  });

  it('buy: verify that buying and selling is only determined by price', async () => {
    const expectedAmount = ethAmount / price;
    const balanceOfAccountAfterBuy = await FXL.balanceOf.call(ownerAddress);
    assert.strictEqual(balanceOfAccountAfterBuy.toNumber(), expectedAmount, 'Expected Amount was wrong');

    const balanceAfterBuy = await FXL.balanceOfSC.call();
    assert.strictEqual(balanceAfterBuy.toNumber(), ethAmount, 'Contract did not have the right amount of eth in its wallet..');

    const sell = await FXL.sell.sendTransaction(expectedAmount, { from: ownerAddress });
    assert(sell != null, 'Issue selling token');

    const totalSupplyAfterSell = await FXL.totalSupply.call();
    assert.strictEqual(totalSupplyAfterSell.toNumber(), 0, 'Total After Sell Supply was wrong');

    const balanceOf = await FXL.balanceOf.call(ownerAddress);
    assert.strictEqual(balanceOf.toNumber(), 0, 'Expected After Sell Amount was wrong');
    const balanceAfterSell = await FXL.balanceOfSC.call();
    assert.strictEqual(balanceAfterSell.toNumber(), 0, 'Contract still had eth leftover after sell.');
  });

  // TRANSERS
  // normal transfers without approvals
  it('transfers: ether transfer should be reversed.', async () => {
    const balanceBefore = await FXL.balanceOf.call(ownerAddress);
    assert.strictEqual(balanceBefore.toNumber(), 100);

    await assertRevert(new Promise((resolve, reject) => {
      FXL.sendTransaction({
        from: accounts[1],
        to: FXL.address,
        value: 1e18,
      }, (err, res) => {
        if (err) {
          reject(err);
        }
        resolve(res);
      });
    }));

    const balanceAfter = await FXL.balanceOf.call(ownerAddress);
    assert.strictEqual(balanceAfter.toNumber(), 100);
  });

  it('transfers: should transfer when amount transfer is less than balance of sender', async () => {
    const expectedAmount = ethAmount / price;

    await FXL.transfer(accounts[1], expectedAmount, { from: ownerAddress });
    const balance = await FXL.balanceOf.call(accounts[1]);
    assert.strictEqual(balance.toNumber(), expectedAmount);
  });

  it('transfers: should fail when trying to transfer more tokens than in balance', async () => {
    const amount = (ethAmount / price) + 1;

    await assertRevert(FXL.transfer.call(accounts[1], amount, { from: ownerAddress }));
  });

  it('transfers: should handle zero-transfers normally', async () => {
    assert(await FXL.transfer.call(accounts[1], 0, { from: ownerAddress }), 'zero-transfer has failed');
  });

  // NOTE: testing uint256 wrapping is impossible since you can't supply > 2^256 -1
  // todo: transfer max amounts

  // APPROVALS
  it('approvals: msg.sender should approve 100 to accounts[1]', async () => {
    await FXL.approve(accounts[1], 100, { from: accounts[0] });
    const allowance = await FXL.allowance.call(accounts[0], accounts[1]);
    assert.strictEqual(allowance.toNumber(), 100);
  });

  // bit overkill. But is for testing a bug
  it('approvals: msg.sender approves accounts[1] of 100 & withdraws 20 once.', async () => {
    const balance0 = await FXL.balanceOf.call(accounts[0]);
    assert.strictEqual(balance0.toNumber(), 100);

    await FXL.approve(accounts[1], 100, { from: accounts[0] }); // 100
    const balance2 = await FXL.balanceOf.call(accounts[2]);
    assert.strictEqual(balance2.toNumber(), 0, 'balance2 not correct');

    await FXL.transferFrom.call(accounts[0], accounts[2], 20, { from: accounts[1] });
    await FXL.allowance.call(accounts[0], accounts[1]);
    // Not sure why, but they're not use the .call function here
    await FXL.transferFrom(accounts[0], accounts[2], 20, { from: accounts[1] });
    const allowance01 = await FXL.allowance.call(accounts[0], accounts[1]);
    assert.strictEqual(allowance01.toNumber(), 80); // =80

    const balance22 = await FXL.balanceOf.call(accounts[2]);
    assert.strictEqual(balance22.toNumber(), 20);

    const balance02 = await FXL.balanceOf.call(accounts[0]);
    assert.strictEqual(balance02.toNumber(), 80);
  });

  // should approve 100 of msg.sender & withdraw 50, twice. (should succeed)
  it('approvals: msg.sender approves accounts[1] of 100 & withdraws 20 twice.', async () => {
    await FXL.approve(accounts[1], 100, { from: accounts[0] });
    const allowance01 = await FXL.allowance.call(accounts[0], accounts[1]);
    assert.strictEqual(allowance01.toNumber(), 100);

    await FXL.transferFrom(accounts[0], accounts[2], 20, { from: accounts[1] });
    const allowance012 = await FXL.allowance.call(accounts[0], accounts[1]);
    assert.strictEqual(allowance012.toNumber(), 80);

    const balance2 = await FXL.balanceOf.call(accounts[2]);
    assert.strictEqual(balance2.toNumber(), 20);

    const balance0 = await FXL.balanceOf.call(accounts[0]);
    assert.strictEqual(balance0.toNumber(), 80);

    // FIRST tx done.
    // onto next.
    await FXL.transferFrom(accounts[0], accounts[2], 20, { from: accounts[1] });
    const allowance013 = await FXL.allowance.call(accounts[0], accounts[1]);
    assert.strictEqual(allowance013.toNumber(), 60);

    const balance22 = await FXL.balanceOf.call(accounts[2]);
    assert.strictEqual(balance22.toNumber(), 40);

    const balance02 = await FXL.balanceOf.call(accounts[0]);
    assert.strictEqual(balance02.toNumber(), 60);
  });

  // should approve 100 of msg.sender & withdraw 50 & 60 (should fail).
  it('approvals: msg.sender approves accounts[1] of 100 & withdraws 50 & 60 (2nd tx should fail)', async () => {
    await FXL.approve(accounts[1], 100, { from: accounts[0] });
    const allowance01 = await FXL.allowance.call(accounts[0], accounts[1]);
    assert.strictEqual(allowance01.toNumber(), 100);

    await FXL.transferFrom(accounts[0], accounts[2], 50, { from: accounts[1] });
    const allowance012 = await FXL.allowance.call(accounts[0], accounts[1]);
    assert.strictEqual(allowance012.toNumber(), 50);

    const balance2 = await FXL.balanceOf.call(accounts[2]);
    assert.strictEqual(balance2.toNumber(), 50);

    const balance0 = await FXL.balanceOf.call(accounts[0]);
    assert.strictEqual(balance0.toNumber(), 50);

    // FIRST tx done.
    // onto next.
    await assertRevert(FXL.transferFrom.call(accounts[0], accounts[2], 60, { from: accounts[1] }));
  });

  it('approvals: attempt withdrawal from account with no allowance (should fail)', async () => {
    await assertRevert(FXL.transferFrom.call(accounts[0], accounts[2], 60, { from: accounts[1] }));
  });

  it('approvals: allow accounts[1] 100 to withdraw from accounts[0]. Withdraw 60 and then approve 0 & attempt transfer.', async () => {
    await FXL.approve(accounts[1], 100, { from: accounts[0] });
    await FXL.transferFrom(accounts[0], accounts[2], 60, { from: accounts[1] });
    await FXL.approve(accounts[1], 0, { from: accounts[0] });
    await assertRevert(FXL.transferFrom.call(accounts[0], accounts[2], 10, { from: accounts[1] }));
  });

  it('approvals: approve max (2^256 - 1)', async () => {
    await FXL.approve(accounts[1], '115792089237316195423570985008687907853269984665640564039457584007913129639935', { from: accounts[0] });
    const allowance = await FXL.allowance(accounts[0], accounts[1]);
    assert(allowance.equals('1.15792089237316195423570985008687907853269984665640564039457584007913129639935e+77'));
  });

  // should approve max of msg.sender & withdraw 20 without changing allowance (should succeed).
  it('approvals: msg.sender approves accounts[1] of max (2^256 - 1) & withdraws 20', async () => {
    const balance0 = await FXL.balanceOf.call(accounts[0]);
    assert.strictEqual(balance0.toNumber(), 100);

    const max = '1.15792089237316195423570985008687907853269984665640564039457584007913129639935e+77';
    await FXL.approve(accounts[1], max, { from: accounts[0] });
    const balance2 = await FXL.balanceOf.call(accounts[2]);
    assert.strictEqual(balance2.toNumber(), 0, 'balance2 not correct');

    await FXL.transferFrom(accounts[0], accounts[2], 20, { from: accounts[1] });
    const allowance01 = await FXL.allowance.call(accounts[0], accounts[1]);
    assert(allowance01.equals(max));

    const balance22 = await FXL.balanceOf.call(accounts[2]);
    assert.strictEqual(balance22.toNumber(), 20);

    const balance02 = await FXL.balanceOf.call(accounts[0]);
    assert.strictEqual(balance02.toNumber(), 80);
  });

  /* eslint-disable no-underscore-dangle */
  it('events: should fire Transfer event properly', async () => {
    const res = await FXL.transfer(accounts[1], '10', { from: accounts[0] });
    const transferLog = res.logs.find(element => element.event.match('Transfer'));
    assert.strictEqual(transferLog.args._from, accounts[0]);
    assert.strictEqual(transferLog.args._to, accounts[1]);
    assert.strictEqual(transferLog.args._value.toString(), '10');
  });

  it('events: should fire Transfer event normally on a zero transfer', async () => {
    const res = await FXL.transfer(accounts[1], '0', { from: accounts[0] });
    const transferLog = res.logs.find(element => element.event.match('Transfer'));
    assert.strictEqual(transferLog.args._from, accounts[0]);
    assert.strictEqual(transferLog.args._to, accounts[1]);
    assert.strictEqual(transferLog.args._value.toString(), '0');
  });

  it('events: should fire Approval event properly', async () => {
    const res = await FXL.approve(accounts[1], '10', { from: accounts[0] });
    const approvalLog = res.logs.find(element => element.event.match('Approval'));
    assert.strictEqual(approvalLog.args._owner, accounts[0]);
    assert.strictEqual(approvalLog.args._spender, accounts[1]);
    assert.strictEqual(approvalLog.args._value.toString(), '10');
  });
});
