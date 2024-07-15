// const { CardanoCliJs, CardanoCliJsOptions } = require("cardanocli-js");
// const shelleyGenesisPath = process.env.SHELLEY_GENESIS_PATH;
// const options = new CardanoCliJsOptions({
//   shelleyGenesisPath,
//   network: 1097911063,
// });
// const cardano = new CardanoCliJs(options);
// module.exports = cardano;
// const cardano = new Cardano({
//     network: process.env.CARDANO_NET_MAGIC,
//     dir: "/opt/cardano/cnode",
//     shelleyGenesisPath: "/opt/cardano/cnode/files/shelley-genesis.json"
// });

const CardanocliJs = require("cardanocli-js");
const shelleyGenesisPath = process.env.SHELLEY_GENESIS_PATH;

const cardano = new CardanocliJs({ shelleyGenesisPath });
module.exports = cardano;
