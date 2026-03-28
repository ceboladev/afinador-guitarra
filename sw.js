// Service Worker simples para permitir a instalação PWA
self.addEventListener('install', (e) => {
  console.log('Service Worker instalado');
});

self.addEventListener('fetch', (e) => {
  // Necessário para o PWA ser detectado como instalável
  e.respondWith(fetch(e.request));
});