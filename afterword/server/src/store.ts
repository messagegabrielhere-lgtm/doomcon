import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Account } from "./types.js";

// Minimal JSON-file store: one file per account.
// Fine for a single small server; swap for a real database (with encryption at
// rest) before you hold anyone's life story in production.

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export function newToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** Human-typable access code, e.g. "K7QM-3XRP-9WTD-HF2A". No 0/O/1/I. */
export function newAccessCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const raw = randomBytes(16);
  const chars = Array.from(raw, (b) => alphabet[b % alphabet.length]);
  return [0, 4, 8, 12].map((i) => chars.slice(i, i + 4).join("")).join("-");
}

export function normalizeAccessCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/(.{4})(?=.)/g, "$1-");
}

export class Store {
  constructor(private dir: string) {}

  async init() {
    await mkdir(path.join(this.dir, "accounts"), { recursive: true });
  }

  private file(id: string) {
    if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error("bad account id");
    return path.join(this.dir, "accounts", `${id}.json`);
  }

  async get(id: string): Promise<Account | undefined> {
    try {
      return JSON.parse(await readFile(this.file(id), "utf8")) as Account;
    } catch (e: any) {
      if (e.code === "ENOENT") return undefined;
      throw e;
    }
  }

  async put(account: Account) {
    const target = this.file(account.id);
    const tmp = `${target}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(account), { mode: 0o600 });
    await rename(tmp, target);
  }

  async delete(id: string) {
    await rm(this.file(id), { force: true });
  }

  async all(): Promise<Account[]> {
    const names = await readdir(path.join(this.dir, "accounts"));
    const out: Account[] = [];
    for (const n of names) {
      if (!n.endsWith(".json")) continue;
      const a = await this.get(n.slice(0, -5));
      if (a) out.push(a);
    }
    return out;
  }

  async findByOwnerToken(token: string) {
    const [id] = token.split(".", 1);
    const account = id ? await this.get(id) : undefined;
    return account && account.ownerTokenHash === sha256(token) ? account : undefined;
  }

  async findByExecutorToken(token: string) {
    const [id] = token.split(".", 1);
    const account = id ? await this.get(id) : undefined;
    return account?.executorTokenHash && account.executorTokenHash === sha256(token)
      ? account
      : undefined;
  }

  /** Access codes carry no account id, so they're resolved by scanning. */
  async findByAccessCode(code: string) {
    const hash = sha256(normalizeAccessCode(code));
    for (const account of await this.all()) {
      const beneficiaryId = account.accessCodes[hash];
      if (account.status === "released" && beneficiaryId) return { account, beneficiaryId };
    }
    return undefined;
  }
}
