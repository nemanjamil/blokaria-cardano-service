import { execSync } from "child_process";
import { Transaction, TransactionOptions } from ".";
import { TxFile } from "../txFile";
import { Wallet } from "../wallet";

export class SimpleTransaction extends Transaction {
  protected readonly changeAddress: string;

  constructor(
    wallet: Wallet,
    changeAddress: string,
    options: TransactionOptions
  ) {
    super(wallet, options);
    this.changeAddress = changeAddress;
  }

  build(): TxFile {
    const txIn = this.options.txIn;
    const txOut = this.options.txOut;
    const invalidHereAfter = this.getQueryTip().slot + 10000;
    const invalidBefore = 0;
    const outFile = new TxFile(".raw");

    const metadataFile = this.metadata;

    const changeAddress = this.changeAddress;

    const txInParam = Array.isArray(txIn)
      ? txIn.map((tx) => `--tx-in ${tx}`).join(" ")
      : `--tx-in ${txIn}`;

    const command = `${this.getCliPath()} ${this.getEra()} transaction build ${txInParam} --tx-out "${txOut}+${
      this.amount
    }" --invalid-hereafter ${invalidHereAfter} --invalid-before ${invalidBefore} --change-address ${changeAddress} --${this.getNetwork()}${
      metadataFile ? ` --metadata-json-file ${metadataFile.getPath()}` : ""
    } --socket-path ${this.getSocketPath()} --out-file ${outFile.getPath()}`;
    console.log("[CARDANO_API] Build smart tx command:", command);
    const output = execSync(command).toString("utf-8");
    console.log("[CARDANO_API] Build smart tx output:", output);

    return outFile;
  }
}
