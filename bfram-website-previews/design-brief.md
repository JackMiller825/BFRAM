# BuffaRumble / $BFRAM — Website preview handoff

Status: All 10 design previews complete. Static mockups only; website and final production artwork are not yet built.

## Sitemap
One page at /. Header → Hero → Story (#story) → Token (#token) → How to buy (#how-to-buy) → Community (#community) → FAQ (#faq) → Footer.
No separate pages are needed for this compact narrative. Header and footer are shared between desktop and mobile and reusable for future routes.
No external website reference was supplied for this request.

## Art direction
Preserve rust-brown buffalo, cream ram, gold curled horns, tiny orange and teal helmets, football and bold cartoon outlines.
Orange #FF781F; teal #08C3C8; cream #FFF1CF; chocolate #251008. These are proposed CSS tokens, not color measurements.
Athletic slab-serif display headings and clean sans-serif body. Use actual HTML text, buttons and cards, never screenshots of the previews as the site.
Desktop max content width about 1200px, generous section padding; mobile horizontal padding 20px and touch controls at least 44px.
Hero split text/art on desktop; stack on mobile. Token grid 3 columns desktop, 2 tablet, 1 on very narrow mobile. Buy cards 4 desktop, stacked mobile.

## Canonical details and corrections
Detailed previews 02–07, 09–10 take precedence over the overview for final copy, controls and component arrangement.
Use community subheading “Different animals. Same chaotic energy.” Replace “Same animal. Different attitude.” wherever it appears in the overview/mobile roughs.
The community feature is a local mascot preference selector, not a live poll. No vote totals, percentages or live result claims.
Pending social links, explorer/trading links and copy-contract controls must remain disabled regardless of bright styling in overview images.
The paper-plane icon accidentally shown on the trading placeholder in preview 04 should become a generic swap-arrow icon.
Use consistent tiny mascot helmets from the approved brand art; the helmet decoration in preview 04 is illustrative, not a replacement character design.
The mobile board shows three consecutive scroll segments left to right, not three pages.
No event date, result, launch date, supply, tax, liquidity status or ownership status has been verified in this design stage.

## Working website copy
Hero: Big horns. Tiny helmets. Maximum rumble.
A buffalo. A ram. One very small football.
An independent Ethereum community meme.
Actions: Meet the herd (#community); How to buy (#how-to-buy).

Story: Two horns. One ridiculous rivalry.
A friendly face-off on Ethereum.
BuffaRumble turns a buffalo-and-ram rivalry into an original community meme. Two oversized personalities. One undersized football.
Fictional mascot story: The buffalo brought the noise. The ram brought the attitude. Neither brought a helmet that fits.
Buffalo: Big energy. Tiny helmet. Ram: Curly horns. Zero chill.
Independent characters. No team or league affiliation.

Token: Know the playbook.
Network: Ethereum mainnet. Ticker: $BFRAM.
Total supply, buy/sell tax, liquidity status, ownership status and contract address: Pending confirmation.
Trading and explorer links: Pending confirmation.

How to buy: Four steps to the huddle.
1. Get a wallet — Use a compatible Ethereum wallet. Keep your recovery phrase private.
2. Add ETH — Use Ethereum mainnet. Leave enough ETH for network fees.
3. Verify $BFRAM — Match the contract address against the confirmed official links.
4. Review and swap — Check the token, fees and transaction details before confirming.
Trading link pending. No active transaction button until verified details are available.

Community: Pick a side. Join the herd.
Different animals. Same chaotic energy.
Bring your best banter. Share a meme. Pick your mascot. Keep the rivalry friendly.
Telegram — link pending. X — link pending.
Official links will appear here once confirmed.

FAQ:
What is BuffaRumble? — BuffaRumble is an independent Ethereum meme project built around a fictional buffalo-and-ram rivalry. The mascots, jokes and community are the story.
Is this an official sports project? — No. It is an independent project with no team or league affiliation.
Where is the contract address? — The contract address is pending confirmation. Only use the verified address published here once available.
When can I trade $BFRAM? — Trading availability and the official trading link are pending confirmation.

Footer: Independent meme project. No team or league affiliation.
Crypto assets carry risk. No returns are promised.

## Proposed interactions — not implemented
Header sticks on scroll; active anchor updates. Anchor scrolling respects header offset.
Mobile menu opens/closes via accessible button, Escape, and link activation; manage keyboard focus.
Buttons lift at most 2px on hover. Character cards may tilt subtly on pointer devices.
Hero mascot duo may bob slowly by 4px; keep headline static. No 3D engine needed.
Team selector uses keyboard-operable controls and local state; highlighted ram in preview 06 is an example state. Optional localStorage preference, no fabricated voting.
FAQ is a keyboard-accessible accordion, with first row open in preview 07.
Disable pending controls. Enable copy only when a verified address is supplied, with clear success feedback.
Honor prefers-reduced-motion; no forced scrolling, continuous shaking or flashing.
Footer back-to-top uses the same reduced-motion behavior.

## Production image asset checklist — proposed, not generated in this stage
| Filename | Dimensions | Alpha | Placement |
|---|---|---|---|
| bfram-logo-transparent.png | 1024×1024 | Yes, existing | Avatar, favicon source, compact brand mark |
| bfram-wordmark-transparent.png | 1600×400 | Yes | Header and footer wordmark |
| bfram-hero-duo-transparent.png | 1800×1600 | Yes | Desktop and mobile hero, reusable face-off cutout |
| bfram-buffalo-portrait.png | 1024×1024 | Yes | Story card and community selector |
| bfram-ram-portrait.png | 1024×1024 | Yes | Story card and community selector |
| bfram-faq-ram-transparent.png | 1000×1200 | Yes | FAQ thinking mascot |
| bfram-peeking-duo-transparent.png | 1400×700 | Yes | How-to-buy lower decoration |
| bfram-stadium-background.webp | 2400×1400 | No | Hero sunset and token section background, subtle and separately positioned |
| bfram-field-divider-transparent.png | 2400×240 | Yes | Optional grass transition |
| bfram-og-image.png | 1200×630 | No | Social sharing metadata |
Existing banners bfram-banner-3to1.png (1500×500) and bfram-banner-1100x520.png (1100×520) can remain community promotional assets.
Sun rays, card backgrounds, ticker stripe, borders, focus states, UI icons and football yard lines should be CSS/SVG components rather than extra raster images.
Provide optimized WebP derivatives for large opaque images and responsive image sizes during implementation.

## Files
10 individually named PNG previews, preview-manifest.json with measured dimensions, this design brief, and generation-prompts.txt.
Generation used the built-in image-generation tool. Prompts and references establish the proposed design; final text must follow this handoff.

