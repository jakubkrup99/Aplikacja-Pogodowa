const staticCacheName = "site-static-v2";
const assets = [
  "/",
  "/index.html",
  "/main.js",
  "/style.css",
  "/images/clear.png",
  "/images/clouds.png",
  "/images/drizzle.png",
  "/images/gps.png",
  "/images/humidity.png",
  "/images/location.png",
  "/images/mist.png",
  "/images/moon.png",
  "/images/rain.png",
  "/images/search.png",
  "/images/snow.png",
  "/images/sun.png",
  "/images/wind.png",
  "/images/world.png",
  "/images/save.png",
  "/images/diskette.png",
  "images/recycle-bin.png",
  "/manifest.json",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(staticCacheName).then((cache) => {
      //wysyła request o assety i umieszczka odpowiedzi w cachu
      cache.addAll(assets);
    })
  );
});

self.addEventListener("activate", (e) => {
  //Waits for Promise
  e.waitUntil(
    caches.keys().then((keys) => {
      // keys is array of keys
      return Promise.all(
        keys
          .filter((key) => key !== staticCacheName)
          //caches.delete returns Promise, so we need Promise.all to take all Promises and convert them into one
          .map((key) => caches.delete(key))
      );
    })
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((cacheRes) => {
      return cacheRes || fetch(e.request);
    })
  );
});
