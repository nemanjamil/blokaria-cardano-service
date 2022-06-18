#!/usr/bin/env node
const express = require('express')
const app = express()
const port = 3333
require('dotenv').config();
var generateNFT = require('./services/generateNFT');
var sendAssetToWallet = require('./services/sendAssetToWallet');
var getBalance = require('./services/getBalance')
var checkWallet = require('./services/checkWallet')
//var createWallet = require('./services/createWallet')

console.log('\n\n');
console.log('KRENUO PROCESS');
console.log('APP process.env.CARDANO_NET_MAGIC', process.env.CARDANO_NET_MAGIC);

app.use(express.json())

app.use('/generateNFT', generateNFT);
app.use('/sendAssetToWallet', sendAssetToWallet);
app.use('/getBalance', getBalance);
app.use('/checkWallet', checkWallet);
//app.use('/sendAssetToWallet', sendAssetToWallet);


app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

