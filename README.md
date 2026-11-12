# Birthday Site

An editorial, letterpress-inspired birthday card. Static HTML/CSS/JS, no build step, no framework.

Live: <https://birthday.glassgallery.my.id>

## Stack

- Plain HTML, CSS, and ES modules-free vanilla JS
- GSAP + ScrollTrigger (pinned "five truths" on desktop), Lenis smooth scroll — self-hosted
- Fraunces (display) and Inter (labels) — self-hosted woff2
- Served by `nginx:1.27-alpine` in a container on the shared edge network

## Structure

```
site/
  index.html              all content (letter, truths) lives in markup
  og.html                 source for the social preview image
  assets/css/styles.css   design, responsive, print, reduced-motion, no-JS fallbacks
  assets/js/app.js        motion, cursor, candle, clock, personalization
  assets/js/content.js    default recipient / sender / date / city / timezone
  assets/fonts/           Fraunces + Inter woff2, gf.css
  assets/js/vendor/       gsap, ScrollTrigger, lenis
  assets/img/og.png       1200x630 social preview
Dockerfile                static image, fingerprints asset URLs at build time
nginx.conf                caching, gzip, security headers
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
| `date` | Birthday as `YYYY-MM-DD`, drives the header date, age line, and countdown clock |

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

The letter body and the five truths are static HTML in `index.html` — edit them there so they stay crawlable and readable without JS.

## Local preview

```bash
cd site && python3 -m http.server 8099
# http://127.0.0.1:8099/
```

## Build and deploy

The site is deployed through `svcctl` (central infra rules: shared Caddy ingress, no published host ports).

```bash
cd ~/projects/birthday-site
docker build -t birthday-site:latest .

cd ~/projects/misa-stack
nix run .#svcctl -- undeploy birthday --yes
nix run .#svcctl -- deploy birthday birthday-site:latest 80 --domain birthday.glassgallery.my.id
```

`svcctl` recreates the Caddy route file at `~/projects/shared-caddy/conf.d/birthday.caddy` and restarts Caddy. The Cloudflare Tunnel ingress entry lives in `/etc/cloudflared/config.yml` and points `birthday.glassgallery.my.id` at `http://localhost:80`.

### Cache busting

The Dockerfile appends a content hash to the CSS/JS URLs in `index.html` at build time (`styles.css?v=<sha>`). Assets are cached for 7 days, so a rebuild is what forces clients and the Cloudflare edge to fetch the new files. Never edit files inside a running container — rebuild instead.

## Accessibility and fallbacks

- Without JS: the letter and all five truths render in normal flow, fully readable.
- `prefers-reduced-motion`: animations are neutralized, the pin is released, truths stack vertically.
- The candle can be lit with keyboard (`Enter`/`Space`) or pointer.
- Print stylesheet outputs only the letter.

## Regenerating the social image

Open `site/og.html` in a browser at 1200x630 and screenshot it to `site/assets/img/og.png`, then rebuild.
