# Architecture

```text
x402 client
   |  GET /v1/signal
   v
gateway ---- 402 + PAYMENT-REQUIRED
   |
   |  PAYMENT-SIGNATURE
   v
term matching -> facilitator /verify -> replay claim -> facilitator /settle
                                                          |
                                                          v
                                      signal + PAYMENT-RESPONSE
```

## Fail-closed checks

- Only `GET /v1/signal` is served.
- Price input is validated before a payment is requested.
- Network is fixed to `eip155:84532`.
- Amount, asset, recipient, scheme, and timeout must exactly match.
- A payload-scoped resource URL must match the current request.
- Payment headers and facilitator responses have size limits.
- Non-local facilitator traffic requires HTTPS and redirects are rejected.
- A payment header can reach settlement only once per process lifetime window.
- Settlement failure never unlocks the protected resource.

## Production extensions

Replace in-memory replay and rate-limit maps with atomic shared storage before running more than one process. Authenticate configuration, monitor facilitator reconciliation, and keep signing in the client wallet.
