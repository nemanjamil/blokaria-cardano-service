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
      era: options.era,
    });
    this.assetOptions = {
      assetName: options.assetName,
      policyId: options.policyId,
    };
  }

  calculateMinRequiredAmount() {
    const txOut = this.options.txOut;
    const assetName = this.assetOptions.assetName;

    //cardano-cli transaction calculate-min-value --protocol-params-file protocol.json --tx-out "addr_test1qr8ptk4k8u52tgnyqq4s508zj9skjkvxa7escmnwrumz9mwmfhncrtfdavpsru93j4cgz0rhe9d6ergx4etkr39sl86scy2nrq+1 ea280504857939ef226ee482c08857935d7147fdd71ad1a1ab289321.54657374203537"
    const protocolFile = this.getProtocolParams();
    const command = `${this.getCliPath()} transaction calculate-min-value --protocol-params-file ${protocolFile.getPath()} --tx-out "${txOut}+${
      this.amount
    } ${this.assetOptions.policyId}.${assetName}"`;
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
    const invalidHereAfter = this.getQueryTip().slot + 10000;
    const invalidBefore = 0;
    const outFile = new TxFile(".raw");

    const metadataFile = this.metadata;

    const changeAddress = this.changeAddress;

    const amountToSend = this.calculateMinRequiredAmount();

    const txInParam = Array.isArray(txIn)
      ? txIn.map((tx) => `--tx-in ${tx}`).join(" ")
      : `--tx-in ${txIn}`;

    const { policyId, assetName } = this.assetOptions;

    const command = `${this.getCliPath()} transaction build ${txInParam} --tx-out ${txOut}+${amountToSend}+"1 ${policyId}.${assetName}" --invalid-hereafter ${invalidHereAfter} --invalid-before ${invalidBefore} --change-address ${changeAddress} --${this.getNetwork()}${
      metadataFile ? ` --metadata-json-file ${metadataFile.getPath()}` : ""
    } --socket-path ${this.getSocketPath()} --out-file ${outFile.getPath()}`;
    console.log("[CARDANO_API] Build smart tx command:", command);
    const output = execSync(command).toString("utf-8");
    console.log("[CARDANO_API] Build smart tx output:", output);

    return outFile;
  }
}
