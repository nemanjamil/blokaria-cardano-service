#!/usr/bin/env node
const express = require("express");
const app = express();
const port = 3333;
require("dotenv").config();
var generateNFT = require("./services/generateNFT");
var sendAssetToWallet = require("./services/sendAssetToWallet");
var getBalance = require("./services/getBalance");
var checkWallet = require("./services/checkWallet");
var walletToWalletTx = require("./services/walletToWalletTx");
//var createWallet = require('./services/createWallet')

app.use(express.json());

app.use("/generateNFT", generateNFT);
app.use("/sendAssetToWallet", sendAssetToWallet);
app.use("/getBalance", getBalance);
app.use("/checkWallet", checkWallet);
app.use("/generateTransaction", walletToWalletTx);
//app.use('/sendAssetToWallet', sendAssetToWallet);

app.get("/healthCheck", (req, res) => {
  console.log("healthCheck");
  res.send("Hello World!");
});

// test empty 2

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
