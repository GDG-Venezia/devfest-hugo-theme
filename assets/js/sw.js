{{- /*
  Service worker template, rendered to /sw.js by layouts/partials/functions/serviceWorker.html. Only built when `params.offline.enable` is true.

  - Install saves the "core": every page, the CSS, JS, fonts, logo and app icon. Kept small so a
    slow first visit finishes it quickly.
  - Once active, the page asks for the "media": same-origin images the saved pages use. Saved in the
    background, low priority, a few at a time; anything missing is retried on the next visit.
  - Pages: network first. If the network fails, or is slower than NAV_TIMEOUT, the saved copy is shown
    with <meta name="df-saved-copy"> so the page can say so. A late network answer still refreshes
    the saved copy and tells the page.
  - CSS, JS and fonts: saved copy first (their names change when they change).
  - Images: saved copy first. Their names don't change when they change, so once per deploy the
    media pass re-checks every saved image with a conditional request (a few bytes when unchanged)
    and drops images no page uses any more.
  - VERSION changes on every build, so each deploy replaces the saved pages.
*/ -}}
{{- $pages := slice -}}
{{- range site.Pages -}}
  {{- if and (in (slice "home" "section" "page") .Kind) .RelPermalink -}}
    {{- $pages = $pages | append .RelPermalink -}}
  {{- end -}}
{{- end -}}
{{- $style := resources.Get "css/devfest.css" | resources.Minify | resources.Fingerprint -}}
{{- $script := resources.Get "js/site.js" | js.Build (dict "minify" true) | resources.Fingerprint -}}
{{- $assets := slice $style.RelPermalink $script.RelPermalink -}}
{{- range partial "functions/fonts.html" -}}{{ $assets = $assets | append .url }}{{- end -}}
{{- with site.Params.logo }}{{ $assets = $assets | append (. | relURL) }}{{ end -}}
{{- with site.Params.offline.icon }}{{ $assets = $assets | append (. | relURL) }}{{ end -}}
const VERSION = {{ now.Format "20060102150405" | jsonify }};
const CORE_CACHE = `devfest-core-${VERSION}`;
const MEDIA_CACHE = "devfest-media";
const MEDIA_VERSION_KEY = "/__devfest-media-version";
const PAGES = {{ $pages | uniq | jsonify }};
const ASSETS = {{ $assets | uniq | jsonify }};
const STYLE = {{ $style.RelPermalink | jsonify }};
const HOME = {{ "/" | relURL | jsonify }};
const NAV_TIMEOUT = 3500;
const MEDIA_RE = /(?:src|href|data-map-src)=["']?([^"'\s>]+?\.(?:webp|png|jpe?g|gif|svg|avif))(?=["'\s>])/gi;
const MEDIA_EXT = /\.(?:webp|png|jpe?g|gif|svg|avif)$/i;

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const core = await caches.open(CORE_CACHE);
    // Pages bypass the HTTP cache so a deploy never mixes old and new pages; assets have unique names.
    await core.addAll([
      ...PAGES.map((url) => new Request(url, { cache: "no-cache" })),
      ...ASSETS,
    ]);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names.filter((n) => n.startsWith("devfest-core-") && n !== CORE_CACHE).map((n) => caches.delete(n)),
    );
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "devfest:save-media") event.waitUntil(saveMedia());
});

