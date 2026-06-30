importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

const CACHE_NAME = 'misalud-cache-v1';
const CACHE_URLS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/favicon.svg',
  '/manifest.json'
];

firebase.initializeApp({
  apiKey: "AIzaSyA8v94-ConfyEv7AIC4UsiWGGUI3wVi13Y",
  authDomain: "misalud-b1ee0.firebaseapp.com",
  projectId: "misalud-b1ee0",
  storageBucket: "misalud-b1ee0.firebasestorage.app",
  messagingSenderId: "978775827758",
  appId: "1:978775827758:web:587cd9e4a9202293fb86bf"
});

const messaging = firebase.messaging();

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_URLS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then(networkResponse => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      });
    })
  );
});

messaging.onBackgroundMessage((payload) => {
  console.log('Notificación recibida en segundo plano:', payload);

  const titulo = payload.notification?.title || "Alerta de MiSalud";
  const opciones = {
    body: payload.notification?.body || '',
    icon: '/favicon.svg',
    vibrate: [200, 100, 200],
    data: payload.data
  };

  self.registration.showNotification(titulo, opciones);
});
