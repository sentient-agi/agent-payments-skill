# OpenClaw Agentic Payment Skill — Architecture & Implementation

### Description:

Agentic payment service supporting x402 and AP2 protocols.
Routes AI payment intents to web3 (Ethereum via Viem) or web2 
(Visa, MasterCard, PayPal, Stripe) gateways with AWS KMS key management,
policy engine compliance, audit trail, and human-in-the-loop confirmation.

## Project Architecture Overview

```
openclaw-payment-skill/
├── SKILL.md                          # OpenClaw skill definition
├── package.json
├── tsconfig.json
├── config/
│   └── default.yaml                  # Master YAML configuration
├── src/
│   ├── index.ts                      # Main entry point
│   ├── cli.ts                        # CLI interface
│   ├── web-api.ts                    # Express/Fastify web API
│   ├── config/
│   │   └── loader.ts                 # YAML config loader & types
│   ├── protocols/
│   │   ├── router.ts                 # Protocol router (AI output parser)
│   │   ├── x402/
│   │   │   └── client.ts             # x402 protocol client
│   │   └── ap2/
│   │       └── client.ts             # AP2 protocol client
│   ├── payments/
│   │   ├── web3/
│   │   │   └── ethereum.ts           # Viem-based Ethereum tx producer
│   │   └── web2/
│   │       └── gateways.ts           # Visa, MC, PayPal, Stripe bindings
│   ├── kms/
│   │   └── aws-kms.ts               # AWS KMS integration
│   ├── db/
│   │   ├── sqlite.ts                 # SQLite setup & migrations
│   │   ├── key-store.ts             # Encrypted key/token storage
│   │   ├── transactions.ts           # Transaction records
│   │   └── audit.ts                  # Audit trail table
│   ├── policy/
│   │   ├── engine.ts                 # Policy engine
│   │   └── feedback.ts              # Human confirmation feedback loop
│   └── logging/
│       └── logger.ts                 # Multi-target logger
```

## Agentic Payment Skill

This is an agentic payment assistant skill. When the user requests a payment or 
transaction, it will output a structured JSON payment intent.

## Payment Intent JSON Schema

It should always output exactly this JSON when initiating a payment:

```json
{
  "protocol": "x402" | "ap2",
  "action": "pay",
  "amount": "<decimal string>",
  "currency": "USDC" | "ETH" | "USD" | "EUR",
  "recipient": "<address or merchant ID>",
  "network": "ethereum" | "base" | "polygon" | "web2",
  "gateway": "viem" | "visa" | "mastercard" | "paypal" | "stripe" | null,
  "description": "<human-readable description>",
  "metadata": {}
}
```

## Protocol Detection

Assistant skill will examine the payment context:
- If the target is an HTTP resource returning `402 Payment Required`, or the user 
  explicitly mentions x402 / stablecoin / USDC / onchain payment → it will use **X402** protocol.
- If the payment involves a mandate, delegated purchase, merchant checkout, 
  or traditional card/gateway payment via an AI agent → it will use **AP2** protocol.

## Policy Compliance

Before executing, the skill runs all transactions through the policy engine.
If a policy violation is detected, the skill will ask the user for explicit 
confirmation before proceeding.

## Interaction Modes

- **Chat**: Parse JSON from AI output and execute.
- **CLI**: `npx openclaw-payment pay --protocol x402 --amount 10 --currency USDC --to 0x...`
- **Web API**: POST to `/api/v1/payment` with the payment intent JSON body.

## Summary

Here's a quick reference of every feature and where it lives:

| Feature | Files |
|---|---|
| **OpenClaw skill definition** | `SKILL.md` |
| **x402 protocol client** | `src/protocols/x402/client.ts` [[1]](https://github.com/coinbase/x402) [[2]](https://docs.cdp.coinbase.com/x402/welcome) |
| **AP2 protocol client** | `src/protocols/ap2/client.ts` [[3]](https://cloud.google.com/blog/products/ai-machine-learning/announcing-agents-to-payments-ap2-protocol) [[4]](https://ap2-protocol.org/specification/) |
| **Protocol router** (AI output → JSON → protocol) | `src/protocols/router.ts` |
| **Web3 Ethereum tx producer** (Viem) | `src/payments/web3/ethereum.ts` |
| **Web2 gateways** (Stripe, PayPal, Visa, MC) | `src/payments/web2/gateways.ts` |
| **AWS KMS integration** (env vars for auth) | `src/kms/aws-kms.ts` |
| **Encrypted key storage** (SQLite table) | `src/db/key-store.ts` |
| **Policy engine** (limits, time, blacklist/whitelist) | `src/policy/engine.ts` |
| **Human confirmation feedback loop** | `src/policy/feedback.ts` |
| **Audit trail** (SQLite + Winston + stdout/file) | `src/db/audit.ts`, `src/logging/logger.ts` |
| **Transaction records** (SQLite, aggregates) | `src/db/transactions.ts` |
| **SQLite setup & migrations** | `src/db/sqlite.ts` |
| **YAML configuration** | `config/default.yaml`, `src/config/loader.ts` |
| **CLI interface** | `src/cli.ts` |
| **Web API interface** | `src/web-api.ts` |
| **Main orchestrator** | `src/index.ts` |

## Key Design Decisions

- **AWS KMS credentials**: ONLY from environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_KMS_KEY_ID`) — never in config files
- **Encrypted secrets in SQLite**: All sensitive tokens (Stripe, PayPal, Visa, MC, wallet private keys) are encrypted via KMS before storage in the `encrypted_keys` table, and decrypted only at the moment of use
- **Policy engine**: Acts as a compliance interceptor before every transaction; checks single-tx limits, daily/weekly/monthly aggregates, time-of-day, blacklist/whitelist, currency restrictions
- **Human-in-the-loop**: When policy violations are detected, the system pauses and asks for human confirmation through whichever channel is active (CLI terminal prompt, chat markdown prompt, or web API `/confirm` endpoint)
- **Audit trail**: Written to both SQLite (`audit_log` table) and Winston logger (stdout/stderr/file) — configurable granularity via YAML
- **Protocol router**: Parses JSON from AI model output using multiple regex strategies (fenced blocks, raw JSON), then routes to x402 (HTTP 402 + blockchain) or AP2 (mandate-based + any gateway)

