import { describe, expect, it } from "vitest";
import { analyzePrices } from "../src/signal.js";

describe("signal resource", () => {
  it("returns explainable deterministic directions", () => {
    expect(analyzePrices([100, 101, 99, 100, 90]).direction).toBe("buy");
    expect(analyzePrices([100, 101, 99, 100, 112]).direction).toBe("sell");
    expect(analyzePrices([100, 101, 99, 100, 100]).direction).toBe("hold");
  });
});
