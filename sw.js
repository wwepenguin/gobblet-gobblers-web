if(!self.define){let e,i={};const n=(n,s)=>(n=new URL(n+".js",s).href,i[n]||new Promise((i=>{if("document"in self){const e=document.createElement("script");e.src=n,e.onload=i,document.head.appendChild(e)}else e=n,importScripts(n),i()})).then((()=>{let e=i[n];if(!e)throw new Error(`Module ${n} didn’t register its module`);return e})));self.define=(s,r)=>{const o=e||("document"in self?document.currentScript.src:"")||location.href;if(i[o])return;let c={};const t=e=>n(e,o),d={module:{uri:o},exports:c,require:t};i[o]=Promise.all(s.map((e=>d[e]||t(e)))).then((e=>(r(...e),c)))}}define(["./workbox-5ffe50d4"],(function(e){"use strict";self.skipWaiting(),e.clientsClaim(),e.precacheAndRoute([{url:"assets/index-DtTDqYT3.js",revision:null},{url:"assets/index-jbI1J0KU.css",revision:null},{url:"assets/workbox-window.prod.es5-B9K5rw8f.js",revision:null},{url:"generate-pwa-icons.js",revision:"d4bef985ea9122286869d853c1890a73"},{url:"index.html",revision:"ba2e68ed694c79e09fcc851cf41554a8"},{url:"apple-touch-icon.png",revision:"cdf9e4476dd09c220503a764210c49e6"},{url:"favicon.svg",revision:"f32d16da297f174c698504a32048cc99"},{url:"pwa-192x192.png",revision:"3c2fc97990e1fcd42894682e16ca8760"},{url:"pwa-512x512.png",revision:"d9dd3d1a8e53e8e641392890d00d3ca4"},{url:"manifest.webmanifest",revision:"abbf23b0acf1196522dc551ebabe9298"}],{}),e.cleanupOutdatedCaches(),e.registerRoute(new e.NavigationRoute(e.createHandlerBoundToURL("index.html")))}));
