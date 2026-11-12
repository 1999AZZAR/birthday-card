/**
 * Birthday site worker.
 *
 * - serves the static card from the ASSETS binding
 * - rewrites <head> metadata per recipient so link unfurlers (WhatsApp,
 *   X, Facebook) show the right name before any JavaScript runs
 * - renders /og.png on demand with Browser Run and caches the result
 */

const DEFAULTS = { to: "Kamu", from: "", date: "" };
const OG_CACHE_TTL_SECONDS = 60 * 60 * 24 * 7;
const SITE_NAME = "sebuah perayaan kecil";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const person = resolvePerson(url.searchParams);

    if (url.pathname === "/og.png") {
      return renderOgImage(request, env, ctx, person);
    }

    const assetPath = url.pathname === "/" ? "/index.html" : url.pathname;
    const asset = await env.ASSETS.fetch(new Request(new URL(assetPath, url), request));

    if (assetPath === "/index.html" && asset.ok) {
      const html = await asset.text();
      return new Response(withPersonalMeta(html, person, url.origin), {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "public, max-age=0, must-revalidate",
          "x-content-type-options": "nosniff",
          "referrer-policy": "strict-origin-when-cross-origin",
        },
      });
    }

    return asset;
  },
};

function resolvePerson(params) {
  const person = {
    to: clean(params.get("to")) || DEFAULTS.to,
    from: clean(params.get("from")) || DEFAULTS.from,
    date: "",
  };
  const date = clean(params.get("date"));
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) person.date = date;
  return person;
}

function clean(value) {
  if (!value) return "";
  return value.replace(/[\u0000-\u001f]/g, "").trim().slice(0, 60);
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(iso) {
  if (!iso) return "";
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function personQuery(person) {
  const query = new URLSearchParams({ to: person.to });
  if (person.from) query.set("from", person.from);
  if (person.date) query.set("date", person.date);
  return query.toString();
}

function withPersonalMeta(html, person, origin) {
  const title = `Selamat ulang tahun, ${person.to} — ${SITE_NAME}`;
  const description = `Sebuah surat kecil untuk hari yang besar. Selamat ulang tahun, ${person.to} — panjang umur, dan bahagia.`;
  const image = `${origin}/og.png?${personQuery(person)}`;
  const page = `${origin}/?${personQuery(person)}`;

  const meta = [
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    `<meta property="og:description" content="${escapeHtml(description)}">`,
    `<meta property="og:image" content="${escapeHtml(image)}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:image:alt" content="${escapeHtml(title)}">`,
    `<meta property="og:url" content="${escapeHtml(page)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escapeHtml(title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(description)}">`,
    `<meta name="twitter:image" content="${escapeHtml(image)}">`,
    `<link rel="canonical" href="${escapeHtml(page)}">`,
  ].join("\n");

  return html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(/<!--OG_META_START-->[\s\S]*?<!--OG_META_END-->/, `<!--OG_META_START-->\n${meta}\n<!--OG_META_END-->`);
}

async function renderOgImage(request, env, ctx, person) {
  const cache = caches.default;
  const cacheKey = new Request(`${new URL(request.url).origin}/__og/${cacheKeyFor(person)}`);

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const origin = new URL(request.url).origin;
  const template = await env.ASSETS.fetch(new Request(new URL("/og.html", origin), request));
  if (!template.ok) return staticOgFallback(env, origin);

  const html = (await template.text())
    .replace("<head>", `<head><base href="${origin}/">`)
    .replace(/\{\{TO\}\}/g, escapeHtml(person.to))
    .replace(/\{\{FROM\}\}/g, escapeHtml(person.from))
    .replace(/\{\{DATE\}\}/g, escapeHtml(formatDate(person.date)));

  try {
    const shot = await shoot(env, {
      html,
      viewport: { width: 1200, height: 630 },
      screenshotOptions: { type: "png" },
      gotoOptions: { waitUntil: "networkidle0", timeout: 20000 },
    });

    if (!shot.ok) {
      console.error(`browser-run failed: ${shot.status}`);
      return staticOgFallback(env, origin);
    }

    const image = new Response(shot.body, {
      headers: {
        "content-type": "image/png",
        "cache-control": `public, max-age=${OG_CACHE_TTL_SECONDS}`,
        "x-og-rendered": "browser-run",
      },
    });
    ctx.waitUntil(cache.put(cacheKey, image.clone()));
    return image;
  } catch (error) {
    console.error(`browser-run error: ${error?.message ?? error}`);
    return staticOgFallback(env, origin);
  }
}

/**
 * The free plan allows one screenshot every 10 seconds, so a second request
 * inside that window comes back as 429. Wait once and try again.
 */
async function shoot(env, payload, attempt = 0) {
  const shot = await env.BROWSER.quickAction("screenshot", payload);
  if (shot.status === 429 && attempt === 0) {
    const header = Number(shot.headers.get("retry-after") ?? 3);
    const waitSeconds = Math.min(Number.isFinite(header) && header > 0 ? header : 3, 11);
    await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
    return shoot(env, payload, attempt + 1);
  }
  return shot;
}

async function staticOgFallback(env, origin) {  try {
    const response = await env.ASSETS.fetch(new Request(new URL("/assets/img/og.png", origin)));
    if (response.ok) {
      return new Response(response.body, {
        headers: {
          "content-type": "image/png",
          "cache-control": "public, max-age=3600",
          "x-og-rendered": "fallback",
        },
      });
    }
  } catch (error) {
    console.error(`og fallback error: ${error?.message ?? error}`);
  }
  return new Response("og image unavailable", { status: 503, headers: { "content-type": "text/plain" } });
}

function cacheKeyFor(person) {
  return `${person.to}|${person.from}|${person.date}`.replace(/[^a-zA-Z0-9|.-]/g, "_");
}
