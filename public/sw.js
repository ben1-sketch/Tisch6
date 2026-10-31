// Tisch6-App (Service Worker): zeigt Push-Nachrichten an und öffnet beim Tippen die passende Seite.
// Kein Offline-Zwischenspeicher – die Seiten kommen immer frisch vom Server.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Tisch6", {
      body: data.body || "",
      icon: "/app-icon-192.png",
      badge: "/app-badge-96.png",
      lang: "de",
      data: { url: data.url || "/de" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/de", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        try {
          await client.focus();
          await client.navigate(url);
          return;
        } catch {
          // Fenster lässt sich nicht umleiten – dann ein neues öffnen
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
