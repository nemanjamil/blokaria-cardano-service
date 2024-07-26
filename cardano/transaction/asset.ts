import { execSync } from "child_process";
import { TransactionOptions } from ".";
import { TxFile } from "../txFile";
import { Wallet } from "../wallet";
import { SimpleTransaction } from "./simple";

export interface AssetTransactionOptions {
  policyId: string;
  assetName: string;
}

export type ExtendedAssetTransactionOptions = AssetTransactionOptions &
  TransactionOptions;

export class AssetTransaction extends SimpleTransaction {
  private readonly assetOptions: AssetTransactionOptions;

  constructor(
    wallet: Wallet,
    changeAddress: string,
    options: ExtendedAssetTransactionOptions
  ) {
    super(wallet, changeAddress, {
      amount: options.amount,
      cliPath: options.cliPath,
      dir: options.dir,
      network: options.network,
      socketPath: options.socketPath,
      txIn: options.txIn,
      txOut: options.txOut,
    });
    this.assetOptions = {
      assetName: options.assetName,
      policyId: options.policyId,
    };
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

    const { policyId, assetName } = this.assetOptions;

    const command = `${this.getCliPath()} transaction build ${txInParam} --tx-out ${txOut}+${
      this.amount
    }+"1 ${policyId}.${assetName}" --invalid-hereafter ${invalidHereAfter} --invalid-before ${invalidBefore} --change-address ${changeAddress} --${this.getNetwork()}${
      metadataFile ? ` --metadata-json-file ${metadataFile.getPath()}` : ""
    } --socket-path ${this.getSocketPath()} --out-file ${outFile.getPath()}`;
    console.log("[CARDANO_API] Build smart tx command:", command);
    const output = execSync(command).toString("utf-8");
    console.log("[CARDANO_API] Build smart tx output:", output);

    return outFile;
  }
}
