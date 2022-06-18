const Cardano = require("cardanocli-js")

const cardano = new Cardano({
    //network: "testnet-magic 1097911063",
    network: process.env.CARDANO_NET_MAGIC,
    dir: "/opt/cardano/cnode",
    shelleyGenesisPath: "/opt/cardano/cnode/files/shelley-genesis.json"
});


//const shelleyGenesisPath = "/opt/cardano/cnode/files/shelley-genesis.json";
//const cardano  = new Cardano({ shelleyGenesisPath });

module.exports = cardano;
