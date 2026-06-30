importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyA8v94-ConfyEv7AIC4UsiWGGUI3wVi13Y",
  projectId: "misalud-b1ee0",
  messagingSenderId: "978775827758",
  appId: "1:978775827758:web:587cd9e4a9202293fb86bf"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Notificación recibida en segundo plano:', payload);

  const titulo = payload.notification.title || "Alerta de MiSalud";
  const opciones = {
    body: payload.notification.body,
    icon: '/favicon.svg',
    vibrate: [200, 100, 200],
    data: payload.data
  };

  self.registration.showNotification(titulo, opciones);
});
