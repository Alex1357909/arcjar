# ArcJar

Send USDC tips on Arc Testnet. Create a shareable link and receive instant stablecoin tips — no middlemen, no fees.

## Live demo

https://arc-tipjar-six.vercel.app

## How it works

1. Visit the site and enter your name, bio, and Arc wallet address
2. Get a shareable link: `arcjar.vercel.app/tip/0xYourAddress`
3. Share it — anyone can send you USDC tips instantly on Arc Testnet

## Tech stack

- Next.js 16 (App Router)
- Circle App Kit SDK (`@circle-fin/app-kit`)
- viem + `@circle-fin/adapter-viem-v2`
- Arc Testnet (Chain ID: 5042002)
- Tailwind CSS v4
- canvas-confetti

## Network config

| Property | Value |
|----------|-------|
| Chain ID | 5042002 |
| RPC | https://rpc.testnet.arc.network |
| Explorer | https://testnet.arcscan.app |
| Gas token | USDC |

## Local development

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

## Environment variables

```
NEXT_PUBLIC_MAX_TIP=100
```

## License

MIT
