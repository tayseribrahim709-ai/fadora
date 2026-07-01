const CACHE_NAME = 'fadora-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/main.js',
  '/js/i18n.js',
  '/js/analytics.js',
  '/manifest.json',
  '/admin/index.html',
  '/admin/admin.css',
  '/admin/admin.js',
  '/images/fadora-logo.jpeg',
  '/images/product-oriflame.svg',
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        return caches.open(CACHE_NAME).then(cache => {
          if (event.request.url.startsWith(self.location.origin)) {
            cache.put(event.request, response.clone());
          }
          return response;
        });
      }).catch(() => {
        if (event.request.mode === 'navigate') return caches.match('/');
      });
    })
  );
});

// Push notification
self.addEventListener('push', (event) => {
  const data = event.data?.json() || { title: 'عرض جديد', body: 'تفقدي أحدث العروض من Fadora' };
  const options = {
    body: data.body,
    icon: '/images/fadora-logo.jpeg',
    badge: '/images/fadora-logo.jpeg',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' }
  };
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});
