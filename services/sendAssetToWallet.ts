import express from "express";
import Joi from "joi";
import { cardanoApi } from "../cardano/cardanoApi";

const router = express.Router();

const getAssetMetadata = (
  walletUtxo: Record<string, any>,
  assetId: string
): Promise<{ policyId: string; txIn: string }> => {
  return new Promise((resolve, reject) => {
    let found = false;
    Object.entries(walletUtxo).forEach(([txIn, utxo]) => {
      Object.entries(utxo.value).forEach(([policyId, assets]) => {
        Object.keys(assets).forEach((aId) => {
          if (aId === assetId) {
            resolve({ policyId, txIn: txIn });
            found = true;
          }
        });
      });
    });

    if (!found) {
      reject(new Error("Failed to find provided asset in wallet"));
    }
  });
};

const bodySchema = Joi.object({
  walletName: Joi.string().min(5).max(100).required(),
  addressWallet: Joi.string().min(5).max(300).required(),
  assetId: Joi.string().min(5).max(200).required(),
  amountValue: Joi.number().required(),
});

router.use((req, res, next) => {
  console.log("Time sendAssetToWallet: ", Date.now(), "\n\n");
  next();
});

router.post("/", async (req, res) => {
  const { body } = req;

  console.log("\n\n\n SEND ASSET TO WALLET - START \n\n");
  console.log("SendAssetToWallet Payload ", body);

  try {
    await bodySchema.validateAsync(body);

    let addressWallet = body.addressWallet;
    let walletName = body.walletName;
    let assetId = body.assetId;
    let amountValue = body.amountValue;
    console.log("amountValue ", amountValue);
    //const amountValue = 1;

    const wallet = cardanoApi.createWallet(walletName);
    const walletAddr = await wallet.getAddress();
    const walletUtxo = await cardanoApi.queryUtxo(walletAddr);

    const walletTxIns = Object.keys(walletUtxo);
    const walletBalance = walletTxIns.reduce(
      (prev, curr) => prev + walletUtxo[curr].value.lovelace,
      0
    );

    console.log("walletBalance", walletBalance);

    const [policyId, assetName] = assetId.split(".");
    // const assetMetadata = await getAssetMetadata(walletUtxo, assetId);

    console.log("Asset metadata:", { policyId, assetName });

    // let getAllData = walletBalance.utxo[0].value;

    // const numberOfAssets = Object.keys(getAllData).length;

    // console.log("numberOfAssets", numberOfAssets);

    // delete getAllData.lovelace;
    // delete getAllData.undefined;
    // delete getAllData[assetId];

    console.log("Sender wallet name ", walletName);
    console.log(
      "Balance of Sender wallet: " + walletBalance / 1_000_000 + " ADA"
    );

    const receiver = addressWallet;

    const transaction = cardanoApi.createAssetTransaction(
      wallet,
      walletAddr,
      {
        assetName: assetName,
        policyId: policyId,
      },
      {
        amount: 1_000_000,
        txIn: walletTxIns,
        txOut: receiver,
      }
    );

    const raw = transaction.build();

    //console.log("Original txInfo ", txInfo);

    // if (numberOfAssets > 2) {
    //   console.log("Entered Update My Wallet");
    //   Object.assign(txInfo.txOut[0].value, getAllData);
    // }

    // 7. sign the transaction

    const signed = await transaction.sign(raw);

    console.log("SendAssetToWallet txSigned ", signed);
    // 8. submit the transaction

    const txHash = await transaction.submit(signed);

    console.log("SendAssetToClient FINISH");
    console.log("txHash: ", txHash);
    res.json({ txHash });

    console.log("SendAssetToWallet ", txHash);
  } catch (err) {
    return res.status(400).json({ error: err.toString() });
  }
});

module.exports = router;
