// Service worker do Twisisa: só trata notificações push.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }
  const url = typeof data.url === 'string' && data.url.startsWith('/') && !data.url.startsWith('//') ? data.url : '/aluno'
  event.waitUntil(
    self.registration.showNotification(data.title || 'Twisisa', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'twisisa-lembrete',
      data: { url },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/aluno'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if ('focus' in client) return client.navigate(url).then(() => client.focus())
      }
      return self.clients.openWindow(url)
    }),
  )
})
