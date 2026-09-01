# x402 Strategy Gateway

A small x402 v2 resource server that sells explainable strategy signals per request on a Sepolia L2. The target network is expressed in the protocol-native CAIP-2 form: `eip155:84532`.

The MVP implements the current v2 HTTP flow:

1. An unpaid request receives HTTP `402` plus a base64-encoded `PAYMENT-REQUIRED` header.
2. The client retries with a `PAYMENT-SIGNATURE` header.
3. The gateway checks that the signed payload exactly matches its price, asset, recipient, network, and timeout.
4. A configured facilitator verifies and settles the authorization.
5. The response contains the signal and a `PAYMENT-RESPONSE` settlement header.

Protocol reference: [x402 v2 specification](https://github.com/x402-foundation/x402/blob/main/specs/x402-specification-v2.md).

## Why it is useful

- Demonstrates agent-to-API micropayment negotiation with plain HTTP.
- Provides a real paid resource: deterministic mean-reversion analysis over caller-supplied prices.
- Keeps wallet signing entirely client-side and stores no private keys.
- Makes the facilitator replaceable through a narrow `PaymentService` interface.
- Includes replay protection, rate limiting, strict payment-term matching, request bounds, secure headers, and facilitator timeouts.

## Quick start

Requires Node.js 22+ and pnpm.

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
cp .env.example .env
```

Export the values from `.env` in your preferred process manager, then:

```bash
pnpm dev
```

Request the resource:

```bash
curl -i 'http://127.0.0.1:3402/v1/signal?prices=100,101,99,100,90'
```

The first response is intentionally `402`. An x402 v2 client can decode `PAYMENT-REQUIRED`, sign an authorization, and retry.

## Configuration

| Variable | Purpose |
| --- | --- |
| `PORT` | Local listening port; defaults to `3402` |
| `PUBLIC_ORIGIN` | Canonical public origin used in payment scope |
| `PAY_TO` | Testnet payment recipient |
| `PAYMENT_ASSET` | Testnet token contract accepted for payment |
| `PAYMENT_AMOUNT` | Price in atomic token units; defaults to `1000` |
| `FACILITATOR_URL` | HTTPS facilitator root URL |

Use a dedicated test-only recipient and valueless test assets. No credential belongs in this repository.

## Trust boundary

The gateway constructs requirements and validates exact equality before calling the facilitator. The facilitator is trusted to validate the scheme-specific signature and settle the authorization. The gateway never attempts to reimplement EIP-3009 signature verification.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [`SECURITY.md`](SECURITY.md) before connecting any external service.

## Limitations

- In-memory replay and rate-limit state is suitable for one local process only.
- The included strategy is an educational baseline, not investment advice.
- This implementation covers one GET resource and the `exact` EVM scheme.
- It has not received an independent security audit.

## License

MIT. See [`LICENSE`](LICENSE).
