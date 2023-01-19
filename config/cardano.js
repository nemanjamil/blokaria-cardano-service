const Cardano = require("cardanocli-js")

const cardano = new Cardano({
    network: process.env.CARDANO_NET_MAGIC,
    dir: "/opt/cardano/cnode",
    shelleyGenesisPath: "/opt/cardano/cnode/files/shelley-genesis.json"
});

module.exports = cardano;
