// No fetch handler or application cache: deployment assets remain network-controlled.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
// Prototype: display only the explicitly defined remote test payload.
self.addEventListener('push', event => {
  let data;
  try { data = event.data?.json(); } catch { return; }
  if (data?.type !== 'test') return;
  event.waitUntil(self.registration.showNotification('IRONLOG — TEST', {
    body: 'Notification de test IronLog.',
    icon: '/icons/icon-192.png',
    tag: 'ironlog-push-test'
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(clients => {
    const client=clients.find(item=>new URL(item.url).origin===self.location.origin);
    return client ? client.focus() : self.clients.openWindow('/');
  }));
});
