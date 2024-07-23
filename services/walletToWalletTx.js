
var express = require("express");
var router = express.Router();
const Joi = require("joi");
const cardano = require("../config/cardano");

const { cardanoApi } = require("../cardano/cardanoApi");
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
    qrCodeId: Joi.string().max(60).required(),

    contributorData: Joi.string().max(60).optional().allow(""),
    clientemailcb: Joi.boolean(),
    ownernamecb: Joi.boolean(),

    walletName: Joi.string().max(60).required(),
    amountValue: Joi.number().max(10).required(),
});

router.use((req, res, next) => {
    console.log("Time wallet to wallet tx: ", Date.now());
    next();
});

router.post("/", async (req, res) => {
    const { body } = req;
    console.log("GenerateWalletToWalletTransaction Payload ", body);


    try {

        console.log("\n\n\n GENERATE wallet to wallet BASIC - START \n\n");

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
            qrCodeId: body.qrCodeId,

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

        console.log("Generate Cardano Wallet Name", walletName);
        // const sender = cardano.wallet(walletName);
        // const paymentAddrFile = cardano.address.build(walletName, {})
        const walletAddr = await cardanoApi.getWalletAddr(walletName)
        console.log("Fetched wallet address by name", walletName, ":", walletAddr)
        const sender = cardanoApi.queryUtxo(walletAddr)
        console.log("Wallet sender fetched:", sender)
        const walletTxIn = Object.keys(sender)[0]
        const walletBalance = sender[walletTxIn].value.lovelace

        console.log("Balance of Sender wallet: " + (walletBalance / 1_000_000) + " ADA");

        //console.log("walletBalance", walletBalance);

        // let getAllData = walletBalance.utxo[0].value;
        // console.log("getAllData", getAllData);
        // delete getAllData.undefined;

        //receiver address
        console.log("RECEIVER_ADDR ", process.env.RECEIVER_ADDR);
        const receiver = process.env.RECEIVER_ADDR;

        // getAllData.lovelace = sender.balance().value.lovelace - cardano.toLovelace(amountValue)

        let metaDataObjPayload = {
            [rndBr]: metaDataObj,
        };

        console.log("\n\n metaDataObjPayload");
        console.dir(metaDataObjPayload, { depth: null });

        const transaction = cardanoApi.createTransaction({
            amount: amountValue * 1_000_000, // to lovelace
            txIn: walletTxIn,
            txOut: receiver,
            walletName: walletName,
            metadata: metaDataObjPayload
        })

        console.log("Transaction Created:", transaction)

        console.log("Started building transaction")

        const finalTx = await transaction.build()

        console.log(`Built transaction file with fee at '${finalTx.getPath()}'`)

        console.log("\nStarted signing transaction")

        const signedTx = transaction.sign(finalTx)

        console.log(`Signed transaction and saved at '${signedTx}'`)

        console.log("\nStarted submitting transaction")

        const txHash = transaction.submit()

        console.log("Submitted transaction successfully with hash:", txHash)

        // let txInfo = {
        //     txIn: cardano.queryUtxo(sender.paymentAddr),
        //     txOut: [
        //         {
        //             address: sender.paymentAddr,
        //             value: getAllData,
        //         },
        //         { address: receiver, value: { lovelace: cardano.toLovelace(amountValue) } }, //value going to receiver
        //     ],
        //     // withdrawal: "self", PROVERITI DA LI RADI - Ovo znaci da skida pare omah sa sendera, odnosno ne salje pare receiveru 1ada
        //     metadata: metaDataObjPayload,
        // };

        // let raw = cardano.transactionBuildRaw(txInfo);

        // console.log("raw ", raw);
        //calculate fee
        // let fee = cardano.transactionCalculateMinFee({
        //     ...txInfo,
        //     txBody: raw,
        //     witnessCount: 1,
        // });

        //pay the fee by subtracting it from the sender utxo
        // txInfo.txOut[0].value.lovelace -= fee;
        // console.log('txInfo.txOut[0].value.lovelace', txInfo.txOut[0].value.lovelace);


        //create final transaction
        // let tx = cardano.transactionBuildRaw({ ...txInfo, fee });

        console.log("cardano.transactionSubmit DONE: ");
        console.log("\n\n\n ---------------  \n\n\n");

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

    qrCodeDbData.ownernamecb ? finalArray["ClientName"] = qrCodeDbData.clientName : "";
    qrCodeDbData.clientemailcb ? finalArray["ClientEmail"] = qrCodeDbData.clientEmail : "";
    finalArray["ClientMessage"] = qrCodeDbData.clientMessage;

    //finalArray["WebSiteParams"] = ``;
    finalArray["WebSite"] = `${process.env.BLOKARIA_WEBSITE}s/${qrCodeDbData.qrCodeId}`;
    finalArray["InternalCode"] = qrCodeDbData.walletQrId;

    qrCodeDbData.contributorData ? finalArray["Contributor"] = qrCodeDbData.contributorData : "";

    console.dir(finalArray, { depth: null });

    return finalArray;
}

module.exports = router;


