export interface StrategySignal {
  direction: "buy" | "sell" | "hold";
  confidence: number;
  reason: string;
}

export function analyzePrices(prices: readonly number[]): StrategySignal {
  if (prices.length < 5 || prices.length > 100 || prices.some((price) => !Number.isFinite(price) || price <= 0)) {
    throw new Error("provide between 5 and 100 positive prices");
  }
  const latest = prices.at(-1)!;
  const reference = prices.slice(0, -1);
  const mean = reference.reduce((sum, price) => sum + price, 0) / reference.length;
  const variance = reference.reduce((sum, price) => sum + (price - mean) ** 2, 0) / reference.length;
  const deviation = Math.sqrt(variance);
  const zScore = deviation === 0 ? 0 : (latest - mean) / deviation;
  const direction = zScore <= -1.5 ? "buy" : zScore >= 1.5 ? "sell" : "hold";
  return { direction, confidence: Math.min(1, Math.abs(zScore) / 3), reason: `mean-reversion z-score ${zScore.toFixed(3)}` };
}
