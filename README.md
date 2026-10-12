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

Workspace for preparing disclosed token-campaign drafts and publishing only to accounts the owner has actually authorized. It does not send unsolicited messages, join groups, or treat a saved URL as permission to post. Help inside the app is the step-by-step guide.

```bash
npm run studio
```

Open [http://localhost:5173/studio](http://localhost:5173/studio). `npm run dev` serves the same app. The workspace opens with no password.

Screens: Overview, Campaigns, Link Library, Opportunities, Content Studio, Calendar & Queue, Analytics, Integrations, Help, Settings.

What works now:

- Campaign briefs with autosave, claims checks, and an export. Northwind Acorns is a labeled fictional demo. The BuffaRumble campaign uses only facts already on the public site.
- Link library with paste, CSV import and export, tags, search, archive, and duplicate detection. Seeded Telegram, X, YouTube, and directory links are unverified research or prospect records. Categories are owned publishing account, authorized partner, listing profile, paid ad network, creator prospect, research/reference, and outreach prospect. Only a verified owned account, or a partner with budget approval and a sponsorship disclosure, can reach the queue.
- Promotion opportunities, kept separate from the link library: official listing forms, unvetted ad prospects, and policy pages. Status moves one step at a time from unreviewed through owner approval, requirements, a prepared application, an owner-recorded submission, and provider confirmation, rejection, or expiry. Preparing an application does not mark it submitted. Advertising needs an explicit spend approval and the due-diligence checklist. Manipulation offers stay blocked. Prices and eligibility are not stored.
- Editable drafts, review, a timezone-aware queue, pause controls, and progress counted from finished tasks. A post is marked published only after the provider confirms it.
- Telegram publishing on a local server, after `TELEGRAM_BOT_TOKEN` is set and `getChatMember` shows that bot as administrator or creator of the destination chat.

What still needs a real provider connection: X, YouTube, TikTok, Instagram, Reddit, and Discord stay “Integration unavailable.” Their drafts can be copied or exported. The app does not fetch user-supplied websites, connect wallets, or request seed phrases. Private Telegram invite links are not in the repository; paste them into the library if you need them locally.

Optional environment variables live in `.env` (see `.env.example`). The server reads that file on startup and does not print the values.

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

Local data is `data/studio.json`, created on first run and gitignored, with uploads in `data/uploads/`. Restarting the server keeps that file. Platform limits and the publish matrix are in `docs/platform-support.md`.

The public preview is [https://token-campaign-studio.site/](https://token-campaign-studio.site/). It runs in the browser only: edits stay in local storage, provider credentials are absent, and nothing is marked published. A push to `JackMiller825/Token-Campaign-Studio` builds that preview and publishes it with GitHub Pages on `token-campaign-studio.site`. A push to `JackMiller825/BFRAM` keeps the marketing build and `bfram.site`.

`npm run build` writes the static marketing site to `dist/`. The studio API runs only with `npm run studio` or `npm run dev`. Checks are `npm run typecheck`, `npm run lint`, and `npm run test`.
