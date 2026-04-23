const CACHE_NAME = "nelsen-v1";

const URLS_TO_CACHE = [
    "/",
    "/index.html",
    "/style.css",
    "/app.js",
    "/manifest.json",
    "/data-max.json"
];

// INSTALL
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(URLS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// ACTIVATE
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            )
        )
    );
    self.clients.claim();
});

// FETCH STRATEGY
self.addEventListener("fetch", (event) => {
    const req = event.request;

    // =========================
    // 1. JSON (KAMUS) -> NETWORK FIRST
    // =========================
    if (req.url.includes("data-max.json")) {
        event.respondWith(
            fetch(req)
                .then((res) => {
                    if (!res || res.status !== 200) return res;

                    const clone = res.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(req, clone);
                    });

                    return res;
                })
                .catch(() => caches.match(req))
        );
        return;
    }

    // =========================
    // 2. ASSET -> CACHE FIRST
    // =========================
    event.respondWith(
        caches.match(req).then((cached) => {
            if (cached) return cached;

            return fetch(req)
                .then((res) => {
                    if (!res || res.status !== 200 || res.type !== "basic") {
                        return res;
                    }

                    const clone = res.clone();

                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(req, clone);
                    });

                    return res;
                })
                .catch(() => cached);
        })
    );
});
