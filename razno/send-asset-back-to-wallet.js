const cardano = require("./cardano")

// 1. get the wallet

const sender = cardano.wallet("BLOKARIA")

// 2. define the transaction

console.log(
    "Balance of Sender wallet: " +
    cardano.toAda(sender.balance().value.lovelace) + " ADA"
)

const receiver = "addr_test1qqpwywyhja7pts2404j8arxr5uhvmku7d8k53hrfypqsss05nrlujs9z7afw0cguvjuzzxq6dtmhjhcz8auach6p7s7qr957hv"
//const receiver = ""

let amountValue = 2

const txInfo = {
    txIn: cardano.queryUtxo(sender.paymentAddr),
    txOut: [
        {
            address: sender.paymentAddr,
            value: {
                lovelace: sender.balance().value.lovelace - cardano.toLovelace(amountValue)
            }
        },
        {
            address: receiver,
            value: {
                lovelace: cardano.toLovelace(amountValue),
                "53d92437974def198c38e9d9481fafdc70366ff91dadc1bddf7e7ecf.4e656d616e6a614e46545f38": 1
            }
        }
    ]
}
console.log(JSON.stringify(txInfo, null, 4));
//console.log("txInfo", txInfo)

// 3. build the transaction

const raw = cardano.transactionBuildRaw(txInfo)

console.log("raw", raw)

// 4. calculate the fee

const fee = cardano.transactionCalculateMinFee({
    ...txInfo,
    txBody: raw,
    witnessCount: 1
})

console.log("fee", fee)

// 5. pay the fee by subtracting it from the sender utxo

txInfo.txOut[0].value.lovelace -= fee

console.log(JSON.stringify(txInfo, null, 4));
// 6. build the final transaction

const tx = cardano.transactionBuildRaw({ ...txInfo, fee })

console.log("tx", tx)
// 7. sign the transaction

const txSigned = cardano.transactionSign({
    txBody: tx,
    signingKeys: [sender.payment.skey]
})

console.log("txSigned", txSigned)
// 8. submit the transaction

const txHash = cardano.transactionSubmit(txSigned)

console.log(txHash)
