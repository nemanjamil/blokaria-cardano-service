
var express = require("express");
var router = express.Router();
const Joi = require("joi");
const cardano = require("../config/cardano");
// const wallet = cardano.wallet("BLOKARIA")
// app.use(express.json())

const bodySchema = Joi.object({
    userDesc: Joi.string().max(60).optional().allow(""),
    userFullname: Joi.string().max(60).optional().allow(""),
    userEmail: Joi.string().email().max(60).optional().allow(""),

    productName: Joi.string().max(60).required(),

    clientEmail: Joi.string().email().max(60).optional().allow(""),
    clientMessage: Joi.string().max(60).optional().allow(""),
    clientName: Joi.string().max(60).optional().allow(""),

    walletQrId: Joi.string().max(60).required(),
    //nftimage: Joi.string().max(60).optional().allow(""),

    contributorData: Joi.string().max(60).optional().allow(""),
    clientemailcb: Joi.boolean(),
    ownernamecb: Joi.boolean(),

    walletName: Joi.string().max(60).required(),
    amountValue: Joi.number().max(10).required(),
});

router.use((req, res, next) => {
    console.log("Time generateNFT: ", Date.now());
    next();
});

router.post("/", async (req, res) => {
    const { body } = req;
    console.log("GenerateNftTransaction Payload ", body);


    try {

        console.log("GENERATE NFT Start \n\n");

        await bodySchema.validateAsync(body[0]);

        console.log("\n\nvalidateAsyncJoi DONE");

        let objectToTest = {
            userDesc: body[0].userDesc,
            userFullname: body[0].userFullname,
            userEmail: body[0].userEmail,

            productName: body[0].productName,

            clientEmail: body[0].clientEmail,
            clientMessage: body[0].clientMessage,
            clientName: body[0].clientName,

            walletQrId: body[0].walletQrId,
            //nftimage: body[0].nftimage,

            contributorData: body[0].contributorData,
            clientemailcb: body[0].clientemailcb,
            ownernamecb: body[0].clientemailcb,

            walletName: body[0].walletName,
            amountValue: body[0].amountValue,

        }

        const { walletName, amountValue } = body[0]

        console.log("\n\nwalletName", walletName);
        console.log("amountValue", amountValue);

        console.log("\n\nobjectToTest", objectToTest);

        let metaDataObj = generateMetaData(body)

        console.log("\n\nmetaDataObj");
        console.dir(metaDataObj, { depth: null });

        let rndBr = "888000999" + Math.floor(Math.random() * 1000000);
        console.log("rndBr: ", rndBr);

        console.log("GenerateNft Cardano Wallet Name", walletName);
        const sender = cardano.wallet(walletName);

        console.log(
            "Balance of Sender wallet: " +
            cardano.toAda(sender.balance().value.lovelace) +
            " ADA"
        );

        //receiver address
        console.log("RECEIVER_ADDR ", process.env.RECEIVER_ADDR);
        const receiver = process.env.RECEIVER_ADDR;
        // create raw transaction
        let txInfo = {
            txIn: cardano.queryUtxo(sender.paymentAddr),
            txOut: [
                {
                    address: sender.paymentAddr,
                    value: {
                        lovelace: sender.balance().value.lovelace - cardano.toLovelace(amountValue),
                    },
                }, //value going back to sender
                { address: receiver, value: { lovelace: cardano.toLovelace(amountValue) } }, //value going to receiver
            ],
            metadata: { rndBr: metaDataObj },
        };

        console.log("\n\ntxInfo ", txInfo);

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
        console.log('txInfo.txOut[0].value.lovelace', txInfo.txOut[0].value.lovelace);


        //create final transaction
        let tx = cardano.transactionBuildRaw({ ...txInfo, fee });

        console.log('cardano.transactionBuildRaw DONE');

        //sign the transaction
        let txSigned = cardano.transactionSign({
            txBody: tx,
            signingKeys: [sender.payment.skey],
        });

        console.log('cardano.transactionSign DONE');

        //broadcast transaction
        let txHash = cardano.transactionSubmit(txSigned);
        console.log("cardano.transactionSubmit DONE: " + txHash);

        res.json({ txHash });
    } catch (err) {
        console.error("\n\n ERROR GENERATE NFT \n\n");
        console.error(err);
        console.error("\n\n\n");
        console.error(err.toString());
        return res.status(400).json({ error: err.toString() });
        //return res.status(400).json(err);
    }
});

const generateMetaData = (qrCodeDbData) => {

    console.log('\n\n generateMetaData qrCodeDbData : ', qrCodeDbData);

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

    qrCodeDbData[0].contributorData ? finalArray.push(contributorData) : "";

    console.log('\n\n\ finalArray');
    console.dir(finalArray, { depth: null });

    return finalArray;
}

module.exports = router;


