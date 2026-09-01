import { createServer, type Server } from "node:http";
import type { Address } from "viem";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { decodePaymentHeader, encodeHeader } from "../src/codec.js";
import { createGateway } from "../src/gateway.js";
import { TARGET_NETWORK, type PaymentPayload, type PaymentRequirements, type PaymentService } from "../src/types.js";

const payTo = "0x1111111111111111111111111111111111111111" as Address;
const asset = "0x2222222222222222222222222222222222222222" as Address;
const payer = "0x3333333333333333333333333333333333333333" as Address;

class MockPayments implements PaymentService {
  verifies = 0;
  settlements = 0;
  async verify() { this.verifies += 1; return { isValid: true, payer }; }
  async settle() {
    this.settlements += 1;
    return { success: true as const, transaction: `0x${"ab".repeat(32)}`, network: TARGET_NETWORK, payer };
  }
}

describe("x402 gateway", () => {
  let server: Server;
  let origin: string;
  let payments: MockPayments;

  beforeEach(async () => {
    payments = new MockPayments();
    server = createServer();
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("test server did not bind");
    origin = `http://127.0.0.1:${address.port}`;
    const handler = createGateway({ publicOrigin: origin, payTo, asset, amount: "1000", paymentService: payments });
    server.on("request", (req, res) => void handler(req, res));
  });

  afterEach(async () => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));

  it("returns x402 v2 requirements in the PAYMENT-REQUIRED header", async () => {
    const response = await fetch(`${origin}/v1/signal?prices=100,101,99,100,90`);
    expect(response.status).toBe(402);
    const encoded = response.headers.get("payment-required")!;
    const required = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
    expect(required.x402Version).toBe(2);
    expect(required.accepts[0]).toMatchObject({ network: TARGET_NETWORK, amount: "1000", payTo, asset });
  });

  it("settles once, returns a signal, and rejects replay", async () => {
    const url = `${origin}/v1/signal?prices=100,101,99,100,90`;
    const unpaid = await fetch(url);
    const required = JSON.parse(Buffer.from(unpaid.headers.get("payment-required")!, "base64").toString("utf8"));
    const payload: PaymentPayload = { x402Version: 2, accepted: required.accepts[0], payload: { testAuthorization: "fixture-1" } };
    const header = encodeHeader(payload);

    const paid = await fetch(url, { headers: { "payment-signature": header } });
    expect(paid.status).toBe(200);
    expect(await paid.json()).toMatchObject({ signal: { direction: "buy" }, observations: 5 });
    expect(paid.headers.get("payment-response")).toBeTruthy();
    expect(payments.verifies).toBe(1);
    expect(payments.settlements).toBe(1);

    const replay = await fetch(url, { headers: { "payment-signature": header } });
    expect(replay.status).toBe(402);
    expect(payments.settlements).toBe(1);
  });

  it("rejects requirement substitution before calling the payment service", async () => {
    const accepted: PaymentRequirements = {
      scheme: "exact", network: TARGET_NETWORK, amount: "1", asset, payTo, maxTimeoutSeconds: 60
    };
    const payload: PaymentPayload = { x402Version: 2, accepted, payload: {} };
    const response = await fetch(`${origin}/v1/signal?prices=100,101,99,100,90`, {
      headers: { "payment-signature": encodeHeader(payload) }
    });
    expect(response.status).toBe(402);
    expect(payments.verifies).toBe(0);
  });

  it("validates the resource before requesting payment", async () => {
    const response = await fetch(`${origin}/v1/signal?prices=100,101`);
    expect(response.status).toBe(400);
    expect(response.headers.get("payment-required")).toBeNull();
  });
});
