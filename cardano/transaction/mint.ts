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

  private getAssetName(): string {
    return Buffer.from(this.mintOptions.assetName).toString("hex");
  }

  calculateMinRequiredAmount() {
    const txOut = this.options.txOut;
    const assetName = this.getAssetName();

    //cardano-cli transaction calculate-min-value --protocol-params-file protocol.json --tx-out "addr_test1qr8ptk4k8u52tgnyqq4s508zj9skjkvxa7escmnwrumz9mwmfhncrtfdavpsru93j4cgz0rhe9d6ergx4etkr39sl86scy2nrq+1 ea280504857939ef226ee482c08857935d7147fdd71ad1a1ab289321.54657374203537"
    const protocolFile = this.getProtocolParams();
    const command = `${this.getCliPath()} transaction calculate-min-value --protocol-params-file ${protocolFile.getPath()} --tx-out "${txOut}+${
      this.amount
    } ${this.mintOptions.policyId}.${assetName}"`;
    console.log(
      "[CARDANO_API] Get minimum amount to send (mint) command:",
      command
    );
    const output = execSync(command).toString("utf-8");
    console.log(
      "[CARDANO_API] Get minimum amount to send (mint) output:",
      output
    );
    const amount = Number(output.replace(/\D*/gim, "")) + 10_000;
    return amount;
  }

  build(): TxFile {
    const txIn = this.options.txIn;
    const txOut = this.options.txOut;
    const invalidHereAfter = this.getQueryTip().slot + 10_000;
    const invalidBefore = 0;

    const outFile = new TxFile(".txn");

    const metadataFile = this.metadata;

    const assetName = this.getAssetName();

    const amountToSend = this.calculateMinRequiredAmount();

    const command = `${this.getCliPath()} transaction build --tx-in ${txIn} --tx-out "${txOut}+${amountToSend}+${
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
