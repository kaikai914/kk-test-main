<template>
  <div class="nv-home">
    <n-icon type="logo" effect="primary" :size="80" />
    <n-text :level="1" class="nv-home-title">首页</n-text>
    <n-text :inline="false" :size="18" class="nv-home-title">
      当前只集成最基础配置，其他部分扩展模块参照文档说明手动集成2
    </n-text>
    <n-button size="large" type="primary" @click="onClick">文档说明</n-button>
  </div>
</template>

<script>
export default {
  methods: {
    onClick() {
      window.open("http://nebula-ui.qyy.com/docs/create");
    },
  },
};
</script>

<style scoped>
.nv-home {
  text-align: center;
  padding: 120px;
}

.n-text {
  margin: 12px;
}
</style>
