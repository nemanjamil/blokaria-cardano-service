import { execSync } from "child_process";
import { TxFile } from "../txFile";
import { Wallet } from "../wallet";

export interface TransactionOptions {
  cliPath: string;
  network: string;
  txIn: string;
  txOut: string;
  amount: number;
  dir: string;
  socketPath: string;
}

export abstract class Transaction {
  protected readonly cliPath: string;
  protected readonly network: string;
  protected readonly options: TransactionOptions;
  protected readonly wallet: Wallet;
  protected readonly amount: number;

  protected metadata?: TxFile;

  constructor(wallet: Wallet, options: TransactionOptions) {
    this.cliPath = options.cliPath;
    this.network = options.network;
    this.amount = options.amount;
    this.options = options;
    this.wallet = wallet;
    this.metadata = null;
  }

  protected getCliPath(): string {
    return this.cliPath;
  }

  protected getNetwork(): string {
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

  protected getProtocolParams() {
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

  protected getQueryTip(): Record<string, any> {
    const command = `${this.getCliPath()} query tip --${this.getNetwork()} --socket-path ${this.getSocketPath()}`;
    console.log(`[CARDANO_API] Get query tip command:`, command);
    const output = execSync(command).toString("utf-8");
    console.log("[CARDANO_API] Get query tip output:", output);
    return JSON.parse(output);
  }

  protected getSocketPath(): string {
    return this.options.socketPath;
  }

  abstract build(): TxFile;

  async sign(txFile: TxFile): Promise<TxFile> {
    const signedFile = new TxFile(".signed");
    const paymentKeyPath = this.wallet.getPaymentSKeyPath();
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

  protected getTransactionId(txSigned: TxFile): string {
    const command = `${this.getCliPath()} transaction txid --tx-file ${txSigned.getPath()}`;
    console.log("[CARDANO_API] Get txid command:", command);
    const output = execSync(command).toString("utf-8");
    console.log("[CARDANO_API] Get txid output:", output);
    const txId = output.trim().replace(/(\r\n|\n|\r)/gm, "");
    console.log(`[CARDANO_API] Get txid hash is '${txId}'`);
    return txId;
  }
}

export { SimpleTransaction } from "./simple";
export { MintTransaction, MintTransactionOptions } from "./mint";
