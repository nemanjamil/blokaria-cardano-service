import { execSync } from "child_process";
import { Transaction, TransactionOptions } from ".";
import { TxFile } from "../txFile";
import { Wallet } from "../wallet";

export interface MintTransactionOptions {
  policyId: string;
  assetName: string;
  policyScript: TxFile;
  changeAddress: string;
}

export class MintTransaction extends Transaction {
  private readonly mintOptions: MintTransactionOptions;

  constructor(
    wallet: Wallet,
    mintOptions: MintTransactionOptions,
    options: TransactionOptions
  ) {
    super(wallet, options);
    this.mintOptions = mintOptions;
  }

  build(): TxFile {
    const txIn = this.options.txIn;
    const txOut = this.options.txOut;
    const invalidHereAfter = this.getQueryTip().slot + 10000;
    const invalidBefore = 0;

    const outFile = new TxFile(".txn");

    const metadataFile = this.metadata;

    const assetName = Buffer.from(this.mintOptions.assetName).toString("hex");

    const command = `${this.getCliPath()} transaction build --tx-in ${txIn} --tx-out "${txOut}+${
      this.amount
    } ${this.mintOptions.policyId}.${assetName}" --change-address ${
      this.mintOptions.changeAddress
    } --mint="${this.amount} ${
      this.mintOptions.policyId
    }.${assetName}" --minting-script-file ${this.mintOptions.policyScript.getPath()} --invalid-hereafter ${invalidHereAfter} --invalid-before ${invalidBefore} --${this.getNetwork()}${
      metadataFile ? ` --metadata-json-file ${metadataFile.getPath()}` : ""
    } --socket-path ${this.getSocketPath()} --out-file ${outFile.getPath()}`;
    console.log("[CARDANO_API] Build smart tx command:", command);
    const output = execSync(command).toString("utf-8");
    console.log("[CARDANO_API] Build smart tx output:", output);

    return outFile;
  }
}
