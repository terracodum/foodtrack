/* Cache public static assets only. Never cache private pages, APIs or reports. */
const CACHE='foodtrack-shell-v1';
const SHELL=['/offline.html','/icons/icon-192.png','/icons/icon-512.png','/icons/maskable-512.png','/icons/apple-touch-icon.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)));self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('foodtrack-shell-')&&key!==CACHE)await caches.delete(key);await self.clients.claim()})())});
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(url.origin!==self.location.origin||event.request.method!=='GET')return;
if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).catch(async()=>await caches.match('/offline.html')||new Response('Нет соединения',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}})));return}
if(SHELL.includes(url.pathname))event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
});
