# Birthday Site

An editorial, letterpress-inspired birthday card. Static HTML/CSS/JS, no framework, no bundler.

Live: <https://birthday.glassgallery.my.id>

## Stack

- Plain HTML, CSS, and vanilla JS
- GSAP + ScrollTrigger (pinned "five truths" on desktop), Lenis smooth scroll — self-hosted
- Fraunces (display) and Inter (labels) — self-hosted woff2
- Cloudflare Worker with **Static Assets** (serves the site) + **Browser Run** (renders the social preview)
- Optional fallback: `nginx` container served through the shared Caddy edge

## Structure

```
site/
  index.html              all content (letter, truths) lives in markup
  og.html                 template for the social preview card ({{TO}} / {{FROM}} / {{DATE}})
  _headers                cache rules for Workers Static Assets
  assets/css/styles.css   design, responsive, print, reduced-motion, no-JS fallbacks
  assets/js/app.js        motion, cursor, candle, clock, personalization
  assets/js/content.js    default recipient / sender / date / city / timezone
  assets/fonts/           Fraunces + Inter woff2, gf.css
  assets/js/vendor/       gsap, ScrollTrigger, lenis
  assets/img/og.png       static fallback preview (1200x630)
src/index.js              the Worker: static hosting, per-recipient meta, /og.png renderer
scripts/build.mjs         copies site/ -> build/ and fingerprints CSS/JS with a content hash
wrangler.jsonc            Worker config (assets, browser binding, zone route)
Dockerfile, nginx.conf    optional self-hosted variant
```

## Personalize

Query parameters override the defaults without rebuilding:

```
https://birthday.glassgallery.my.id/?to=Azzar&from=Mema&date=1996-11-12
```

| Param  | Effect                                  |
| ------ | --------------------------------------- |
| `to`   | Recipient name (default `Kamu`)         |
| `from` | Sender, shown in the sign-off (default: none) |
| `date` | Birthday as `YYYY-MM-DD`, drives the header date, sign-off date, and the preview card |

The Worker rewrites `<head>` per request, so link unfurlers (WhatsApp, X, Facebook) show the
right name and a matching preview image without executing JavaScript. The visible page is
personalized client-side by `assets/js/app.js`.

To change the permanent default, edit `site/assets/js/content.js`:

```js
window.BIRTHDAY = {
  to: "Kamu",
  from: "",
  date: "",        // empty = today
  city: "Jakarta",
  timeZone: "Asia/Jakarta",
};
```

The letter body and the five truths are static HTML in `index.html` — edit them there so they stay
crawlable and readable without JS.

## Deploy (Cloudflare, primary)

```bash
cd ~/projects/birthday-site
npm run deploy      # node scripts/build.mjs && wrangler deploy
```

Credentials come from `CLOUDFLARE_API_TOKEN` (Workers Scripts:Edit is enough for the Worker
itself; the zone route additionally needs Zone > Workers Routes > Edit, which the vault's
Cloudflare global API key covers).

Zone route: `birthday.glassgallery.my.id/*` -> Worker `birthday-site`.

`scripts/build.mjs` fingerprints every CSS/JS file with a content hash and rewrites the URLs in
`index.html`, so the immutable one-year cache in `_headers` is always safe: a changed file always
gets a new URL.

### Social preview

`/og.png?to=Azzar&from=Mema&date=1996-11-12` renders `site/og.html` through Browser Run at
1200x630 and returns a PNG. Results are cached per recipient for 7 days; if the browser budget is
exhausted the endpoint falls back to the static `assets/img/og.png`.

Free plan budget: Workers 100k requests/day, Browser Run 10 minutes of browser time per day and
one screenshot per 10 seconds — plenty for a personal card as long as previews are cached.

## Deploy (self-hosted, alternative)

```bash
cd ~/projects/birthday-site
docker build -t birthday-site:latest .

cd ~/projects/misa-stack
nix run .#svcctl -- undeploy birthday --yes
nix run .#svcctl -- deploy birthday birthday-site:latest 80 --domain birthday.glassgallery.my.id
```

`svcctl` writes the Caddy route at `~/projects/shared-caddy/conf.d/birthday.caddy` and restarts
Caddy; the Cloudflare Tunnel ingress entry points the hostname at `http://localhost:80`.

## Local preview

```bash
cd site && python3 -m http.server 8099     # static site
npm run dev                                # full worker (assets + meta + og.png)
```

## Accessibility and fallbacks

- Without JS: the letter and all five truths render in normal flow, fully readable.
- `prefers-reduced-motion`: animations are neutralized, the pin is released, truths stack vertically.
- The candle can be lit with keyboard (`Enter`/`Space`) or pointer.
- Print stylesheet outputs only the letter.

## Regenerating the static fallback preview

Open `site/og.html` in a browser at 1200x630 and screenshot it to `site/assets/img/og.png`,
then rebuild.
