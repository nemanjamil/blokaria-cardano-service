var express = require('express');
var router = express.Router();
const Joi = require('joi');
const cardano = require("../config/cardano")


const bodySchema = Joi.object({
    walletName: Joi.string().min(5).max(100).required(),
})

router.post('/', async (req, res) => {

    const { body } = req;
    console.log(body)

    try {
        const value = await bodySchema.validateAsync(body);

        let walletName = body.walletName

        const walletscript = cardano.wallet(walletName)

        res.json({ "balance" : walletscript.balance()  })

    }
    catch (err) {
        return res.status(400).json({ error: err.toString() });
    }

})

module.exports = router;
