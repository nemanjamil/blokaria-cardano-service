import express from "express";
import Joi from "joi";
import { cardanoApi } from "../cardano/cardanoApi";

const router = express.Router();

const bodySchema = Joi.object({
  walletName: Joi.string().min(5).max(100).required(),
});

router.post("/", async (req, res) => {
  const { body } = req;
  console.log("Body: ", body);

  console.log(
    "Cardano process.env.CARDANO_NET_MAGIC",
    process.env.CARDANO_NET_MAGIC
  );

  try {
    await bodySchema.validateAsync(body);

    let walletName = body.walletName;

    console.log("walletName: ", walletName);

    const wallet = cardanoApi.createWallet(walletName);

    const walletAddr = await wallet.getAddress();

    const sender = cardanoApi.queryUtxo(walletAddr);

    const walletTxIns = Object.keys(sender);
    const walletBalance = walletTxIns.reduce(
      (prev, curr) => prev + sender[curr].value.lovelace,
      0
    );

    console.log("Wallet Address", walletAddr);
    console.log("Wallet UTXO:", sender);
    console.log("Wallet Balance:", walletBalance);

    // walletscript.paymentAddr = walletscript.paymentAddr.trim()

    // console.log("Trim WalletScript", walletscript)

    res.json({
      balance: walletBalance,
      walletAddr,
      utxo: sender,
    });
  } catch (err) {
    console.log(err);
    return res.status(400).json({ error: err.toString() });
  }
});

module.exports = router;
