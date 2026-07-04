const CACHE_NAME = 'fadora-v2';
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
  '/images/fadora-logo.svg',
  '/images/fadora-logo-full.svg',
  '/images/product-oriflame.svg',
  '/images/product-face.svg',
  '/images/product-hair.svg',
  '/images/product-perfume.svg',
  '/images/product-body.svg',
  '/images/product-men.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(() => {
        // Cache individual assets if bulk fails
        ASSETS.forEach(url => cache.add(url).catch(() => {}));
      });
    })
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
  const url = new URL(event.request.url);
  const isAsset = ASSETS.some(a => url.pathname === a || url.pathname.startsWith('/images/') || url.pathname.startsWith('/uploads/'));

  if (isAsset) {
    // Cache-first for static assets
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request).then(res => {
        return caches.open(CACHE_NAME).then(cache => { cache.put(event.request, res.clone()); return res; });
      }))
    );
  } else {
    // Network-first for HTML, API, etc.
    event.respondWith(
      fetch(event.request).then(res => {
        return caches.open(CACHE_NAME).then(cache => {
          if (event.request.method === 'GET' && res.ok) cache.put(event.request, res.clone());
          return res;
        });
      }).catch(() => caches.match(event.request).then(cached => {
        if (event.request.mode === 'navigate') return caches.match('/');
        return cached;
      }))
    );
  }
});

const VAPID_PUBLIC_KEY = 'BDitqIMvkhQtLRSY-UsSQpo_4Q0fHRa1R80n7suB0VbWVcXmnVJdrifF2mvsDzfQtSlQuI2aLp2nsWl8Q3Q-HSM';

// Push notification
self.addEventListener('push', (event) => {
  const data = event.data?.json() || { title: 'عرض جديد', body: 'تفقدي أحدث العروض من Fadora' };
  const options = {
    body: data.body,
    icon: '/images/fadora-logo.svg',
    badge: '/images/fadora-logo.svg',
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
