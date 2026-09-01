import { getAddress } from "viem";
import { TARGET_NETWORK, type PaymentPayload, type PaymentRequirements, type PaymentService, type SettlementResponse, type VerifyResponse } from "./types.js";

export interface FacilitatorOptions {
  url: string;
  timeoutMs?: number;
}

export class FacilitatorPaymentService implements PaymentService {
  readonly #origin: URL;
  readonly #timeoutMs: number;

  constructor(options: FacilitatorOptions) {
    this.#origin = validateFacilitatorUrl(options.url);
    this.#timeoutMs = options.timeoutMs ?? 5_000;
    if (!Number.isSafeInteger(this.#timeoutMs) || this.#timeoutMs < 100 || this.#timeoutMs > 30_000) {
      throw new Error("facilitator timeout must be between 100 and 30000 ms");
    }
  }

  async verify(payload: PaymentPayload, requirements: PaymentRequirements): Promise<VerifyResponse> {
    const data = await this.#post("verify", { paymentPayload: payload, paymentRequirements: requirements });
    if (typeof data.isValid !== "boolean") throw new Error("facilitator returned an invalid verify response");
    if (data.payer !== undefined && typeof data.payer !== "string") throw new Error("facilitator returned an invalid payer");
    if (typeof data.payer === "string") getAddress(data.payer);
    return data as unknown as VerifyResponse;
  }

  async settle(payload: PaymentPayload, requirements: PaymentRequirements): Promise<SettlementResponse> {
    const data = await this.#post("settle", { paymentPayload: payload, paymentRequirements: requirements });
    if (typeof data.success !== "boolean" || data.network !== TARGET_NETWORK || typeof data.transaction !== "string" ||
      !/^0x[a-fA-F0-9]{64}$/.test(data.transaction) || typeof data.payer !== "string") {
      throw new Error("facilitator returned an invalid settlement response");
    }
    getAddress(data.payer);
    return data as unknown as SettlementResponse;
  }

  async #post(path: string, body: unknown): Promise<Record<string, unknown>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.#timeoutMs);
    try {
      const response = await fetch(new URL(path, this.#origin), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        redirect: "error",
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`facilitator request failed with status ${response.status}`);
      const text = await response.text();
      if (Buffer.byteLength(text, "utf8") > 65_536) throw new Error("facilitator response is too large");
      const data: unknown = JSON.parse(text);
      if (typeof data !== "object" || data === null || Array.isArray(data)) throw new Error("facilitator returned invalid JSON");
      return data as Record<string, unknown>;
    } finally {
      clearTimeout(timer);
    }
  }
}

function validateFacilitatorUrl(value: string): URL {
  const url = new URL(value);
  const local = url.protocol === "http:" && (url.hostname === "127.0.0.1" || url.hostname === "localhost");
  if (url.protocol !== "https:" && !local) throw new Error("facilitator URL must use HTTPS (HTTP is allowed only for localhost)");
  if (url.username || url.password || url.search || url.hash) throw new Error("facilitator URL must not contain credentials, query, or fragment");
  if (!url.pathname.endsWith("/")) url.pathname += "/";
  return url;
}
