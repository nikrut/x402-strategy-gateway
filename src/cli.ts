import { createServer } from "node:http";
import { FacilitatorPaymentService } from "./facilitator.js";
import { createGateway } from "./gateway.js";

const port = parsePort(process.env.PORT ?? "3402");
const publicOrigin = process.env.PUBLIC_ORIGIN ?? `http://127.0.0.1:${port}`;
const payTo = required("PAY_TO");
const asset = required("PAYMENT_ASSET");
const facilitatorUrl = required("FACILITATOR_URL");
const handler = createGateway({
  publicOrigin,
  payTo,
  asset,
  amount: process.env.PAYMENT_AMOUNT ?? "1000",
  paymentService: new FacilitatorPaymentService({ url: facilitatorUrl })
});

createServer((req, res) => void handler(req, res)).listen(port, "127.0.0.1", () => {
  console.log(`x402 strategy gateway listening on ${publicOrigin}`);
});

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function parsePort(raw: string): number {
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1 || value > 65_535) throw new Error("PORT is invalid");
  return value;
}
