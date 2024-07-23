import { CardanoCliJs, CardanoCliJsOptions } from "cardanocli-js";
import { exec, execSync } from "child_process";
import fs from "fs/promises";
import { v4 } from "uuid";

interface CardanoApiOptions {
  network: string;
  era?: string;
  dir: string;
  cliPath?: string;
  socketPath: string;
  shelleyGenesisPath: string;
}

export interface FinalRawTransactionOptions {
  txIn: string;
  txOut: string;
  amount: number;
  calculatedFee: number;
  metadataFile?: TxFile;
  ttlAllowance?: number;
}

export class TxFile {
  private readonly path: string;
  private readonly filename: string;

  constructor(extension: string) {
    const id = v4();
    this.filename = `${id}${extension}`;
    this.path = `/tmp/${this.filename}`;
    console.log(`[CARDANO_TX_FILE] New file at '${this.path}'`);
  }

  async unload() {
    console.log(
      `[CARDANO_TX_FILE] Unloading (deleting) tx file at '${this.path}'`
    );
    await fs.rm(this.path, { force: true });
  }

  getPath(): string {
    return this.path;
  }
}

export interface TransactionOptions {
  cliPath: string;
  network: string;
  txIn: string;
  txOut: string;
  amount: number;
  dir: string;
  socketPath: string;
  walletName: string;
  metadata?: Record<string, any>;
}

export class Transaction {
  private readonly cliPath: string;
  private readonly network: string;
  private readonly options: TransactionOptions;
  private amount: number;
  private metadata?: TxFile;

  private getCliPath(): string {
    return this.cliPath;
  }

  private getNetwork(): string {
    return this.network;
  }

  private async getMetadata() {
    if (this.options.metadata) {
      console.log("[CARDANO_API] Found metadata:", this.options.metadata);
      const metadataFile = new TxFile("-metadata.json");
      console.log(
        `[CARDANO_API] Writing metadata json to '${metadataFile.getPath()}'`
      );
      await fs.writeFile(
        metadataFile.getPath(),
        JSON.stringify(this.options.metadata),
        {
          encoding: "utf-8",
        }
      );
      this.metadata = metadataFile;
    } else {
      console.log("[CARDANO_API] No metadata provided");
      this.metadata = null;
    }
  }

  private getProtocolParams() {
    const protocolFile = new TxFile(".json");
    const command = `${this.getCliPath()} query protocol-parameters --${this.getNetwork()} --out-file ${protocolFile.getPath()} --socket-path ${this.getSocketPath()}`;
    console.log("[CARDANO_API] Get protocol parameters command:", command);
    const output = execSync(command);
    console.log(
      "[CARDANO_API] Get protocol parameters output:",
      output.toString("utf-8")
    );
    return protocolFile;
  }

  private getQueryTip(): Record<string, any> {
    const command = `${this.getCliPath()} query tip --${this.getNetwork()} --socket-path ${this.getSocketPath()}`;
    console.log(`[CARDANO_API] Get query tip command:`, command);
    const output = execSync(command).toString("utf-8");
    console.log("[CARDANO_API] Get query tip output:", output);
    return JSON.parse(output);
  }

  private getWalletPaymentKeyPath(): string {
    console.log("[CARDANO_API] Get wallet payment key path start");
    const privAccountDir = `${this.options.dir}/priv/wallet/${this.options.walletName}`;
    const outPaymentKeyFile = `${privAccountDir}/${this.options.walletName}.payment.skey`;
    console.log(
      `[CARDANO_API] Get wallet payment key path is '${outPaymentKeyFile}'`
    );

    return outPaymentKeyFile;
  }

  private getSocketPath(): string {
    return this.options.socketPath;
  }

  constructor(options: TransactionOptions) {
    this.cliPath = options.cliPath;
    this.network = options.network;
    this.amount = options.amount;
    this.options = options;
    this.getMetadata();
  }

  async build(): Promise<TxFile> {
    const draft = await this.draftTransaction();
    const fee = this.calculateTransactionFee(draft, 1);
    // const fee = 100000;
    // this.amount -= fee;
    return await this.finalRawTransaction(fee, 1000);
  }

  buildV2(): TxFile {
    const txIn = this.options.txIn;
    const txOut = this.options.txOut;
    const invalidHereAfter = this.getQueryTip().slot + 10000;
    const invalidBefore = 0;
    const outFile = new TxFile(".raw");

    const command = `${this.getCliPath()} transaction build --tx-in ${txIn} --tx-out "${txOut}+${
      this.amount
    }" --invalid-hereafter ${invalidHereAfter} --invalid-before ${invalidBefore} --${this.getNetwork()} --socket-path ${this.getSocketPath()} --out-file ${outFile.getPath()}`;
    console.log("[CARDANO_API] Build smart tx command:", command);
    const output = execSync(command).toString("utf-8");
    console.log("[CARDANO_API] Build smart tx output:", output);

    return outFile;
  }

