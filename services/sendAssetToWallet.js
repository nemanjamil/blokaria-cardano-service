var express = require("express");
var router = express.Router();
const cardano = require("../config/cardano");
const Joi = require("joi");

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
    const value = await bodySchema.validateAsync(body);

    let addressWallet = body.addressWallet;
    let walletName = body.walletName;
    let assetId = body.assetId;
    let amountValue = body.amountValue;
    console.log("amountValue ", amountValue);
    //const amountValue = 1;

    const sender = cardano.wallet(walletName);

    let walletBalance = sender.balance();

    //console.log("walletBalance", walletBalance);

    let getAllData = walletBalance.utxo[0].value;

    const numberOfAssets = Object.keys(getAllData).length;

    console.log("numberOfAssets", numberOfAssets);

    delete getAllData.lovelace;
    delete getAllData.undefined;
    delete getAllData[assetId];

    console.log("Sender wallet name ", walletName);
    console.log(
      "Balance of Sender wallet: " +
      cardano.toAda(sender.balance().value.lovelace) +
      " ADA"
    );

    const receiver = addressWallet;

    const txInfo = {
      txIn: cardano.queryUtxo(sender.paymentAddr),
      txOut: [
        {
          address: sender.paymentAddr,
          value: {
            lovelace:
              sender.balance().value.lovelace - cardano.toLovelace(amountValue),
          },
        },
        {
          address: receiver,
          value: {
            lovelace: cardano.toLovelace(amountValue),
            [assetId]: 1,
          },
        },
      ],
    };

    //console.log("Original txInfo ", txInfo);

    if (numberOfAssets > 2) {
      console.log("Entered Update My Wallet");
      Object.assign(txInfo.txOut[0].value, getAllData);
    }

    //console.log("SendAssetToWallet txInfo: ", JSON.stringify(txInfo, null, 4));

    // 3. build the transaction
    const raw = cardano.transactionBuildRaw(txInfo);
    console.log("SendAssetToWallet raw ", raw);

    // 4. calculate the fee
    const fee = cardano.transactionCalculateMinFee({
      ...txInfo,
      txBody: raw,
      witnessCount: 1,
    });

    //console.log("SendAssetToWallet fee ", fee);

    // 5. pay the fee by subtracting it from the sender utxo

    // txInfo.txOut[0].value.lovelace -= fee
    //console.log(JSON.stringify(txInfo, null, 4));

    // 6. build the final transaction

    txInfo.txOut[0].value.lovelace -= fee;

    console.log(JSON.stringify(txInfo, null, 4));

    const tx = cardano.transactionBuildRaw({ ...txInfo, fee });

    console.log("SendAssetToWallet tx ", tx);
    // 7. sign the transaction

    const txSigned = cardano.transactionSign({
      txBody: tx,
      signingKeys: [sender.payment.skey],
    });

    console.log("SendAssetToWallet txSigned ", txSigned);
    // 8. submit the transaction

    const txHash = cardano.transactionSubmit(txSigned);

    console.log("SendAssetToClient FINISH");
    console.log("txHash: ", txHash);
    res.json({ txHash });

    console.log("SendAssetToWallet ", txHash);
  } catch (err) {
    return res.status(400).json({ error: err.toString() });
  }
});

module.exports = router;
