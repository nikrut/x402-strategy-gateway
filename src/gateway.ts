import type { IncomingMessage, ServerResponse } from "node:http";
import { asAddress, createPaymentRequired, decodePaymentHeader, encodeHeader, matchesRequirements } from "./codec.js";
import { FixedWindowRateLimiter, ReplayGuard } from "./guards.js";
import { analyzePrices } from "./signal.js";
import { TARGET_NETWORK, type PaymentRequirements, type PaymentService } from "./types.js";

export interface GatewayConfig {
  publicOrigin: string;
  payTo: string;
  asset: string;
  amount: string;
  paymentService: PaymentService;
  maxTimeoutSeconds?: number;
  rateLimit?: number;
  rateWindowMs?: number;
}

export function createGateway(config: GatewayConfig) {
  const origin = validateOrigin(config.publicOrigin);
  if (!/^\d+$/.test(config.amount) || BigInt(config.amount) <= 0n) throw new Error("amount must be a positive atomic-unit integer");
  const timeout = config.maxTimeoutSeconds ?? 60;
  if (!Number.isSafeInteger(timeout) || timeout < 1 || timeout > 300) throw new Error("maxTimeoutSeconds must be between 1 and 300");
  const requirements: PaymentRequirements = {
    scheme: "exact",
    network: TARGET_NETWORK,
    amount: config.amount,
    asset: asAddress(config.asset, "asset"),
    payTo: asAddress(config.payTo, "payTo"),
    maxTimeoutSeconds: timeout
  };
  const replayGuard = new ReplayGuard();
  const limiter = new FixedWindowRateLimiter(config.rateLimit ?? 60, config.rateWindowMs ?? 60_000);

  return async function gateway(req: IncomingMessage, res: ServerResponse): Promise<void> {
    setSecurityHeaders(res);
    const client = req.socket.remoteAddress ?? "unknown";
    if (!limiter.allow(client)) return json(res, 429, { error: "rate limit exceeded" });
    if (req.method !== "GET") return json(res, 405, { error: "method not allowed" }, { allow: "GET" });

    const url = new URL(req.url ?? "/", origin);
    if (url.origin !== origin.origin || url.pathname !== "/v1/signal") return json(res, 404, { error: "not found" });
    let prices: number[];
    try {
      prices = parsePrices(url.searchParams.get("prices"));
      analyzePrices(prices);
    } catch (error) {
      return json(res, 400, { error: error instanceof Error ? error.message : "invalid prices" });
    }

    const resource = {
      url: new URL(`${url.pathname}${url.search}`, origin).toString(),
      description: "Explainable mean-reversion signal",
      mimeType: "application/json",
      serviceName: "Strategy Gateway",
      tags: ["agents", "strategy"]
    };
    const required = createPaymentRequired(resource, requirements);
    const signature = singleHeader(req.headers["payment-signature"]);
    if (!signature) return paymentRequired(res, required);

    let payload;
    try {
      payload = decodePaymentHeader(signature);
    } catch {
      return paymentRequired(res, { ...required, error: "invalid payment payload" });
    }
    if (!matchesRequirements(payload, requirements) || (payload.resource && payload.resource.url !== resource.url)) {
      return paymentRequired(res, { ...required, error: "payment does not match this resource" });
    }

    try {
      const verification = await config.paymentService.verify(payload, requirements);
      if (!verification.isValid) return paymentRequired(res, { ...required, error: "payment verification failed" });
      if (!replayGuard.claim(signature, Date.now() + timeout * 1_000)) {
        return paymentRequired(res, { ...required, error: "payment payload was already used" });
      }
      const settlement = await config.paymentService.settle(payload, requirements);
      if (!settlement.success) return json(res, 502, { error: "payment settlement did not complete" });
      return json(res, 200, { signal: analyzePrices(prices), observations: prices.length }, {
        "payment-response": encodeHeader(settlement)
      });
    } catch {
      return json(res, 502, { error: "payment service unavailable" });
    }
  };
}

function paymentRequired(res: ServerResponse, body: ReturnType<typeof createPaymentRequired>): void {
  json(res, 402, body, { "payment-required": encodeHeader(body) });
}

function parsePrices(raw: string | null): number[] {
  if (!raw || raw.length > 2_000) throw new Error("prices query is required and must be at most 2000 characters");
  return raw.split(",").map((value) => Number(value));
}

function singleHeader(value: string | string[] | undefined): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function validateOrigin(value: string): URL {
  const url = new URL(value);
  const local = url.protocol === "http:" && (url.hostname === "127.0.0.1" || url.hostname === "localhost");
  if (url.protocol !== "https:" && !local) throw new Error("public origin must use HTTPS (HTTP is allowed only for localhost)");
  if (url.username || url.password || url.search || url.hash || (url.pathname !== "/" && url.pathname !== "")) {
    throw new Error("public origin must contain only scheme, host, and optional port");
  }
  return url;
}

function setSecurityHeaders(res: ServerResponse): void {
  res.setHeader("cache-control", "no-store");
  res.setHeader("content-security-policy", "default-src 'none'; frame-ancestors 'none'");
  res.setHeader("x-content-type-options", "nosniff");
  res.setHeader("referrer-policy", "no-referrer");
}

function json(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}): void {
  for (const [name, value] of Object.entries(headers)) res.setHeader(name, value);
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}
