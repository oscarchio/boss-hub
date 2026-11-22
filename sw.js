// 老板中枢 Service Worker v1：壳缓存 + 数据永远拉新
const SHELL = ["./", "./index.html", "./src/main.js", "./manifest.json"];
self.addEventListener("install", e => { e.waitUntil(caches.open("boss-v1").then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(clients.claim()); });
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (url.pathname.endsWith(".json") || url.pathname.includes("/assets/audio/")) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));  // 数据永远拉新，断网先读缓存
  } else {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
  }
});
