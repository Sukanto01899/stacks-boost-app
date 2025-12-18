# Stacks Boost

Frontend for the Stacks Boost lending pool on mainnet. Connect Leather or Xverse, deposit and withdraw STX, and trigger borrow/repay calls against the `stackslend-v1` contract.

## Stacks Builder Event (talen.protocol)

Stacks Boost is built for the talen.protocol Stacks Builder event. It demonstrates:

- On-chain deposit/withdraw flows with transaction proofs
- Borrow and repay calls wired to the lending contract
- Live balance checks from contract maps
- Hiro Chainhooks integration for contract call events
- Clean, mobile-first orange UI with clear status and network messaging

## Demo Script (2-3 minutes)

1. Connect a testnet wallet (Leather or Xverse).
2. Deposit 1 STX (watch the tx status and explorer link).
3. Refresh the deposited balance after confirmation.
4. Withdraw the full amount.
5. Trigger a Borrow with collateral + amount.
6. Repay and observe status updates.

Mainnet requires real STX.

## Features

- Wallet connect with Leather and Xverse (Stacks Connect modal)
- Deposit and withdraw STX
- Borrow and repay (contract calls wired)
- On-chain deposited balance with refresh
- Orange UI theme, mobile-friendly layout
- Tx status tracking with explorer links
- Network mismatch warning (testnet/mainnet)

## Tech Stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS 4
- @stacks/connect and @stacks/transactions

## Requirements

- Node.js 18+
- Leather or Xverse wallet
- Testnet STX for testing

## Quick Start

```bash
cd stacks-boost-frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

## Contract Configuration

The UI reads contract constants from:

- `stacks-boost-frontend/lib/stacks-config.ts`

Current defaults (mainnet):

- Contract address: `SP1G4ZDXED8XM2XJ4Q4GJ7F4PG4EJQ1KKXRCD0S3K`
- Contract name: `stackslend-v1`

Update these values if you deploy to a new address.

## Hiro Chainhooks (Mainnet)

This app uses `@hirosystems/chainhooks-client` via a Next.js API route to register a mainnet Chainhook that tracks contract calls.

### Env Vars

Create `.env.local`:

```env
CHAINHOOKS_API_KEY=your_chainhooks_api_key
CHAINHOOKS_CALLBACK_URL=https://your-domain.com/api/chainhooks
```

### Register the Chainhook

Call the register endpoint:

```bash
curl -X POST http://localhost:3000/api/chainhooks/register
```

After registration, Chainhooks will POST events to:
`/api/chainhooks`

The UI polls:
`/api/chainhooks/events`

## Usage

1. Connect your wallet (Leather or Xverse).
2. Deposit STX (only one active deposit at a time).
3. Withdraw STX.
4. Borrow and repay from the Borrow card.
5. Use Refresh to fetch the deposited balance from chain.

## Scripts

- `npm run dev` - start dev server
- `npm run build` - production build
- `npm start` - run production build
- `npm run lint` - lint

## Notes

- The contract rejects a new deposit if a deposit already exists. Withdraw first.
- Balance refresh is on-chain and may take a few blocks to update.

## Troubleshooting

- If a transaction fails with `(err u103)`, you already have a deposit.
- If the balance is empty, confirm the wallet is on mainnet (`SP` prefix).
- If tx status shows failed, open the explorer link for the full error code.
- If Chainhooks do not deliver events, confirm your public callback URL and API key.

## License

MIT
