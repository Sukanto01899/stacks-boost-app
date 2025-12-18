# Stacks Boost

Stacks Boost is a Stacks Builder event project for talen.protocol. It contains a lending pool smart contract and a Next.js frontend with Hiro Chainhooks integration.

## Repository Structure

- `stacks-boost-contract` - Clarity smart contracts and deployment plans
- `stacks-boost-frontend` - Next.js app + Chainhooks API routes

## Tech Stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS 4 (orange UI theme)
- @stacks/connect + @stacks/transactions
- @hirosystems/chainhooks-client (mainnet Chainhooks)
- Clarity smart contracts (Stacks)

## How It Works

1. User connects a wallet (Leather/Xverse) via Stacks Connect.
2. UI submits contract calls to `stackslend-v1` for deposit/withdraw/borrow/repay.
3. Balances are read from contract maps via Hiro API.
4. Chainhooks stream contract-call events into the Next.js API route.
5. Frontend polls `/api/chainhooks/events` to show recent activity.

## Usage Guidelines

- Keep contract address and network in sync with your wallet.
- Deposit is single-slot: withdraw before a new deposit.
- Borrowed balance depends on the contract map; update contract logic if needed.
- Use mainnet Chainhooks only when you have a public callback URL.

## Quick Start

```bash
cd stacks-boost-frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

## Chainhooks (Mainnet)

The frontend provides Chainhooks API routes under:

- `stacks-boost-frontend/app/api/chainhooks`

See `stacks-boost-frontend/README.md` for setup details and required env vars.

## Contract

See `stacks-boost-contract/README.md` for contract build and deployment steps.

## Demo

1. Connect wallet (Leather/Xverse)
2. Deposit STX and view tx status + explorer link
3. Refresh balances (deposit/borrow)
4. Trigger borrow/repay calls
5. Observe Chainhook events in UI

## License

MIT
