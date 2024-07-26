import { execSync } from "child_process";
import {
  MintTransaction,
  MintTransactionOptions,
  SimpleTransaction,
  Transaction,
  TransactionOptions,
} from "./transaction";
import { Wallet, WalletOptions } from "./wallet";
import { TxFile } from "./txFile";
import { AssetTransaction, AssetTransactionOptions } from "./transaction/asset";

interface CardanoApiOptions {
  network: string;
  era?: string;
  dir: string;
  cliPath?: string;
  socketPath: string;
  shelleyGenesisPath: string;
}

export type PureTransactionOptions = Omit<
  TransactionOptions,
  "cliPath" | "dir" | "network" | "socketPath"
>;

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

  getPolicyId(scriptFile: TxFile): string {
    const command = `${this.getCliPath()} transaction policyid --script-file ${scriptFile.getPath()}`;
    console.log("[CARDANO_API] Get tx policy id command:", command);
    const output = execSync(command).toString("utf-8");
    console.log("[CARDANO_API] Get tx policy id output:", output);
    const policyid = output.trim().replace(/(\r\n|\n|\r)*/gm, "");
    console.log("[CARDANO_API] Policy ID:", policyid);
    return policyid;
  }

  private getTransactionOptions(options: PureTransactionOptions) {
    return {
      ...options,
      cliPath: this.getCliPath(),
      dir: this.options.dir,
      network: this.getNetwork(),
      socketPath: this.options.socketPath,
    };
  }

  createSimpleTransaction(
    wallet: Wallet,
    changeAddress: string,
    options: PureTransactionOptions
  ): Transaction {
    return new SimpleTransaction(
      wallet,
      changeAddress,
      this.getTransactionOptions(options)
    );
  }

  createAssetTransaction(
    wallet: Wallet,
    changeAddress: string,
    assetOptions: AssetTransactionOptions,
    options: PureTransactionOptions
  ): Transaction {
    return new AssetTransaction(wallet, changeAddress, {
      ...this.getTransactionOptions(options),
      ...assetOptions,
    });
  }

  createMintTransaction(
    wallet: Wallet,
    mintOptions: MintTransactionOptions,
    options: PureTransactionOptions
  ): Transaction {
    return new MintTransaction(
      wallet,
      mintOptions,
      this.getTransactionOptions(options)
    );
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
