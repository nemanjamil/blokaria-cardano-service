import { execSync } from "child_process";
import fs from "fs/promises";
import fsSync from "fs";
import { v4 } from "uuid";
import path from "path";

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

  async writeString(content: string) {
    await fs.writeFile(this.getPath(), content, {
      encoding: "utf-8",
    });
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
  walletAddress: string;
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

  async setMetadata(metadata: Record<string, any>) {
    console.log("[CARDANO_API] Found metadata:", metadata);
    const metadataFile = new TxFile("-metadata.json");
    console.log(
      `[CARDANO_API] Writing metadata json to '${metadataFile.getPath()}'`
    );
    metadataFile.writeString(JSON.stringify(metadata));
    this.metadata = metadataFile;
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
    const outPaymentKeyFile = `${privAccountDir}/payment.skey`;
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
    this.metadata = null;
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

    const metadataFile = this.metadata;

    const changeAddress = this.options.walletAddress;

    const command = `${this.getCliPath()} transaction build --tx-in ${txIn} --tx-out "${txOut}+${
      this.amount
    }" --invalid-hereafter ${invalidHereAfter} --invalid-before ${invalidBefore} --change-address ${changeAddress} --${this.getNetwork()}${
      metadataFile ? ` --metadata-json-file ${metadataFile.getPath()}` : ""
    } --socket-path ${this.getSocketPath()} --out-file ${outFile.getPath()}`;
    console.log("[CARDANO_API] Build smart tx command:", command);
    const output = execSync(command).toString("utf-8");
    console.log("[CARDANO_API] Build smart tx output:", output);

    return outFile;
  }

  async sign(txFile: TxFile): Promise<TxFile> {
    const signedFile = new TxFile(".signed");
    const paymentKeyPath = this.getWalletPaymentKeyPath();
    const command = `${this.getCliPath()} transaction sign --tx-body-file ${txFile.getPath()} --signing-key-file ${paymentKeyPath} --${this.getNetwork()} --out-file ${signedFile.getPath()}`;
    console.log("[CARDANO_API] Sign tx command:", command);
    const output = execSync(command);
    console.log("[CARDANO_API] Sign tx output:", output.toString("utf-8"));
    await txFile.unload();
    return signedFile;
  }

  async submit(txFile: TxFile): Promise<string> {
    const txId = this.getTransactionId(txFile);
    const command = `${this.getCliPath()} transaction submit --tx-file ${txFile.getPath()} --${this.getNetwork()} --socket-path ${this.getSocketPath()}`;
    console.log("[CARDANO_API] Submit tx command:", command);
    const output = execSync(command);
    console.log("[CARDANO_API] Submit tx output:", output.toString("utf-8"));
    await txFile.unload();
    if (this.metadata) {
      await this.metadata.unload();
    }

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

  private genWalletPaymentKeys(walletDir: string) {
    const paymentVkey = path.join(walletDir, `payment.vkey`);
    const paymentSkey = path.join(walletDir, `payment.skey`);
    const command = `${this.getCliPath()} address key-gen --verification-key-file ${paymentVkey} --signing-key-file ${paymentSkey}`;
    console.log("[CARDANO_API] Key gen wallet payment command:", command);
    const output = execSync(command).toString("utf-8");
    console.log("[CARDANO_API] Key gen wallet payment command:", output);
  }

  private genWalletStakeKeys(walletDir: string) {
    const stakeVkey = path.join(walletDir, `stake.vkey`);
    const stakeSkey = path.join(walletDir, `stake.skey`);
    const command = `${this.getCliPath()} stake-address key-gen --verification-key-file ${stakeVkey} --signing-key-file ${stakeSkey}`;
    console.log("[CARDANO_API] Key gen wallet stake command:", command);
    const output = execSync(command).toString("utf-8");
    console.log("[CARDANO_API] Key gen wallet stake command:", output);
  }

  private buildWalletShelleyAddr(walletDir: string, outFilePath: string) {
    const paymentVkey = path.join(walletDir, `payment.vkey`);
    const stakeVkey = path.join(walletDir, `stake.vkey`);
    const paymentScriptFile = path.join(walletDir, "payment.script");
    if (
      !fsSync.existsSync(paymentVkey) &&
      fsSync.existsSync(stakeVkey) &&
      fsSync.existsSync(paymentScriptFile)
    ) {
      const command = `${this.getCliPath()} address build --payment-script-file ${paymentScriptFile} --stake-verification-key-file ${stakeVkey} --out-file ${outFilePath} --${this.getNetwork()}`;
      console.log(
        "[CARDANO_API] Generate wallet address using payment script file cmd:",
        command
      );
      const output = execSync(command).toString("utf-8");
      console.log(
        "[CARDANO_API] Generate wallet address using payment script file output:",
        output
      );
    }
    if (!fsSync.existsSync(paymentVkey)) {
      this.genWalletPaymentKeys(walletDir);
    }
    if (!fsSync.existsSync(stakeVkey)) {
      this.genWalletStakeKeys(walletDir);
    }

    const command = `${this.getCliPath()} address build --payment-verification-key-file ${paymentVkey} --stake-verification-key-file ${stakeVkey} --out-file ${outFilePath} --${this.getNetwork()}`;
    console.log("[CARDANO_API] Build wallet shelley addr command:", command);
    const output = execSync(command).toString("utf-8");
    console.log("[CARDANO_API] Build wallet shelley addr output:", output);
  }

  async getWalletAddr(walletName: string): Promise<string> {
    const privAccountDir = `${this.options.dir}/priv/wallet/${walletName}`;
    const outPaymentAddrFile = `${privAccountDir}/base.addr`;

    if (!fsSync.existsSync(outPaymentAddrFile)) {
      this.buildWalletShelleyAddr(privAccountDir, outPaymentAddrFile);
    }

    const walletAddr = (
      await fs.readFile(outPaymentAddrFile, { encoding: "utf-8" })
    )
      .toString()
      .trim()
      .replace(/(\r\n|\r|\n)*/gm, "");

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
    options: Omit<
      TransactionOptions,
      "cliPath" | "dir" | "network" | "socketPath"
    >
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
