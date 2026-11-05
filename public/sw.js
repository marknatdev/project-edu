// Installable shell only. No caching of requests, AI responses, or learner data.
// Offline editing/export is not promised; keep updates network-first by default.
self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(self.clients.claim()); });
