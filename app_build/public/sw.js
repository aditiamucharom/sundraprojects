self.addEventListener('push', function (event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const options = {
        body: data.body || 'Sundra notification',
        icon: data.icon || '/file.svg',
        badge: data.badge || '/file.svg',
        data: {
          url: data.url || '/dashboard/today'
        }
      };
      event.waitUntil(
        self.registration.showNotification(data.title || 'Sundra Alert', options)
      );
    } catch (e) {
      // Fallback if data is not JSON
      const text = event.data.text();
      event.waitUntil(
        self.registration.showNotification('Sundra Alert', {
          body: text,
          icon: '/file.svg',
          data: { url: '/dashboard/today' }
        })
      );
    }
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/dashboard/today';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windowClients) {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
