/* Órbita Infinity V26 — service worker
   Network-first no app e na configuração para evitar celular preso em versão antiga. */
var CACHE = 'orbita-infinity-v26-20260910';
var ASSETS = [
  './',
  './index.html',
  './config.js',
  './manifest.webmanifest',
  './orbita-infinity.css',
  './orbita-infinity.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-180.png'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE)
      .then(function(c){ return c.addAll(ASSETS); })
      .catch(function(){})
      .then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){ return k===CACHE ? null : caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('message', function(e){
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', function(e){
  var req=e.request;
  if(req.method!=='GET') return;
  var url; try{url=new URL(req.url);}catch(err){return;}
  if(url.origin!==self.location.origin) return;

  var networkFirst = req.mode==='navigate' ||
    url.pathname.endsWith('/index.html') || url.pathname.endsWith('/') ||
    url.pathname.endsWith('/config.js');

  if(networkFirst){
    e.respondWith(fetch(req, {cache:'no-store'}).then(function(resp){
      if(resp&&resp.ok){
        caches.open(CACHE).then(function(c){
          var key=url.pathname.endsWith('/config.js') ? './config.js' : './index.html';
          c.put(key,resp.clone());
          if(req.mode==='navigate') c.put(req,resp.clone());
        });
      }
      return resp;
    }).catch(function(){
      return caches.match(req).then(function(x){
        if(x) return x;
        return url.pathname.endsWith('/config.js') ? caches.match('./config.js') : caches.match('./index.html');
      });
    }));
    return;
  }

  // Assets: responde rápido do cache e atualiza em segundo plano.
  e.respondWith(caches.match(req).then(function(hit){
    var net=fetch(req).then(function(resp){
      if(resp&&resp.ok)caches.open(CACHE).then(function(c){c.put(req,resp.clone());});
      return resp;
    }).catch(function(){return hit;});
    return hit || net;
  }));
});
