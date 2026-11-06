// No fetch handler or application cache: deployment assets remain network-controlled.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
