var express = require('express');
var router = express.Router();
const Joi = require('joi');
const cardano = require("../config/cardano")


const bodySchema = Joi.object({
    walletName: Joi.string().min(5).max(100).required(),
})

router.post('/', async (req, res) => {

    const { body } = req;
    console.log("Body START CHECK WALLET: ", body)

    console.log('Cardano process.env.CARDANO_NET_MAGIC', process.env.CARDANO_NET_MAGIC);

    try {
        const value = await bodySchema.validateAsync(body);

        let walletName = body.walletName

        console.log("walletName: ", walletName)

        const walletscript = cardano.wallet(walletName)

        console.log("Prosao WalletScript", walletscript)

        // walletscript.paymentAddr = walletscript.paymentAddr.trim()

        // console.log("Trim WalletScript", walletscript)

        res.json({
            "balance": walletscript.balance(),
            "wallet": walletscript
        })

    }
    catch (err) {
        console.log(err)
        return res.status(400).json({ error: err.toString() });
    }

})

module.exports = router;


