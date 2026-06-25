<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import VPLink from 'vitepress/dist/client/theme-default/components/VPLink.vue'

const { site } = useData()

const localeLinks = computed(() =>
  Object.entries(site.value.locales).map(([key, value]) => ({
    text: value.label,
    link: value.link || (key === 'root' ? '/' : `/${key}/`),
  }))
)
</script>

<template>
  <div v-if="localeLinks.length" class="VPNavScreenTranslations">
    <p class="title"><span class="vpi-languages icon" /> 🌐</p>
    <ul class="list">
      <li v-for="locale in localeLinks" :key="locale.link" class="item">
        <VPLink class="link" :href="locale.link">{{ locale.text }}</VPLink>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.VPNavScreenTranslations {
  height: auto;
  overflow: visible;
  padding: 4px 0;
}
.title {
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-1);
  margin-bottom: 4px;
}
.icon {
  font-size: 16px;
  margin-right: 8px;
}
.list {
  padding: 4px 0 0 24px;
}
.link {
  line-height: 32px;
  font-size: 13px;
  color: var(--vp-c-text-1);
}
</style>