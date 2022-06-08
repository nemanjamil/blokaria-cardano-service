const cardano = require("../config/cardano")
// const wallet = cardano.wallet("BlokariaTestWalletPetImported")
const walletscript = cardano.wallet("NFT_TEST")


//console.log("wallet by cntools", console.log(JSON.stringify(wallet.balance(), null, 4)))
console.log("wallet by script balance",  console.log(JSON.stringify(walletscript.balance(), null, 4)))


//console.log("wallet by cntools", wallet)
console.log("wallet by script", console.log(JSON.stringify(walletscript, null, 4)))


