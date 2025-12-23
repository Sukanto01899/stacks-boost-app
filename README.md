# Stacks Boost

Stacks Boost is a Stacks Builder event project for talen.protocol. It contains a Clarity lending pool contract and a Next.js frontend with WalletConnect + Leather/Xverse support and Hiro Chainhooks integration.

## Repository Structure

- `stackboost-contract` - Clarity smart contracts, tests, and deployment plans.
- `stacks-boost-frontend` - Next.js app + Chainhooks API routes.

## Tech Stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS 4 (orange UI theme)
- @stacks/connect, @stacks/transactions
- @reown/appkit (WalletConnect)
- @hirosystems/chainhooks-client (Chainhooks)
- Clarity smart contracts (Stacks)

## How It Works

1. User selects a wallet in the modal (WalletConnect or Leather/Xverse).
2. UI submits contract calls for deposit, withdraw, borrow, and repay.
3. Balances are read from contract maps via the Hiro API.
4. Chainhooks stream contract-call events into the Next.js API route.
5. The UI can poll `/api/chainhooks/events` to show activity.

## Quick Start (Frontend)

```bash
cd stacks-boost-frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

Create `stacks-boost-frontend/.env.local`:

```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
NEXT_PUBLIC_STACKS_NETWORK=mainnet
NEXT_PUBLIC_STACKS_CONTRACT_ADDRESS=SP... 
NEXT_PUBLIC_STACKS_CONTRACT_NAME=stackslend-v4
```

Optional (Chainhooks registration):

```env
CHAINHOOKS_API_KEY=your_chainhooks_api_key
CHAINHOOKS_CALLBACK_URL=https://your-domain.com/api/chainhooks
```

## Wallets

- WalletConnect is used for QR/extension flows.
- Leather/Xverse connect via Stacks Connect.
- Use the modal in the header to switch between wallets.

## Contract

See `stackboost-contract/README.md` for build, testing, and deployment.

## Chainhooks

Frontend API routes live under:

- `stacks-boost-frontend/app/api/chainhooks`

Use `POST /api/chainhooks/register` to register a mainnet hook when you have a public callback URL.

## Troubleshooting

- WalletConnect `{}` console errors usually mean the project ID is missing or invalid.
- If balances do not load, confirm `NEXT_PUBLIC_STACKS_NETWORK` matches your wallet network.
- Deposit is single-slot: withdraw before a new deposit.

## License

MIT
