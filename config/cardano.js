const CardanocliJs = require("cardanocli-js");
const shelleyGenesisPath =
  "/opt/cardano/cnode/files/mainnet-shelley-genesis.json";
const cardano = new CardanocliJs({ shelleyGenesisPath });
// const cardano = new Cardano({
//     network: process.env.CARDANO_NET_MAGIC,
//     dir: "/opt/cardano/cnode",
//     shelleyGenesisPath: "/opt/cardano/cnode/files/shelley-genesis.json"
// });

module.exports = cardano;
