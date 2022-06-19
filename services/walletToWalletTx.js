
var express = require("express");
var router = express.Router();
const Joi = require("joi");
const cardano = require("../config/cardano");
// const wallet = cardano.wallet("BLOKARIA")
// app.use(express.json())

const bodySchema = Joi.object({
    imageIPFS: Joi.string().min(3).max(100).required(),
    assetName: Joi.string().min(3).max(100).required(),
    description: Joi.string().min(3).max(100).required(),
    authors: Joi.array().optional().allow(""),
    copyright: Joi.string().optional().allow(""),
    walletName: Joi.string().min(3).max(100).required(),
    dalayCallToWalletAsset: Joi.number().min(1).max(600000).optional(),
});

router.use((req, res, next) => {
    console.log("Time generateNFT: ", Date.now());
    next();
});

router.post("/", async (req, res) => {
    const { body } = req;
    console.log("GenerateNft Payload ", body);

    try {

        let metaDataObj = generateMetaData(body)

        console.dir(metaDataObj, { depth: null });

        console.log("GENERATE NFT Start \n\n");

        const value = await bodySchema.validateAsync(body);
        let imageIPFS = body.imageIPFS;
        let assetName = body.assetName;
        let description = body.description;
        let authors = body.authors;
        let copyright = body.copyright;
        let walletName = body.walletName;

        //res.json({imageIPFS,authors})

        console.log("GenerateNft Cardano Wallet Name", walletName);


        //funded wallet
        const sender = cardano.wallet(walletName);
        console.log(
            "Balance of Sender wallet: " +
            cardano.toAda(sender.balance().value.lovelace) +
            " ADA"
        );

        //receiver address
        console.log("RECEIVER_ADDR ", process.env.RECEIVER_ADDR);
        const receiver = process.env.RECEIVER_ADDR;

        let amount = 2;

        // create raw transaction
        let txInfo = {
            txIn: cardano.queryUtxo(sender.paymentAddr),
            txOut: [
                {
                    address: sender.paymentAddr,
                    value: {
                        lovelace: sender.balance().value.lovelace - cardano.toLovelace(amount),
                    },
                }, //value going back to sender
                { address: receiver, value: { lovelace: cardano.toLovelace(amount) } }, //value going to receiver
            ],
            metadata: { 1: metaDataObj },
        };
        let raw = cardano.transactionBuildRaw(txInfo);

        console.log("raw ", raw);
        //calculate fee
        let fee = cardano.transactionCalculateMinFee({
            ...txInfo,
            txBody: raw,
            witnessCount: 1,
        });

        //pay the fee by subtracting it from the sender utxo
        txInfo.txOut[0].value.lovelace -= fee;

        //create final transaction
        let tx = cardano.transactionBuildRaw({ ...txInfo, fee });

        //sign the transaction
        let txSigned = cardano.transactionSign({
            txBody: tx,
            signingKeys: [sender.payment.skey],
        });

        //broadcast transaction
        let txHash = cardano.transactionSubmit(txSigned);
        console.log("TxHash: " + txHash);

        res.json({ txHash });
    } catch (err) {
        console.log("\n\n ERROR GENERATE NFT \n\n");
        console.log(err);
        console.log("\n\n\n");
        console.log(err.toString());
        return res.status(400).json({ error: err.toString() });
        //return res.status(400).json(err);
    }
});

const generateMetaData = (qrCodeDbData) => {

    console.log('\n\n generateMetaData qrCodeDbData : ', qrCodeDbData);

    let rndBr = "888000999" + Math.floor(Math.random() * 1000000);

    let internalCode = {
        k: {
            string: "internalCode",
        },
        v: {
            string: qrCodeDbData[0].walletQrId,
        },
    };
    let merchantName = {
        k: {
            string: "CreatorName",
        },
        v: {
            string: qrCodeDbData[0].userFullname,
        },
    };
    let productName = {
        k: {
            string: "ProductName",
        },
        v: {
            string: qrCodeDbData[0].productName,
        },
    };

    let merchantEmail = {
        k: {
            string: "CreatorEmail",
        },
        v: {
            string: qrCodeDbData[0].userEmail,
        },
    };

    let merchantMessage = {
        k: {
            string: "CreatorMessage",
        },
        v: {
            string: qrCodeDbData[0].userDesc,
        },
    };

    let clientName = {
        k: {
            string: "OwnerName",
        },
        v: {
            string: qrCodeDbData[0].clientName,
        },
    };

    let clientEmail = {
        k: {
            string: "OwnerEmail",
        },
        v: {
            string: qrCodeDbData[0].clientEmail,
        },
    };

    let clientMessage = {
        k: {
            string: "OwnerMessage",
        },
        v: {
            string: qrCodeDbData[0].clientMessage,
        },
    };

    let productLink = {
        k: {
            string: "WebSiteParams",
        },
        v: {
            string: `/status/${qrCodeDbData[0].walletQrId}`,
        },
    };

    let webSite = {
        k: {
            string: "WebSiteDomain",
        },
        v: {
            string: process.env.BLOKARIA_WEBSITE,
        },
    };

    let nftimage = {
        k: {
            string: "NftImageHash",
        },
        v: {
            string: qrCodeDbData[0].nftimage,
        },
    };

    // let nftsendaddress = {
    // 	k: {
    // 		string: "NftWalletAddress",
    // 	},
    // 	v: {
    // 		string: qrCodeDbData[0].nftsendaddress,
    // 	},
    // };

    let contributorData = {
        k: {
            string: "Contributor",
        },
        v: {
            string: qrCodeDbData[0].contributorData,
        },
    };

    let finalArray = [];
    finalArray.push(productName);

    finalArray.push(merchantName);
    finalArray.push(merchantEmail);
    finalArray.push(merchantMessage);

    qrCodeDbData[0].ownernamecb ? finalArray.push(clientName) : "";
    qrCodeDbData[0].clientemailcb ? finalArray.push(clientEmail) : "";

    finalArray.push(clientMessage);

    finalArray.push(productLink);
    finalArray.push(webSite);
    finalArray.push(internalCode);
    qrCodeDbData[0].nftimage ? finalArray.push(nftimage) : "";
    // (qrCodeDbData[0].nftsendaddress) ? finalArray.push(nftsendaddress) : "";

    qrCodeDbData[0].contributorData ? finalArray.push(contributorData) : "";

    return finalArray;

    // let metaDataObj = {
    //     [rndBr]: {
    //         map: finalArray,
    //     },
    // };

    // let dataObject = {
    //     passphrase: `${process.env.WALLET_PASSPHRASE_1}`,
    //     payments: [
    //         {
    //             address: Address,
    //             amount: {
    //                 quantity: 1000000,
    //                 unit: "lovelace",
    //             },
    //         },
    //     ],
    //     withdrawal: "self",
    //     metadata: metaDataObj,
    // };


}

module.exports = router;


