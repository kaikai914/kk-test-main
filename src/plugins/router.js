import Vue from "vue";
import VueRouter from "vue-router";

Vue.use(VueRouter);

["push", "replace"].forEach((method) => {
  const originalCall = VueRouter.prototype[method];
  VueRouter.prototype[method] = function error(location, onResolve, onReject) {
    if (onResolve || onReject) {
      return originalCall.call(this, location, onResolve, onReject);
    }
    return originalCall.call(this, location).catch((err) => err);
  };
});

const router = new VueRouter({
  mode: "history",
  base: import.meta.env.BASE_URL,
  routes: [
    {
      path: "/",
      name: "index",
      component: () => import("../views/home/index.vue"),
    },
  ],
});

router.onError((error) => {
  if (import.meta.env.DEV) {
    console.error(error);
    return;
  }
  const pattern = /Loading .* failed/g;
  const isChunkLoadFailed = error.message.match(pattern);
  const targetPath = router.history.pending.fullPath;
  if (!isChunkLoadFailed) return error;
  window.location.href = `/${import.meta.env.BASE_URL}${targetPath}`;
});

export default router;
