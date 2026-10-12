# BuffaRumble ($BFRAM)

Independent Ethereum meme community site. One page, hash anchors, no wallet connection and no live market data.

## Commands

```bash
npm install
npm run dev -- --host 0.0.0.0
npm run typecheck
npm run lint
npm run test
npm run build
npm run preview -- --host 0.0.0.0
```

After `package-lock.json` is present, use `npm ci` for a reproducible install. Production build output is `dist/`.

The live site is [https://bfram.site/](https://bfram.site/). GitHub Pages serves this repository on that custom domain from the site root, so local dev and preview open at `http://localhost:5173/`. Hash routes such as `/#story` do not need a server rewrite.

Pushes to `main` deploy through `.github/workflows/pages.yml`.

## Where to update token facts

Edit `src/config/token.ts` only.

- Leave unknown facts as `null`. The page shows “Pending confirmation”.
- Set `contractConfirmed` to `true` only after the official address is confirmed. A valid address string alone does not enable copy.
- Set `tradingConfirmed` to `true` only when trading is officially available. Trading also needs that confirmed address and an `https` `tradeUrl`.
- `telegramUrl`, `xUrl`, `chartUrl`, and `explorerUrl` turn on their own controls when each value is a valid `https` URL.
- `siteUrl` is `https://bfram.site`. The production build writes absolute canonical, `og:url`, and social-image URLs into `dist/index.html`. Change it if the public domain changes.

Invalid addresses and links stay disabled and log a development warning. They do not crash the page.
