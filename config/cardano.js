const Cardano = require("cardanocli-js")

const cardano = new Cardano({
    network: "mainnet-magic 764824073",
    dir: "/opt/cardano/cnode",
    shelleyGenesisPath: "/opt/cardano/cnode/files/shelley-genesis.json"
});


//const shelleyGenesisPath = "/opt/cardano/cnode/files/shelley-genesis.json";
//const cardano  = new Cardano({ shelleyGenesisPath });

module.exports = cardano;
