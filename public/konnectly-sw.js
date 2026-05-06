/* KONNECTLY - Unified Service Worker for Next.js PWA notifications. */

const CACHE_NAME = "konnectly-next-cache-v1";
const DEFAULT_APP_URL = "/app";
const BRAND_APP_URL = "/brand";
const ICON_URL = "/pwa-icon-192.png";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)));
      await clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const acceptsHtml = request.method === "GET" && request.headers.get("accept")?.includes("text/html");

  if (request.mode === "navigate" || acceptsHtml) {
    event.respondWith(fetch(request, { cache: "no-store" }).catch(() => caches.match(request)));
    return;
  }

  if (request.method !== "GET") return;

  event.respondWith(
    fetch(request).catch(async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      throw new Error("Offline and no cached response available.");
    }),
  );
});

self.addEventListener("push", (event) => {
  const data = readPushPayload(event.data, {
    title: "Konnectly Update",
    body: "You have a new update!",
    url: DEFAULT_APP_URL,
  });

  event.waitUntil(
    (async () => {
      await showKonnectlyNotification(data);
      await notifyOpenClients(data);
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (!event.data || event.data.type !== "SHOW_NOTIFICATION") return;

  event.waitUntil(
    showKonnectlyNotification({
      title: event.data.title || "Konnectly Update",
      body: event.data.body || "You have a new update!",
      url: event.data.url || DEFAULT_APP_URL,
      tag: event.data.tag || "konnectly-local-notification",
      vibrate: event.data.vibrate || [200, 100, 200],
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = normalizeTargetUrl(event.notification.data?.url || DEFAULT_APP_URL);

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (normalizeTargetUrl(client.url) === targetUrl && "focus" in client) {
          return client.focus();
        }
      }

      const fallbackClient = windowClients.find((client) => sameAppSection(client.url, targetUrl));
      if (fallbackClient && "focus" in fallbackClient) return fallbackClient.focus();

      if (clients.openWindow) return clients.openWindow(targetUrl);
      return undefined;
    }),
  );
});

function readPushPayload(payload, fallback) {
  if (!payload) return fallback;

  try {
    return { ...fallback, ...payload.json() };
  } catch {
    return { ...fallback, body: payload.text() };
  }
}

function showKonnectlyNotification(data) {
  const url = normalizeTargetUrl(data.url || pickDefaultUrl(data));
  const tag = data.tag || (url.startsWith(BRAND_APP_URL) ? "konnectly-biz-notification" : "konnectly-notification");

  return self.registration.showNotification(data.title || "Konnectly Update", {
    body: data.body || "You have a new update!",
    icon: data.icon || ICON_URL,
    badge: data.badge || ICON_URL,
    vibrate: data.vibrate || [200, 100, 200, 100, 200],
    tag,
    renotify: true,
    data: { url },
  });
}

function pickDefaultUrl(data) {
  const tag = String(data.tag || "");
  return tag.includes("biz") || tag.includes("brand") ? BRAND_APP_URL : DEFAULT_APP_URL;
}

function normalizeTargetUrl(url) {
  try {
    const parsed = new URL(url, self.location.origin);
    return parsed.origin === self.location.origin ? `${parsed.pathname}${parsed.search}${parsed.hash}` : parsed.href;
  } catch {
    return DEFAULT_APP_URL;
  }
}

function sameAppSection(clientUrl, targetUrl) {
  const normalizedClientUrl = normalizeTargetUrl(clientUrl);
  if (targetUrl.startsWith(BRAND_APP_URL)) return normalizedClientUrl.startsWith(BRAND_APP_URL);
  if (targetUrl.startsWith(DEFAULT_APP_URL)) return normalizedClientUrl.startsWith(DEFAULT_APP_URL);
  return false;
}

async function notifyOpenClients(data) {
  const windowClients = await clients.matchAll({ type: "window", includeUncontrolled: true });
  await Promise.all(
    windowClients.map((client) =>
      client.postMessage({
        type: "KONNECTLY_DATA_CHANGED",
        url: normalizeTargetUrl(data.url || DEFAULT_APP_URL),
        tag: data.tag || "konnectly-notification",
      }),
    ),
  );
}
