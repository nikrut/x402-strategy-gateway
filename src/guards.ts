import { createHash } from "node:crypto";

export class ReplayGuard {
  readonly #entries = new Map<string, number>();
  constructor(private readonly maxEntries = 10_000) {}

  claim(paymentHeader: string, expiresAt: number): boolean {
    const now = Date.now();
    for (const [key, expiry] of this.#entries) if (expiry <= now) this.#entries.delete(key);
    const key = createHash("sha256").update(paymentHeader).digest("hex");
    if (this.#entries.has(key)) return false;
    if (this.#entries.size >= this.maxEntries) this.#entries.delete(this.#entries.keys().next().value!);
    this.#entries.set(key, expiresAt);
    return true;
  }
}

export class FixedWindowRateLimiter {
  readonly #entries = new Map<string, { count: number; resetAt: number }>();
  constructor(private readonly limit: number, private readonly windowMs: number, private readonly maxClients = 10_000) {
    if (!Number.isSafeInteger(limit) || limit <= 0 || !Number.isSafeInteger(windowMs) || windowMs <= 0) {
      throw new Error("rate-limit configuration must use positive integers");
    }
  }

  allow(client: string, now = Date.now()): boolean {
    let entry = this.#entries.get(client);
    if (!entry || entry.resetAt <= now) {
      if (!entry && this.#entries.size >= this.maxClients) this.#entries.delete(this.#entries.keys().next().value!);
      entry = { count: 0, resetAt: now + this.windowMs };
      this.#entries.set(client, entry);
    }
    entry.count += 1;
    return entry.count <= this.limit;
  }
}
