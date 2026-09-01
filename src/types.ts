import type { Address } from "viem";

export const X402_VERSION = 2 as const;
export const TARGET_NETWORK = "eip155:84532" as const;

export interface ResourceInfo {
  url: string;
  description?: string;
  mimeType?: string;
  serviceName?: string;
  tags?: string[];
}

export interface PaymentRequirements {
  scheme: "exact";
  network: typeof TARGET_NETWORK;
  amount: string;
  asset: Address;
  payTo: Address;
  maxTimeoutSeconds: number;
  extra?: Record<string, unknown>;
}

export interface PaymentRequired {
  x402Version: typeof X402_VERSION;
  error?: string;
  resource: ResourceInfo;
  accepts: PaymentRequirements[];
  extensions?: Record<string, unknown>;
}

export interface PaymentPayload {
  x402Version: typeof X402_VERSION;
  resource?: ResourceInfo;
  accepted: PaymentRequirements;
  payload: unknown;
  extensions?: Record<string, unknown>;
}

export interface VerifyResponse {
  isValid: boolean;
  invalidReason?: string;
  payer?: Address;
}

export interface SettlementResponse {
  success: boolean;
  transaction: string;
  network: typeof TARGET_NETWORK;
  payer: Address;
  errorReason?: string;
}

export interface PaymentService {
  verify(payload: PaymentPayload, requirements: PaymentRequirements): Promise<VerifyResponse>;
  settle(payload: PaymentPayload, requirements: PaymentRequirements): Promise<SettlementResponse>;
}
