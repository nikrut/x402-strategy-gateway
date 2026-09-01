import { describe, expect, it } from "vitest";
import { FacilitatorPaymentService } from "../src/facilitator.js";

describe("facilitator client", () => {
  it("requires TLS outside localhost", () => {
    expect(() => new FacilitatorPaymentService({ url: "http://example.com" })).toThrow("HTTPS");
    expect(() => new FacilitatorPaymentService({ url: "http://127.0.0.1:3402" })).not.toThrow();
  });

  it("rejects credential-bearing URLs and unsafe timeouts", () => {
    expect(() => new FacilitatorPaymentService({ url: "https://user:pass@example.com" })).toThrow("credentials");
    expect(() => new FacilitatorPaymentService({ url: "https://example.com", timeoutMs: 31_000 })).toThrow("timeout");
  });
});
