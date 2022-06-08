const cardano = require("./cardano")
const wallet = cardano.wallet("BLOKARIA")

const mintScript = {
    keyHash: cardano.addressKeyHash(wallet.name),
    type: "sig"
}

// 3. Create POLICY_ID
const POLICY_ID = cardano.transactionPolicyid(mintScript)

// 4. Define ASSET_NAME
const ASSET_NAME = "NemanjaNFT_6"
// Convert Asset ASCII name to HEX
const ASSET_NAME_HEX = ASSET_NAME.split("").map(c => c.charCodeAt(0).toString(16).padStart(2, "0")).join("");

// 5. Create ASSET_ID
const ASSET_ID = POLICY_ID + "." + ASSET_NAME_HEX

const imageIPFS = "ipfs://QmXNyWyaHDenRjcVrfAYZKYmpjcJF4J14dqCGLJUDgLrar"
// 6. Define metadata
const metadata = {
    721: {
        [POLICY_ID]: {
            [ASSET_NAME]: {
                name: ASSET_NAME,
                image: imageIPFS,
                description: "Nemanja NFT Description",
                mediaType: "image/png",
		files: [{
        		 mediaType: "image/png",
	                 name: ASSET_NAME,
           		 src: imageIPFS
                }],
                //type: "image/png",
                //src: "ipfs://QmUxRuzTi3UZS33rfqXzbD4Heut7zwtGUhuD7qSv7Qt584",
                // other properties of your choice
                authors: ["NEMANJA", "MIKI"],
		copyright: "Blokaria.com",
            }
        }
    }
}

// 7. Define transaction
const tx = {
    txIn: wallet.balance().utxo,
    txOut: [
        {
            address: wallet.paymentAddr,
            value: { ...wallet.balance().value, [ASSET_ID]: 1 }
        }
    ],
    mint: [
        { action: "mint", quantity: 1, asset: ASSET_ID, script: mintScript },
      ],
    metadata,
    witnessCount: 2
}


if(Object.keys(tx.txOut[0].value).includes("undefined")|| Object.keys(tx.txIn[0].value.includes("undefinded"))){
  delete tx.txOut[0].value.undefined
  delete tx.txIn[0].value.undefined
}

// 8. Build transaction
const buildTransaction = (tx) => {
    const raw = cardano.transactionBuildRaw(tx)
    const fee = cardano.transactionCalculateMinFee({
        ...tx,
        txBody: raw
    })
    tx.txOut[0].value.lovelace -= fee
    return cardano.transactionBuildRaw({ ...tx, fee })
}
const raw = buildTransaction(tx)

// 9. Sign transaction
const signTransaction = (wallet, tx) => {
    return cardano.transactionSign({
        signingKeys: [wallet.payment.skey, wallet.payment.skey ],
        txBody: tx
    })
}

const signed = signTransaction(wallet, raw)

// 10. Submit transaction
const txHash = cardano.transactionSubmit(signed)
console.log("OPALA",txHash)