let savingMedia = null;
function saveMedia() {
  savingMedia ??= (async () => {
    const core = await caches.open(CORE_CACHE);
    const found = new Set();
    for (const request of await core.keys()) {
      if (!request.url.endsWith("/")) continue;
      const html = await (await core.match(request)).text();
      for (const [, src] of html.matchAll(MEDIA_RE)) {
        const url = new URL(src, request.url);
        if (url.origin === location.origin) found.add(url.href);
      }
    }
    const media = await caches.open(MEDIA_CACHE);
    const marker = await media.match(MEDIA_VERSION_KEY);
    const recheck = !marker || (await marker.text()) !== VERSION;
    if (recheck) {
      for (const request of await media.keys()) {
        if (!found.has(request.url) && !request.url.endsWith(MEDIA_VERSION_KEY)) await media.delete(request);
      }
    }
    let failed = false;
    const queue = [...found];
    const worker = async () => {
      while (queue.length) {
        const url = queue.shift();
        const saved = await media.match(url);
        if (saved && !recheck) continue;
        try {
          const response = await fetch(url, { priority: "low", ...(saved && revalidation(saved)) });
          // 304: the saved copy is still current.
          if (response.ok) await media.put(url, response);
          else if (response.status !== 304) failed = true;
        } catch {
          // Offline or flaky: the next visit picks it up again.
          failed = true;
        }
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    if (recheck && !failed) await media.put(MEDIA_VERSION_KEY, new Response(VERSION));
  })().finally(() => { savingMedia = null; });
  return savingMedia;
}

// Conditional request for a saved image, so an unchanged one costs a 304 and no download.
function revalidation(saved) {
  const etag = saved.headers.get("etag");
  const modified = saved.headers.get("last-modified");
  const headers = etag ? { "If-None-Match": etag } : modified ? { "If-Modified-Since": modified } : null;
  return headers ? { headers, cache: "no-store" } : { cache: "no-cache" };
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(page(event));
  } else if (ASSETS.includes(url.pathname)) {
    event.respondWith(caches.match(url.pathname).then((hit) => hit || fetch(request)));
  } else if (MEDIA_EXT.test(url.pathname)) {
    event.respondWith(image(request));
  }
});

function pageKey(request) {
  const url = new URL(request.url);
  url.search = "";
  url.hash = "";
  return url.href;
}

async function page(event) {
  const key = pageKey(event.request);
  const network = fetch(event.request).then(async (response) => {
    if (response.ok && response.type === "basic" && !response.redirected && isHtml(response)) {
      const cache = await caches.open(CORE_CACHE);
      await cache.put(key, response.clone());
    }
    return response;
  });

  const timeout = new Promise((resolve) => { setTimeout(() => resolve("slow"), NAV_TIMEOUT); });
  const first = await Promise.race([network.catch(() => "offline"), timeout]);
  if (first instanceof Response) return first;

  const saved = await caches.match(key);
  if (!saved) {
    if (first === "slow") {
      try { return await network; } catch { /* fall through */ }
    }
    return offlinePage();
  }
  if (first === "slow") {
    // Keep the slow download going: once it lands the saved copy is fresh and the page can offer it.
    event.waitUntil(network.then((response) => response.ok && notify(event.resultingClientId, key)).catch(() => {}));
  }
  return markSaved(saved, first);
}

// Navigations can be images too (a venue map opened in its own tab): only pages get the page treatment.
function isHtml(response) {
  return (response.headers.get("content-type") || "").includes("text/html");
}

async function notify(clientId, url) {
  const client = clientId && (await self.clients.get(clientId));
  client?.postMessage({ type: "devfest:page-updated", url });
}

// Tell the page it is a saved copy, why ("offline" or "slow"), and when it was saved.
async function markSaved(response, reason) {
  if (!isHtml(response)) return response;
  const html = await response.text();
  const savedAt = (response.headers.get("date") || "").replace(/"/g, "");
  const meta = `<meta name="df-saved-copy" content="${reason}" data-saved-at="${savedAt}">`;
  return new Response(html.replace(/<head[^>]*>/i, (head) => head + meta), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function offlinePage() {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title><link rel="stylesheet" href="${STYLE}"></head>
<body><main class="section"><div class="wrap" style="padding-block:48px"><span class="chip">Offline</span>
<h1 style="margin-top:14px;font-size:clamp(32px,5vw,56px);letter-spacing:-0.03em">This page isn't saved on this device</h1>
<p class="lead" style="margin-top:14px;max-width:60ch">You're offline and this page wasn't saved for offline use. The agenda, speakers and venue info are.</p>
<p style="margin-top:24px"><a class="btn btn--solid btn--lg" href="${HOME}">Go to the home page</a></p></div></main></body></html>`;
  return new Response(html, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

async function image(request) {
  const cache = await caches.open(MEDIA_CACHE);
  const saved = await cache.match(request, { ignoreSearch: true });
  if (saved) return saved;
  const response = await fetch(request);
  if (response.ok && response.type === "basic") cache.put(request, response.clone()).catch(() => {});
  return response;
}
