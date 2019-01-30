const { assertRevert } = require('../helpers/assertRevert');
const FOXEL = artifacts.require('foxel');
let FXL;
const price = 1e+16;
contract('Foxel', (accounts) => {
  beforeEach(async () => {
    FXL = await FOXEL.new('Foxel', 'FXL', price, { from: accounts[0] });
  });

  it('creation: test correct settings of contract', async () => {
    const name = await FXL.name.call();
    assert.strictEqual(name, 'Foxel', 'Name was wrong');

    const symbol = await FXL.symbol.call();
    assert.strictEqual(symbol, 'FXL', 'Symbol was wrong');

    const priceFromContract = await FXL.price.call();
    assert.strictEqual(priceFromContract.toNumber(), price, 'Price was wrong');

    const totalSupply = await FXL.totalSupply.call();
    assert.strictEqual(totalSupply.toNumber(), 0, 'Total Supply was wrong');

    const reserveAmount = await FXL.reserveAmount.call();
    assert.strictEqual(reserveAmount.toNumber(), 0, 'Reserve Amount was wrong');

    const reserveThreshold = await FXL.reserveThreshold.call();
    assert.strictEqual(reserveThreshold.toNumber(), 10, 'Reserve Threshold was wrong');
  });

  it('buy: verify that exact amount of foxel is created for the provided eth', async () => {
    const address = accounts[0];
    const eth = 1e+18;
    // console.log('HELLOOOO: ', await FXL.balanceOfSC.call())
    const buy = await FXL.buy.sendTransaction({ value: eth, from: address });
    assert(buy != null, 'Issue buying token');
    // console.log('Buy: ', buy)

    const expectedAmount = eth / price;
    const totalSupply = await FXL.totalSupply.call();
    assert.strictEqual(totalSupply.toNumber(), expectedAmount, 'Total Supply was wrong');

    const balanceOf = await FXL.balanceOf.call(address);
    assert.strictEqual(balanceOf.toNumber(), expectedAmount, 'Expected Amount was wrong');

  });
//   //
//   // // TRANSERS
//   // // normal transfers without approvals
//   // it('transfers: ether transfer should be reversed.', async () => {
//   //   const balanceBefore = await FXL.balanceOf.call(accounts[0]);
//   //   assert.strictEqual(balanceBefore.toNumber(), 10000);
//   //
//   //   await assertRevert(new Promise((resolve, reject) => {
//   //     web3.eth.sendTransaction({ from: accounts[0], to: FXL.address, value: web3.toWei('10', 'Ether') }, (err, res) => {
//   //       if (err) { reject(err); }
//   //       resolve(res);
//   //     });
//   //   }));
//   //
//   //   const balanceAfter = await FXL.balanceOf.call(accounts[0]);
//   //   assert.strictEqual(balanceAfter.toNumber(), 10000);
//   // });
//   //
//   // it('transfers: should transfer 10000 to accounts[1] with accounts[0] having 10000', async () => {
//   //   await FXL.transfer(accounts[1], 10000, { from: accounts[0] });
//   //   const balance = await FXL.balanceOf.call(accounts[1]);
//   //   assert.strictEqual(balance.toNumber(), 10000);
//   // });
//   //
//   // it('transfers: should fail when trying to transfer 10001 to accounts[1] with accounts[0] having 10000', async () => {
//   //   await assertRevert(FXL.transfer.call(accounts[1], 10001, { from: accounts[0] }));
//   // });
//   //
//   // it('transfers: should handle zero-transfers normally', async () => {
//   //   assert(await FXL.transfer.call(accounts[1], 0, { from: accounts[0] }), 'zero-transfer has failed');
//   // });
//   //
//   // // NOTE: testing uint256 wrapping is impossible since you can't supply > 2^256 -1
//   // // todo: transfer max amounts
//   //
//   // // APPROVALS
//   // it('approvals: msg.sender should approve 100 to accounts[1]', async () => {
//   //   await FXL.approve(accounts[1], 100, { from: accounts[0] });
//   //   const allowance = await FXL.allowance.call(accounts[0], accounts[1]);
//   //   assert.strictEqual(allowance.toNumber(), 100);
//   // });
//   //
//   // // bit overkill. But is for testing a bug
//   // it('approvals: msg.sender approves accounts[1] of 100 & withdraws 20 once.', async () => {
//   //   const balance0 = await FXL.balanceOf.call(accounts[0]);
//   //   assert.strictEqual(balance0.toNumber(), 10000);
//   //
//   //   await FXL.approve(accounts[1], 100, { from: accounts[0] }); // 100
//   //   const balance2 = await FXL.balanceOf.call(accounts[2]);
//   //   assert.strictEqual(balance2.toNumber(), 0, 'balance2 not correct');
//   //
//   //   await FXL.transferFrom.call(accounts[0], accounts[2], 20, { from: accounts[1] });
//   //   await FXL.allowance.call(accounts[0], accounts[1]);
//   //   await FXL.transferFrom(accounts[0], accounts[2], 20, { from: accounts[1] }); // -20
//   //   const allowance01 = await FXL.allowance.call(accounts[0], accounts[1]);
//   //   assert.strictEqual(allowance01.toNumber(), 80); // =80
//   //
//   //   const balance22 = await FXL.balanceOf.call(accounts[2]);
//   //   assert.strictEqual(balance22.toNumber(), 20);
//   //
//   //   const balance02 = await FXL.balanceOf.call(accounts[0]);
//   //   assert.strictEqual(balance02.toNumber(), 9980);
//   // });
//   //
//   // // should approve 100 of msg.sender & withdraw 50, twice. (should succeed)
//   // it('approvals: msg.sender approves accounts[1] of 100 & withdraws 20 twice.', async () => {
//   //   await FXL.approve(accounts[1], 100, { from: accounts[0] });
//   //   const allowance01 = await FXL.allowance.call(accounts[0], accounts[1]);
//   //   assert.strictEqual(allowance01.toNumber(), 100);
//   //
//   //   await FXL.transferFrom(accounts[0], accounts[2], 20, { from: accounts[1] });
//   //   const allowance012 = await FXL.allowance.call(accounts[0], accounts[1]);
//   //   assert.strictEqual(allowance012.toNumber(), 80);
//   //
//   //   const balance2 = await FXL.balanceOf.call(accounts[2]);
//   //   assert.strictEqual(balance2.toNumber(), 20);
//   //
//   //   const balance0 = await FXL.balanceOf.call(accounts[0]);
//   //   assert.strictEqual(balance0.toNumber(), 9980);
//   //
//   //   // FIRST tx done.
//   //   // onto next.
//   //   await FXL.transferFrom(accounts[0], accounts[2], 20, { from: accounts[1] });
//   //   const allowance013 = await FXL.allowance.call(accounts[0], accounts[1]);
//   //   assert.strictEqual(allowance013.toNumber(), 60);
//   //
//   //   const balance22 = await FXL.balanceOf.call(accounts[2]);
//   //   assert.strictEqual(balance22.toNumber(), 40);
//   //
//   //   const balance02 = await FXL.balanceOf.call(accounts[0]);
//   //   assert.strictEqual(balance02.toNumber(), 9960);
//   // });
//   //
//   // // should approve 100 of msg.sender & withdraw 50 & 60 (should fail).
//   // it('approvals: msg.sender approves accounts[1] of 100 & withdraws 50 & 60 (2nd tx should fail)', async () => {
//   //   await FXL.approve(accounts[1], 100, { from: accounts[0] });
//   //   const allowance01 = await FXL.allowance.call(accounts[0], accounts[1]);
//   //   assert.strictEqual(allowance01.toNumber(), 100);
//   //
//   //   await FXL.transferFrom(accounts[0], accounts[2], 50, { from: accounts[1] });
//   //   const allowance012 = await FXL.allowance.call(accounts[0], accounts[1]);
//   //   assert.strictEqual(allowance012.toNumber(), 50);
//   //
//   //   const balance2 = await FXL.balanceOf.call(accounts[2]);
//   //   assert.strictEqual(balance2.toNumber(), 50);
//   //
//   //   const balance0 = await FXL.balanceOf.call(accounts[0]);
//   //   assert.strictEqual(balance0.toNumber(), 9950);
//   //
//   //   // FIRST tx done.
//   //   // onto next.
//   //   await assertRevert(FXL.transferFrom.call(accounts[0], accounts[2], 60, { from: accounts[1] }));
//   // });
//   //
//   // it('approvals: attempt withdrawal from account with no allowance (should fail)', async () => {
//   //   await assertRevert(FXL.transferFrom.call(accounts[0], accounts[2], 60, { from: accounts[1] }));
//   // });
//   //
//   // it('approvals: allow accounts[1] 100 to withdraw from accounts[0]. Withdraw 60 and then approve 0 & attempt transfer.', async () => {
//   //   await FXL.approve(accounts[1], 100, { from: accounts[0] });
//   //   await FXL.transferFrom(accounts[0], accounts[2], 60, { from: accounts[1] });
//   //   await FXL.approve(accounts[1], 0, { from: accounts[0] });
//   //   await assertRevert(FXL.transferFrom.call(accounts[0], accounts[2], 10, { from: accounts[1] }));
//   // });
//   //
//   // it('approvals: approve max (2^256 - 1)', async () => {
//   //   await FXL.approve(accounts[1], '115792089237316195423570985008687907853269984665640564039457584007913129639935', { from: accounts[0] });
//   //   const allowance = await FXL.allowance(accounts[0], accounts[1]);
//   //   assert(allowance.equals('1.15792089237316195423570985008687907853269984665640564039457584007913129639935e+77'));
//   // });
//   //
//   // // should approve max of msg.sender & withdraw 20 without changing allowance (should succeed).
//   // it('approvals: msg.sender approves accounts[1] of max (2^256 - 1) & withdraws 20', async () => {
//   //   const balance0 = await FXL.balanceOf.call(accounts[0]);
//   //   assert.strictEqual(balance0.toNumber(), 10000);
//   //
//   //   const max = '1.15792089237316195423570985008687907853269984665640564039457584007913129639935e+77';
//   //   await FXL.approve(accounts[1], max, { from: accounts[0] });
//   //   const balance2 = await FXL.balanceOf.call(accounts[2]);
//   //   assert.strictEqual(balance2.toNumber(), 0, 'balance2 not correct');
//   //
//   //   await FXL.transferFrom(accounts[0], accounts[2], 20, { from: accounts[1] });
//   //   const allowance01 = await FXL.allowance.call(accounts[0], accounts[1]);
//   //   assert(allowance01.equals(max));
//   //
//   //   const balance22 = await FXL.balanceOf.call(accounts[2]);
//   //   assert.strictEqual(balance22.toNumber(), 20);
//   //
//   //   const balance02 = await FXL.balanceOf.call(accounts[0]);
//   //   assert.strictEqual(balance02.toNumber(), 9980);
//   // });
//   //
//   // /* eslint-disable no-underscore-dangle */
//   // it('events: should fire Transfer event properly', async () => {
//   //   const res = await FXL.transfer(accounts[1], '2666', { from: accounts[0] });
//   //   const transferLog = res.logs.find(element => element.event.match('Transfer'));
//   //   assert.strictEqual(transferLog.args._from, accounts[0]);
//   //   assert.strictEqual(transferLog.args._to, accounts[1]);
//   //   assert.strictEqual(transferLog.args._value.toString(), '2666');
//   // });
//   //
//   // it('events: should fire Transfer event normally on a zero transfer', async () => {
//   //   const res = await FXL.transfer(accounts[1], '0', { from: accounts[0] });
//   //   const transferLog = res.logs.find(element => element.event.match('Transfer'));
//   //   assert.strictEqual(transferLog.args._from, accounts[0]);
//   //   assert.strictEqual(transferLog.args._to, accounts[1]);
//   //   assert.strictEqual(transferLog.args._value.toString(), '0');
//   // });
//   //
//   // it('events: should fire Approval event properly', async () => {
//   //   const res = await FXL.approve(accounts[1], '2666', { from: accounts[0] });
//   //   const approvalLog = res.logs.find(element => element.event.match('Approval'));
//   //   assert.strictEqual(approvalLog.args._owner, accounts[0]);
//   //   assert.strictEqual(approvalLog.args._spender, accounts[1]);
//   //   assert.strictEqual(approvalLog.args._value.toString(), '2666');
//   // });
});
