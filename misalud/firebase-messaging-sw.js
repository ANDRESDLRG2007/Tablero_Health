importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Configuración idéntica y completa
firebase.initializeApp({
  apiKey: "AIzaSyBs1uwgKhwz57aha3bdj3MzUo3yKV3J_0Q",
  authDomain: "misalud-b1ee0.firebaseapp.com",
  projectId: "misalud-b1ee0",
  storageBucket: "misalud-b1ee0.firebasestorage.app",
  messagingSenderId: "978775827758",
  appId: "1:978775827758:web:587cd9e4a9202293fb86bf"
});

const messaging = firebase.messaging();

// Capturar notificaciones con la app cerrada
messaging.onBackgroundMessage((payload) => {
  console.log('Notificación en segundo plano:', payload);
  const titulo = payload.notification?.title || "Alerta de MiSalud";
  const opciones = {
    body: payload.notification?.body || "",
    icon: '/favicon.ico',
    vibrate: [200, 100, 200]
  };
  self.registration.showNotification(titulo, opciones);
});
