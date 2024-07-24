import { execSync } from "child_process";
import { Transaction, TransactionOptions } from "./transaction";
import { Wallet, WalletOptions } from "./wallet";

interface CardanoApiOptions {
  network: string;
  era?: string;
  dir: string;
  cliPath?: string;
  socketPath: string;
  shelleyGenesisPath: string;
}

export class CardanoAPI {
  private readonly options: CardanoApiOptions;

  constructor(options: CardanoApiOptions) {
    this.options = options;
  }

  private getCliPath(): string {
    return this.options.cliPath ?? "cardano-cli";
  }

  private getNetwork(): string {
    return this.options.network !== "mainnet"
      ? `testnet-magic ${this.options.network}`
      : "mainnet";
  }

  private getSocketPath(): string {
    return this.options.socketPath;
  }

  queryUtxo(address: string): Record<string, any> {
    const command = `${this.getCliPath()} query utxo --address ${address} --${this.getNetwork()} --socket-path ${this.getSocketPath()} --output-json`;
    console.log("[CARDANO_API] Query UTXO command:", command);
    const output = execSync(command).toString("utf-8");
    console.log("[CARDANO_API] Query UTXO output:", output);
    return JSON.parse(output);
  }

  getQueryTip(): Record<string, any> {
    const output = execSync(
      `${this.getCliPath()} query tip --${this.getNetwork()} --socket-path ${this.getSocketPath()}`
    );
    return JSON.parse(output.toString("utf-8"));
  }

  createTransaction(
    wallet: Wallet,
    options: Omit<
      TransactionOptions,
      "cliPath" | "dir" | "network" | "socketPath"
    >
  ): Transaction {
    return new Transaction(wallet, {
      ...options,
      cliPath: this.getCliPath(),
      dir: this.options.dir,
      network: this.getNetwork(),
      socketPath: this.options.socketPath,
    });
  }

  createWallet(walletName: string): Wallet {
    return new Wallet(walletName, {
      cliPath: this.options.cliPath,
      dir: this.options.dir,
      network: this.options.network,
    });
  }
}

const shelleyGenesisPath = process.env.SHELLEY_GENESIS_PATH;

const cardanoApi = new CardanoAPI({
  network: process.env.CARDANO_NET_MAGIC,
  dir: "/opt/cardano/cnode",
  shelleyGenesisPath,
  cliPath: "/home/admin/.local/bin/cardano-cli",
  socketPath: "/opt/cardano/cnode/sockets/node.socket",
});

export { cardanoApi };
