import express from "express";
import Joi from "joi";

import { cardanoApi } from "../cardano/cardanoApi";
// const wallet = cardano.wallet("BLOKARIA")
// app.use(express.json())

const router = express.Router();

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
    };
    console.log("\n\nobjectToTest", objectToTest);

    // WALLET
    const { walletName, amountValue } = body;
    console.log("\n\nwalletName", walletName);
    console.log("amountValue", amountValue);

    // METADATA
    let metaDataObj = generateMetaDataPlain(body);
    console.log("\n\n metaDataObj");
    console.dir(metaDataObj, { depth: null });

    let rndBr = "888000999" + Math.floor(Math.random() * 1000000);
    console.log("rndBr: ", rndBr);

    console.log("Generate Cardano Wallet Name", walletName);
    const wallet = cardanoApi.createWallet(walletName);
    // const sender = cardano.wallet(walletName);
    // const paymentAddrFile = cardano.address.build(walletName, {})
    const walletAddr = await wallet.getAddress();
    console.log("Fetched wallet address by name", walletName, ":", walletAddr);
    const sender = cardanoApi.queryUtxo(walletAddr);
    console.log("Wallet sender fetched:", sender);
    const walletTxIn = Object.keys(sender)[0];
    const walletBalance = sender[walletTxIn].value.lovelace;

    console.log(
      "Balance of Sender wallet: " + walletBalance / 1_000_000 + " ADA"
    );

    //receiver address
    console.log("RECEIVER_ADDR ", process.env.RECEIVER_ADDR);
    const receiver = process.env.RECEIVER_ADDR;

    let metaDataObjPayload = {
      [rndBr]: metaDataObj,
    };

    console.log("\n\n metaDataObjPayload");
    console.dir(metaDataObjPayload, { depth: null });

    const transaction = cardanoApi.createSimpleTransaction(wallet, walletAddr, {
      amount: amountValue * 1_000_000, // to lovelace
      txIn: walletTxIn,
      txOut: receiver,
    });

    await transaction.setMetadata(metaDataObjPayload);

    console.log("Transaction Created:", transaction);

    console.log("Started building transaction");

    const finalTx = transaction.build();

    console.log(`Built transaction file with fee at '${finalTx.getPath()}'`);

    console.log("\nStarted signing transaction");

    const signedTx = await transaction.sign(finalTx);

    console.log(`Signed transaction and saved at '${signedTx.getPath()}'`);

    console.log("\nStarted submitting transaction");

    const txHash = await transaction.submit(signedTx);

    console.log("Submitted transaction successfully with hash:", txHash);

    console.log("cardano.transactionSubmit DONE: ");
    console.log("\n\n\n ---------------  \n\n\n");

    res.json({ rndBr, txHash });
  } catch (err) {
    console.error("\n\n ERROR GENERATE TRANSACTION \n\n");
    console.error(err);
    console.error("\n\n\n");
    console.error("Error To String: ", err.toString());
    return res.status(400).json({ error: err.toString() });
  }
});

const generateMetaDataPlain = (qrCodeDbData) => {
  console.log("\n\n generateMetaDataPlain qrCodeDbData : ", qrCodeDbData);

  let finalArray = {};
  finalArray["ProductName"] = qrCodeDbData.productName;
  finalArray["CreatorName"] = qrCodeDbData.userFullname;
  finalArray["CreatorEmail"] = qrCodeDbData.userEmail;
  finalArray["CreatorMessage"] = qrCodeDbData.userDesc;

  qrCodeDbData.ownernamecb
    ? (finalArray["ClientName"] = qrCodeDbData.clientName)
    : "";
  qrCodeDbData.clientemailcb
    ? (finalArray["ClientEmail"] = qrCodeDbData.clientEmail)
    : "";
  finalArray["ClientMessage"] = qrCodeDbData.clientMessage;

  //finalArray["WebSiteParams"] = ``;
  finalArray[
    "WebSite"
  ] = `${process.env.BLOKARIA_WEBSITE}s/${qrCodeDbData.qrCodeId}`;
  finalArray["InternalCode"] = qrCodeDbData.walletQrId;

  qrCodeDbData.contributorData
    ? (finalArray["Contributor"] = qrCodeDbData.contributorData)
    : "";

  console.dir(finalArray, { depth: null });

  return finalArray;
};

module.exports = router;
