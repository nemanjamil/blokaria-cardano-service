const cardano = require('./cardano')

const createWallet = (account) => {
  const payment = cardano.addressKeyGen(account);
  console.log("payment", payment)
  const stake = cardano.stakeAddressKeyGen(account);
  cardano.stakeAddressBuild(account);
  cardano.addressBuild(account, {
    paymentVkey: payment.vkey,
    stakeVkey: stake.vkey,
  });
  return cardano.wallet(account);
};

createWallet("NFT_TEST")
