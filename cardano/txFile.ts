import fs from "fs/promises";
import { v4 } from "uuid";

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
