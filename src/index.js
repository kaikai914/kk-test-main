import Vue from "vue";
import Index from "./index.vue";
import NebulaUI from "./plugins/nebula-ui";
import router from "./plugins/router";

Vue.config.productionTip = false;
Vue.use(NebulaUI);

new Vue({
  el: "#app",
  router,
  render: (h) => h(Index),
});
