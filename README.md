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

## Token Campaign Studio

Local owner workspace for preparing disclosed drafts and publishing only to accounts that are actually connected. The public site build does not include this server. Reference links, including the seeded Telegram, X, YouTube, and directory URLs, are not posting targets.

```bash
npm run studio
```

Open [http://localhost:5173/studio](http://localhost:5173/studio). `npm run dev` serves the same app. The first visit asks for an owner password of at least 10 characters.

Optional environment variables live in `.env` (see `.env.example`). The server reads that file on startup and does not print the values. Leave them blank to keep every provider except a configured Telegram bot as “Integration unavailable”; drafts stay copyable and are never marked published.

| Variable | Purpose |
| --- | --- |
| `STUDIO_TOKEN_KEY` | Reserved for encrypting future OAuth tokens at rest |
| `TELEGRAM_BOT_TOKEN` | Bot API token. Posts only after an admin check |
| `X_CLIENT_ID` / `X_CLIENT_SECRET` | Detected, not used |
| `YOUTUBE_CLIENT_ID` / `YOUTUBE_CLIENT_SECRET` | Detected, not used |
| `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET` | Detected, not used |
| `INSTAGRAM_APP_ID` / `INSTAGRAM_APP_SECRET` | Detected, not used |
| `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` | Detected, not used |
| `DISCORD_BOT_TOKEN` | Detected, not used |

The database is `data/studio.json`, created on first run and gitignored. Uploads go in `data/uploads/`. Restarting the server keeps the database and drops in-memory sessions, so the owner signs in again. Platform limits and the current publish matrix are in `docs/platform-support.md`.

The public preview is [https://jackmiller825.github.io/Token-Campaign-Studio/](https://jackmiller825.github.io/Token-Campaign-Studio/). That site runs in the browser only: the workspace stays in local storage, provider credentials are absent, and a post is never marked published. Private `t.me/+` invite links are not stored in the repository; paste them in the link library if you still need them. The BuffaRumble marketing site stays at [https://bfram.site/](https://bfram.site/) from the BFRAM repository.

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

`npm run build` still produces the static marketing site in `dist/`. The studio API runs only inside `npm run studio` or `npm run dev`. A push to `JackMiller825/Token-Campaign-Studio` builds the browser preview and publishes it with GitHub Pages. A push to `JackMiller825/BFRAM` keeps the marketing build and the `bfram.site` domain.
