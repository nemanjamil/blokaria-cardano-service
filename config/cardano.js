const CardanocliJs = require("cardanocli-js");
const shelleyGenesisPath = process.env.SHELLEY_GENESIS_PATH;
const cardano = new CardanocliJs({
  network: process.env.CARDANO_NET_MAGIC,
  dir: "/opt/cardano/cnode",
  shelleyGenesisPath,
  socketPath: "/opt/cardano/cnode/sockets/node.socket",
});
module.exports = cardano;
