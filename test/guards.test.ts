import { describe, expect, it } from "vitest";
import { FixedWindowRateLimiter, ReplayGuard } from "../src/guards.js";

describe("bounded in-memory guards", () => {
  it("blocks duplicate payment claims", () => {
    const guard = new ReplayGuard(2);
    expect(guard.claim("payment-a", Date.now() + 10_000)).toBe(true);
    expect(guard.claim("payment-a", Date.now() + 10_000)).toBe(false);
  });

  it("enforces a fixed request window", () => {
    const limiter = new FixedWindowRateLimiter(2, 1_000);
    expect(limiter.allow("client", 0)).toBe(true);
    expect(limiter.allow("client", 1)).toBe(true);
    expect(limiter.allow("client", 2)).toBe(false);
    expect(limiter.allow("client", 1_001)).toBe(true);
  });
});
