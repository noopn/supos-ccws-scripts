import { precacheAndRoute } from "workbox-precaching";

import { registerRoute } from "workbox-routing";
import { CacheFirst } from "workbox-strategies";

registerRoute(
  ({ url }) => {
    console.log(url);
    return true;
  },
  new CacheFirst({
    cacheName: "all-resources-cache", // 缓存名称
  })
);

precacheAndRoute(self.__WB_MANIFEST || []);
