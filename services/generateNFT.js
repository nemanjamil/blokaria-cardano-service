var express = require("express");
var router = express.Router();
const Joi = require("joi");
const cardano = require("../config/cardano");
// const wallet = cardano.wallet("BLOKARIA")
// app.use(express.json())

const bodySchema = Joi.object({
  imageIPFS: Joi.string().min(3).max(100).required().label("imageIPFS"),
  assetName: Joi.string().min(3).max(100).required().label("assetName"),
  copyright: Joi.string().optional().allow("").label("copyright"),
  walletName: Joi.string().min(3).max(100).required().label("walletName"),
  additionalMetaData: Joi.object().required().label("additionalMetaData"),
  storedIntoDb: Joi.object().required().label("storedIntoDb"),
  dalayCallToWalletAsset: Joi.number().min(1).max(600000).optional().label("dalayCallToWalletAsset"),
});

router.use((req, res, next) => {
  console.log("Time generateNFT: ", Date.now());
  next();
});

router.post("/", async (req, res) => {
  const { body } = req;
  console.log("GenerateNft Payload ", body);

  try {
    console.log("GENERATE NFT Start \n\n");
    const value = await bodySchema.validateAsync(body);

    console.log("Successfull Validation");

    let imageIPFS = body.imageIPFS;
    let assetName = body.assetName;
    let copyright = body.copyright;
    let walletName = body.walletName;
    let storedIntoDb = body.storedIntoDb;
    let additionalMetaData = body.additionalMetaData;


    //res.json({imageIPFS,authors})

    console.log("GenerateNft Cardano Wallet Name", walletName);
    console.log("StoredIntoDb", storedIntoDb);
    console.log("AdditionalMetaData", additionalMetaData);

    const wallet = cardano.wallet(walletName);

    //console.log("wallet", wallet)

    const mintScript = {
      keyHash: cardano.addressKeyHash(wallet.name),
      type: "sig",
    };

    console.log("mS", mintScript);
    // 3. Create POLICY_ID
    const POLICY_ID = cardano.transactionPolicyid(mintScript);

    console.log("GenerateNft P_ID ", POLICY_ID);

    // 4. Define ASSET_NAME
    const ASSET_NAME = assetName;
    // Convert Asset ASCII name to HEX
    const ASSET_NAME_HEX = ASSET_NAME.split("")
      .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
      .join("");

    console.log("ASSET_NAME_HEX ", ASSET_NAME_HEX);

    // 5. Create ASSET_ID
    const ASSET_ID = POLICY_ID + "." + ASSET_NAME_HEX;
    const imageIPFSFull = "ipfs://" + imageIPFS;

    console.log("GenerateNft ASSET_ID ", ASSET_ID);
    // 6. Define metadata
    const metadata = {
      721: {
        [POLICY_ID]: {
          [ASSET_NAME]: {
            name: ASSET_NAME,
            image: imageIPFS,
            mediaType: "image/jpeg",
            files: [
              {
                mediaType: "image/jpeg",
                name: ASSET_NAME,
                src: imageIPFS,
              },
            ],
            copyright: copyright,
          },
        },
      },
    };

    metadata[721][POLICY_ID][ASSET_NAME] = { ...metadata[721][POLICY_ID][ASSET_NAME], ...additionalMetaData }


    console.log("GenerateNft metadata ", metadata);
    // 7. Define transaction
    const tx = {
      txIn: wallet.balance().utxo,
      txOut: [
        {
          address: wallet.paymentAddr,
          value: { ...wallet.balance().value, [ASSET_ID]: 1 },
        },
      ],
      mint: [
        { action: "mint", quantity: 1, asset: ASSET_ID, script: mintScript },
      ],
      metadata,
      witnessCount: 2,
    };

    if (
      Object.keys(tx.txOut[0].value).includes("undefined") ||
      Object.keys(tx.txIn[0].value.includes("undefinded"))
    ) {
      delete tx.txOut[0].value.undefined;
      delete tx.txIn[0].value.undefined;
    }

    // 8. Build transaction
    const buildTransaction = (tx) => {
      const raw = cardano.transactionBuildRaw(tx);
      const fee = cardano.transactionCalculateMinFee({
        ...tx,
        txBody: raw,
      });
      tx.txOut[0].value.lovelace -= fee;
      return cardano.transactionBuildRaw({ ...tx, fee });
    };
    const raw = buildTransaction(tx);

    console.log("GenerateNft raw ", raw);
    // 9. Sign transaction
    const signTransaction = (wallet, tx) => {
      console.log("wallet.payment.skey", wallet.payment.skey);
      return cardano.transactionSign({
        signingKeys: [wallet.payment.skey, wallet.payment.skey],
        txBody: tx,
      });
    };

    const signed = signTransaction(wallet, raw);

    console.log("GenerateNft signed ", signed);
    // 10. Submit transaction
    const txHash = await cardano.transactionSubmit(signed);

    console.log("GenerateNft txHash ", txHash);

    console.log("GENERATE NFT FINISH - go to  createCardanoNftWithAssignWallet");
    //res.send(txHash)
    res.json({ txHash, assetId: ASSET_ID });
  } catch (err) {
    console.log("\n\n ERROR GENERATE NFT \n\n");
    console.log(err);
    console.log("\n\n\n");
    console.log(err.toString());
    return res.status(400).json({ error: err.toString() });
    //return res.status(400).json(err);
  }
});

module.exports = router;
