import { execSync } from "child_process";
import fsSync from "fs";
import fs from "fs/promises";
import path from "path";

export interface WalletOptions {
  dir: string;
  cliPath: string;
  network: string;
}

export class Wallet {
  private readonly name: string;
  private readonly options: WalletOptions;

  constructor(name: string, options: WalletOptions) {
    this.name = name;
    this.options = options;
  }

  private getCliPath(): string {
    return this.options.cliPath;
  }

  private getNetwork(): string {
    return this.options.network;
  }

  getPaymentSKeyPath(): string {
    console.log("[CARDANO_API] Get wallet payment key path start");
    const privAccountDir = `${this.options.dir}/priv/wallet/${this.name}`;
    const outPaymentKeyFile = `${privAccountDir}/payment.skey`;
    console.log(
      `[CARDANO_API] Get wallet payment skey path is '${outPaymentKeyFile}'`
    );

    return outPaymentKeyFile;
  }

  getPaymentVKeyPath(): string {
    console.log("[CARDANO_API] Get wallet payment key path start");
    const privAccountDir = `${this.options.dir}/priv/wallet/${this.name}`;
    const outPaymentKeyFile = `${privAccountDir}/payment.vkey`;
    console.log(
      `[CARDANO_API] Get wallet payment vkey path is '${outPaymentKeyFile}'`
    );

    return outPaymentKeyFile;
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

  private getWalletDir(): string {
    return `${this.options.dir}/priv/wallet/${this.name}`;
  }

  getAddressKeyHash(vFileName: string = "payment.vkey"): string {
    const vkeyPath = path.join(this.getWalletDir(), vFileName);
    const command = `${this.getCliPath()} address key-hash --payment-verification-key ${vkeyPath}`;
    console.log("[CARDANO_API] Get wallet address key hash:", command);
    const output = execSync(command).toString("utf-8");
    console.log("[CARDANO_API] Build wallet shelley addr output:", output);
    const keyHash = output.trim().replace(/(\r\n|\n|\r)*/gm, "");
    return keyHash;
  }

  async getAddress(): Promise<string> {
    const privAccountDir = `${this.options.dir}/priv/wallet/${this.name}`;
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
}
