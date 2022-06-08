const express = require('express')
const app = express()
const port = 3333
const Joi = require('joi')
const validator = require('express-joi-validation').createValidator({})
//const bodyParser = require('body-parser');


app.use(express.json())
//app.use(bodyParser.urlencoded({ extended: true }));  
// https://github.com/evanshortiss/express-joi-validation/blob/master/example/javascript/router.js

const bodySchema = Joi.object({
    imageIPFS: Joi.string().min(5).max(100).required(),
    assetName: Joi.string().min(5).max(100).required(),
    description: Joi.string().min(5).max(100).required(),
    authors: Joi.array(),
    copyright: Joi.string()
})

app.post('/', express.json(), validator.body(bodySchema), (req, res) => {

    let imageIPFS = req.body.imageIPFS
    let assetName = req.body.assetName
    let description = req.body.description
    let authors = req.body.authors
    let copyright = req.body.copyright

    console.log("ttttt")
    res.send(assetName)

    return;
    const mintScript = {
        keyHash: cardano.addressKeyHash(wallet.name),
        type: "sig"
    }

    // 3. Create POLICY_ID
    const POLICY_ID = cardano.transactionPolicyid(mintScript)

    // 4. Define ASSET_NAME
    const ASSET_NAME = assetName
    // Convert Asset ASCII name to HEX
    const ASSET_NAME_HEX = ASSET_NAME.split("").map(c => c.charCodeAt(0).toString(16).padStart(2, "0")).join("");

    // 5. Create ASSET_ID
    const ASSET_ID = POLICY_ID + "." + ASSET_NAME_HEX
    const imageIPFSFull = "ipfs://" + imageIPFS

    // 6. Define metadata
    const metadata = {
        721: {
            [POLICY_ID]: {
                [ASSET_NAME]: {
                    name: ASSET_NAME,
                    image: imageIPFSFull,
                    description: description,
                    mediaType: "image/png",
                    files: [{
                        mediaType: "image/png",
                        name: ASSET_NAME,
                        src: imageIPFS
                    }],
                    //type: "image/png",
                    //src: "ipfs://QmUxRuzTi3UZS33rfqXzbD4Heut7zwtGUhuD7qSv7Qt584",
                    // other properties of your choice
                    authors: authors,
                    copyright: copyright,
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


    if (Object.keys(tx.txOut[0].value).includes("undefined") || Object.keys(tx.txIn[0].value.includes("undefinded"))) {
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
            signingKeys: [wallet.payment.skey, wallet.payment.skey],
            txBody: tx
        })
    }

    const signed = signTransaction(wallet, raw)

    // 10. Submit transaction
    const txHash = cardano.transactionSubmit(signed)

    res.send(txHash)
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

