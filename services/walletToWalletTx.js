
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

        await bodySchema.validateAsync(body);

        console.log("\n\nvalidateAsyncJoi DONE");

        let objectToTest = {
            userDesc: body.userDesc,
            userFullname: body.userFullname,
            userEmail: body.userEmail,

            productName: body.productName,

            clientEmail: body.clientEmail,
            clientMessage: body.clientMessage,
            clientName: body.clientName,

            walletQrId: body.walletQrId,

            contributorData: body.contributorData,
            clientemailcb: body.clientemailcb,
            ownernamecb: body.clientemailcb,

            walletName: body.walletName,
            amountValue: body.amountValue,

        }
        console.log("\n\nobjectToTest", objectToTest);

        // WALLET
        const { walletName, amountValue } = body
        console.log("\n\nwalletName", walletName);
        console.log("amountValue", amountValue);

        // METADATA
        let metaDataObj = generateMetaDataPlain(body)
        console.log("\n\n metaDataObj");
        console.dir(metaDataObj, { depth: null });


        let rndBr = "888000999" + Math.floor(Math.random() * 1000000);
        console.log("rndBr: ", rndBr);

        console.log("GenerateNft Cardano Wallet Name", walletName);
        const sender = cardano.wallet(walletName);

        console.log("Balance of Sender wallet: " + cardano.toAda(sender.balance().value.lovelace) + " ADA");

        let walletBalance = sender.balance();
        console.log("walletBalance", walletBalance);

        let getAllData = walletBalance.utxo[0].value;
        console.log("getAllData", getAllData);
        delete getAllData.undefined;

        //receiver address
        console.log("RECEIVER_ADDR ", process.env.RECEIVER_ADDR);
        const receiver = process.env.RECEIVER_ADDR;

        getAllData.lovelace = sender.balance().value.lovelace - cardano.toLovelace(amountValue)
        console.log("getAllData ", getAllData);

        let metaDataObjPayload = {
            [rndBr]: metaDataObj,
        };
        console.log("\n\n metaDataObjPayload");
        console.dir(metaDataObjPayload, { depth: null });

        let txInfo = {
            txIn: cardano.queryUtxo(sender.paymentAddr),
            txOut: [
                {
                    address: sender.paymentAddr,
                    value: getAllData,
                },
                { address: receiver, value: { lovelace: cardano.toLovelace(amountValue) } }, //value going to receiver
            ],
            // withdrawal: "self", PROVERITI DA LI RADI - Ovo znaci da skida pare omah sa sendera, odnosno ne salje pare receiveru 1ada
            metadata: metaDataObjPayload,
        };

        console.log("\n\n txInfo ");
        console.dir(txInfo, { depth: null });

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

        res.json({ rndBr, txHash });
    } catch (err) {
        console.error("\n\n ERROR GENERATE TRANSACTION \n\n");
        console.error(err);
        console.error("\n\n\n");
        console.error("Error To String: ", err.toString());
        return res.status(400).json({ error: err.toString() });
        //return res.status(400).json(err);
    }
});


const generateMetaDataPlain = (qrCodeDbData) => {

    console.log('\n\n generateMetaDataPlain qrCodeDbData : ', qrCodeDbData);

    let finalArray = {};
    finalArray["ProductName"] = qrCodeDbData.productName;
    finalArray["CreatorName"] = qrCodeDbData.userFullname;
    finalArray["CreatorEmail"] = qrCodeDbData.userEmail;
    finalArray["CreatorMessage"] = qrCodeDbData.userDesc;

    qrCodeDbData.ownernamecb ? finalArray["clientName"] = qrCodeDbData.clientName : "";
    qrCodeDbData.clientemailcb ? finalArray["clientEmail"] = qrCodeDbData.clientEmail : "";
    finalArray["ClientMessage"] = qrCodeDbData.clientMessage;

    finalArray["WebSiteParams"] = `/status/${qrCodeDbData.walletQrId}`;
    finalArray["WebSiteDomain"] = process.env.BLOKARIA_WEBSITE;
    finalArray["InternalCode"] = qrCodeDbData.walletQrId;

    qrCodeDbData.contributorData ? finalArray["Contributor"] = qrCodeDbData.contributorData : "";

    console.dir(finalArray, { depth: null });

    return finalArray;
}

module.exports = router;