  sign(txFile: TxFile): TxFile {
    const signedFile = new TxFile(".signed");
    const paymentKeyPath = this.getWalletPaymentKeyPath();
    const command = `${this.getCliPath()} transaction sign --tx-body-file ${txFile.getPath()} --signing-key-file ${paymentKeyPath} --${this.getNetwork()} --out-file ${signedFile.getPath()}`;
    console.log("[CARDANO_API] Sign tx command:", command);
    const output = execSync(command);
    console.log("[CARDANO_API] Sign tx output:", output.toString("utf-8"));
    txFile.unload();
    return signedFile;
  }

  submit(txFile: TxFile): string {
    const txId = this.getTransactionId(txFile);
    const command = `${this.getCliPath()} transaction submit --tx-file ${txFile.getPath()} --${this.getNetwork()} --socket-path ${this.getSocketPath()}`;
    console.log("[CARDANO_API] Submit tx command:", command);
    const output = execSync(command);
    console.log("[CARDANO_API] Submit tx output:", output.toString("utf-8"));
    txFile.unload();

    return txId;
  }

  private getTransactionId(txSigned: TxFile): string {
    const command = `${this.getCliPath()} transaction txid --tx-file ${txSigned.getPath()}`;
    console.log("[CARDANO_API] Get txid command:", command);
    const output = execSync(command).toString("utf-8");
    console.log("[CARDANO_API] Get txid output:", output);
    const txId = output.trim().replace(/(\r\n|\n|\r)/gm, "");
    console.log(`[CARDANO_API] Get txid hash is '${txId}'`);
    return txId;
  }

  private async draftTransaction(): Promise<TxFile> {
    const outFile = new TxFile(".draft");
    const txIn = this.options.txIn;
    const txOut = this.options.txOut;
    const amount = this.amount;
    const metadataFile = this.metadata;
    const command = `${this.getCliPath()} transaction build-raw --tx-in ${txIn} --tx-out ${txOut}+${amount}${
      metadataFile ? ` --metadata-json-file ${metadataFile.getPath()}` : ""
    } --fee 0 --out-file ${outFile.getPath()}`;
    console.log("[CARDANO_API] Executing draft tx:", command);
    const output = execSync(command);
    console.log("[CARDANO_API] Draft tx output:", output.toString("utf-8"));
    return outFile;
  }

  private calculateTransactionFee(
    txFile: TxFile,
    witnessCount: number = 1
  ): number {
    const protocolFile = this.getProtocolParams();
    console.log(`[CARDANO_API] Protocol file at '${protocolFile.getPath()}'`);
    const command = `${this.getCliPath()} transaction calculate-min-fee --tx-body-file ${txFile.getPath()} --witness-count ${witnessCount} --${this.getNetwork()} --protocol-params-file ${protocolFile.getPath()}`;
    console.log("[CARDANO_API] Executing draft tx:", command);
    const output = execSync(command).toString("utf-8");
    console.log("[CARDANO_API] Calculate tx fee output:", output);
    const fee = Number(output.replace(/\D*/gi, ""));
    console.log("[CARDANO_API] Parsed tx fee:", fee);
    protocolFile.unload();
    txFile.unload();
    return fee;
  }

  private finalRawTransaction(
    calculatedFee: number,
    ttlAllowance: number = 1000
  ): TxFile {
    const rawFile = new TxFile(".raw");
    const tip = this.getQueryTip();
    const { txIn, txOut } = this.options;
    const metadataFile = this.metadata;
    const amount = this.amount;
    const command = `${this.getCliPath()} transaction build-raw --tx-in ${txIn} --tx-out ${txOut}+${amount}${
      metadataFile ? ` --metadata-json-file ${metadataFile.getPath()}` : ""
    } --fee ${calculatedFee} --ttl ${
      tip.slot + ttlAllowance
    } --out-file ${rawFile.getPath()}`;
    console.log("[CARDANO_API] Final tx command:", command);
    const output = execSync(command).toString("utf-8");
    console.log("[CARDANO_API] Final tx output:", output);
    return rawFile;
  }
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

  async getWalletAddr(walletName: string): Promise<string> {
    const privAccountDir = `${this.options.dir}/priv/wallet/${walletName}`;
    const outPaymentAddrFile = `${privAccountDir}/${walletName}.payment.addr`;

    const walletAddr = (
      await fs.readFile(outPaymentAddrFile, { encoding: "utf-8" })
    ).toString();

    return walletAddr;
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
    options: Omit<TransactionOptions, "cliPath" | "dir" | "network">
  ): Transaction {
    return new Transaction({
      ...options,
      cliPath: this.getCliPath(),
      dir: this.options.dir,
      network: this.getNetwork(),
      socketPath: this.options.socketPath,
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
