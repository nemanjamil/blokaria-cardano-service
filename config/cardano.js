const { CardanoCliJs } = require("cardanocli-js");
const shelleyGenesisPath = process.env.SHELLEY_GENESIS_PATH;
const cardano = new CardanoCliJs({
  network: process.env.CARDANO_NET_MAGIC,
  dir: "/opt/cardano/cnode",
  shelleyGenesisPath,
  cliPath: "/home/admin/.local/bin/cardano-cli",
  socketPath: "/opt/cardano/cnode/sockets/node.socket",
});
module.exports = cardano;
