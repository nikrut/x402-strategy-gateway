import { describe, expect, it } from "vitest";
import { decodePaymentHeader, encodeHeader } from "../src/codec.js";

describe("payment header codec", () => {
  it("round-trips a bounded JSON payload", () => {
    const value = { x402Version: 2, accepted: {}, payload: { nonce: "fixture" } };
    expect(decodePaymentHeader(encodeHeader(value)).payload).toEqual({ nonce: "fixture" });
  });

  it("rejects malformed and oversized headers", () => {
    expect(() => decodePaymentHeader("not base64!" )).toThrow("valid base64");
    expect(() => decodePaymentHeader("A".repeat(16_388))).toThrow("too large");
  });
});
