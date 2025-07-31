const CACHE_NAME = "pyquix-cache-v1";
const FILES_TO_CACHE = [
  "/",
  "/index.html",
  "/style.css",
  "/app.js",           // Your main JS file
  "/python_flashcards.json",
  "/flip-sound.mp3",
  "/achievement-sound.mp3",
  // add other assets (images, fonts) if any
];

// Install event: cache all needed files
self.addEventListener("install", (evt) => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log("[ServiceWorker] Caching app shell and content");
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate event: clean up old caches if any
self.addEventListener("activate", (evt) => {
  evt.waitUntil(
    caches.keys().then(keyList => 
      Promise.all(keyList.map(key => {
        if (key !== CACHE_NAME) {
          console.log("[ServiceWorker] Removing old cache:", key);
          return caches.delete(key);
        }
      }))
    )
  );
  self.clients.claim();
});

// Fetch event: serve cached content when offline
self.addEventListener("fetch", (evt) => {
  if (evt.request.method !== "GET") return;

  evt.respondWith(
    caches.match(evt.request).then(response => {
      return response || fetch(evt.request).then(fetchResponse => {
        // Cache new requests for next time
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(evt.request, fetchResponse.clone());
          return fetchResponse;
        });
      }).catch(() => {
        // Fallback: maybe show offline page or nothing
        return caches.match("/index.html");
      });
    })
  );
});
