const Cardano = require("cardanocli-js")

const cardano = new Cardano({
    network: "mainnet 764824073",
    dir: "/opt/cardano/cnode",
    shelleyGenesisPath: "/opt/cardano/cnode/files/shelley-genesis.json"
});

module.exports = cardano;
