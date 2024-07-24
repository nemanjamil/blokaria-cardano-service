import express from "express";
import Joi from "joi";
import { cardanoApi } from "../cardano/cardanoApi";
import { TxFile } from "../cardano/txFile";

// const cardano = require("../config/cardano");
// const wallet = cardano.wallet("BLOKARIA")
// app.use(express.json())

const router = express.Router();

const bodySchema = Joi.object({
  imageIPFS: Joi.string().min(3).max(100).required(),
  assetName: Joi.string().min(3).max(100).required(),
  copyright: Joi.string().optional().allow(""),
  walletName: Joi.string().min(3).max(100).required(),
  additionalMetaData: Joi.object().required(),
  storedIntoDb: Joi.object().required(),
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
    console.log("GENERATE NFT START \n\n");
    await bodySchema.validateAsync(body);

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

    const wallet = cardanoApi.createWallet(walletName);

    const walletAddr = await wallet.getAddress();

    const sender = cardanoApi.queryUtxo(walletAddr);
    console.log("Wallet sender fetched:", sender);

    const walletTxIn = Object.keys(sender)[0];

    //console.log("wallet", wallet)

    const mintScript = {
      keyHash: wallet.getAddressKeyHash(),
      type: "sig",
    };

    console.log("mS", mintScript);

    const scriptFile = new TxFile(".script");

    await scriptFile.writeString(JSON.stringify(mintScript));

    // 3. Create POLICY_ID

    const POLICY_ID = cardanoApi.getPolicyId(scriptFile);

    console.log("GenerateNft P_ID ", POLICY_ID);

    // 4. Define ASSET_NAME
    const ASSET_NAME = assetName;
    // Convert Asset ASCII name to HEX
    const ASSET_NAME_HEX = ASSET_NAME.split("")
      .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
      .join("");

    console.log("5. ASSET_NAME_HEX ", ASSET_NAME_HEX);

    // 5. Create ASSET_ID
    const ASSET_ID = POLICY_ID + "." + ASSET_NAME_HEX;
    const imageIPFSFull = "ipfs://" + imageIPFS;

    console.log("6. GenerateNft ASSET_ID ", ASSET_ID);
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

    metadata[721][POLICY_ID][ASSET_NAME] = {
      ...metadata[721][POLICY_ID][ASSET_NAME],
      ...additionalMetaData,
    };

    const transaction = cardanoApi.createMintTransaction(
      wallet,
      {
        assetName: ASSET_NAME,
        policyId: POLICY_ID,
        changeAddress: walletAddr,
        policyScript: scriptFile,
      },
      {
        amount: 1,
        txIn: walletTxIn,
        txOut: walletAddr,
      }
    );

    await transaction.setMetadata(metadata);

    console.log("7. GenerateNft metadata ", metadata);
    // 7. Define transaction
    // const tx = {
    //   txIn: walletTxIn,
    //   txOut: [
    //     {
    //       address: wallet.paymentAddr,
    //       value: { ...wallet.balance().value, [ASSET_ID]: 1 },
    //     },
    //   ],
    //   mint: [
    //     { action: "mint", quantity: 1, asset: ASSET_ID, script: mintScript },
    //   ],
    //   metadata,
    //   witnessCount: 2,
    // };

    console.log("8. GenerateNft tx.txIn ", walletTxIn);
    console.log("9. GenerateNft tx.txOut ", walletAddr);

    // if (
    //   Object.keys(tx.txOut[0].value).includes("undefined") ||
    //   Object.keys(tx.txIn[0].value).includes("undefinded")
    // ) {
    //   delete tx.txOut[0].value.undefined;
    //   delete tx.txIn[0].value.undefined;
    // }

    console.log("10. Pass OK ");

    // // 8. Build transaction
    // const buildTransaction = (tx) => {
    //   const raw = cardano.transactionBuildRaw(tx);
    //   const fee = cardano.transactionCalculateMinFee({
    //     ...tx,
    //     txBody: raw,
    //   });
    //   tx.txOut[0].value.lovelace -= fee;
    //   return cardano.transactionBuildRaw({ ...tx, fee });
    // };
    const raw = transaction.build();

    console.log("11. GenerateNft raw ", raw);
    // 9. Sign transaction

    const signed = await transaction.sign(raw);

    console.log("12. GenerateNft signed ", signed);
    // 10. Submit transaction
    const txHash = await transaction.submit(signed);

    console.log("13. GenerateNft txHash ", txHash);

    console.log(
      "14. GENERATE NFT FINISH - go to  createCardanoNftWithAssignWallet"
    );
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
