<!-- OpenClaw Skill Definition -->
---
name: agentic-payment
version: 1.0.0
description: >
  Agentic payment service supporting x402 and AP2 protocols.
  Routes AI payment intents to web3 (Ethereum via Viem) or web2 
  (Visa, MasterCard, PayPal, Stripe) gateways with AWS KMS key management,
  policy engine compliance, audit trail, and human-in-the-loop confirmation.
author: your-org
tags:
  - payments
  - x402
  - ap2
  - web3
  - web2
  - blockchain
  - compliance
tools:
  - exec
  - web_fetch
  - read
  - write
env:
  - AWS_ACCESS_KEY_ID
  - AWS_SECRET_ACCESS_KEY
  - AWS_REGION
  - AWS_KMS_KEY_ID
  - STRIPE_API_KEY_ENCRYPTED
  - PAYPAL_CLIENT_ID_ENCRYPTED
  - PAYPAL_SECRET_ENCRYPTED
---

# Agentic Payment Skill

You are an agentic payment assistant. When the user requests a payment or 
transaction, you MUST output a structured JSON payment intent.

## Protocol Detection

Examine the payment context:
- If the target is an HTTP resource returning `402 Payment Required`, or the user 
  explicitly mentions x402 / stablecoin / USDC / onchain payment → use **x402**.
- If the payment involves a mandate, delegated purchase, merchant checkout, 
  or traditional card/gateway payment via an AI agent → use **AP2**.

## Payment Intent JSON Schema

Always output exactly this JSON when initiating a payment:

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

## Policy Compliance

Before executing, the skill runs all transactions through the policy engine.
If a policy violation is detected, the skill will ask the user for explicit 
confirmation before proceeding.

## Interaction Modes

- **Chat**: Parse JSON from AI output and execute.
- **CLI**: `npx openclaw-payment pay --protocol x402 --amount 10 --currency USDC --to 0x...`
- **Web API**: POST to `/api/v1/payment` with the payment intent JSON body.
