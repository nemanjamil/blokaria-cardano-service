import { execSync } from "child_process";
import { TxFile } from "./txFile";
import { Wallet } from "./wallet";

export interface TransactionOptions {
  cliPath: string;
  network: string;
  txIn: string;
  txOut: string;
  walletAddress: string;
  amount: number;
  dir: string;
  socketPath: string;
  metadata?: Record<string, any>;
}

export class Transaction {
  private readonly cliPath: string;
  private readonly network: string;
  private readonly options: TransactionOptions;
  private readonly wallet: Wallet;
  private amount: number;
  private metadata?: TxFile;

  constructor(wallet: Wallet, options: TransactionOptions) {
    this.cliPath = options.cliPath;
    this.network = options.network;
    this.amount = options.amount;
    this.options = options;
    this.wallet = wallet;
    this.metadata = null;
  }

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

  private getSocketPath(): string {
    return this.options.socketPath;
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
    const paymentKeyPath = this.wallet.getPaymentKeyPath();
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
