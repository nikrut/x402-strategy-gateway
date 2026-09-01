import { getAddress, type Address } from "viem";
import { TARGET_NETWORK, X402_VERSION, type PaymentPayload, type PaymentRequired, type PaymentRequirements } from "./types.js";

const MAX_HEADER_BYTES = 16_384;

export function encodeHeader(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64");
}

export function decodePaymentHeader(header: string): PaymentPayload {
  if (Buffer.byteLength(header, "ascii") > MAX_HEADER_BYTES) throw new Error("payment header is too large");
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(header) || header.length % 4 !== 0) throw new Error("payment header is not valid base64");
  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(header, "base64").toString("utf8"));
  } catch {
    throw new Error("payment header is not valid JSON");
  }
  if (!isRecord(decoded) || decoded.x402Version !== X402_VERSION || !isRecord(decoded.accepted) || !("payload" in decoded)) {
    throw new Error("payment payload does not match x402 v2");
  }
  return decoded as unknown as PaymentPayload;
}

export function matchesRequirements(payload: PaymentPayload, expected: PaymentRequirements): boolean {
  const actual = payload.accepted;
  try {
    return actual.scheme === expected.scheme && actual.network === TARGET_NETWORK && actual.amount === expected.amount &&
      getAddress(actual.asset) === getAddress(expected.asset) && getAddress(actual.payTo) === getAddress(expected.payTo) &&
      actual.maxTimeoutSeconds === expected.maxTimeoutSeconds;
  } catch {
    return false;
  }
}

export function createPaymentRequired(resource: PaymentRequired["resource"], requirements: PaymentRequirements): PaymentRequired {
  return { x402Version: X402_VERSION, resource, accepts: [requirements] };
}

export function asAddress(value: string, label: string): Address {
  try {
    return getAddress(value);
  } catch {
    throw new Error(`${label} must be a valid EVM address`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
