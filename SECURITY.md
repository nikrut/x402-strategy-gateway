# Security Policy

This repository is a testnet MVP. It stores no signing key and must not be configured with funded-wallet credentials.

## Controls

- Payment terms are compared locally before facilitator verification.
- Facilitator calls use bounded timeouts, reject redirects, and require HTTPS outside localhost.
- Headers, queries, and facilitator responses are size-bounded.
- Replayed payment headers are rejected before a second settlement call.
- Error responses do not expose facilitator bodies or authorization payloads.
- Responses disable caching and set restrictive browser-facing headers.

## Before production

Use shared atomic replay storage, distributed rate limiting, structured redacted logs, facilitator reconciliation, external security review, and an incident-response runbook. Verify whether the selected payment asset and facilitator are appropriate for your jurisdiction and application.

Report vulnerabilities through a private GitHub security advisory.
