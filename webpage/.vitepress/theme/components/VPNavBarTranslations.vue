<script lang="ts" setup>
import { computed } from 'vue'
import { useData } from 'vitepress'
import VPFlyout from 'vitepress/dist/client/theme-default/components/VPFlyout.vue'
import VPMenuLink from 'vitepress/dist/client/theme-default/components/VPMenuLink.vue'

const { site } = useData()

// Always show all locales in the order they are defined, with the active one highlighted
const localeLinks = computed(() =>
  Object.entries(site.value.locales).map(([key, value]) => ({
    text: value.label,
    link: value.link || (key === 'root' ? '/' : `/${key}/`),
  }))
)
</script>

<template>
  <VPFlyout v-if="localeLinks.length" class="VPNavBarTranslations" icon="vpi-languages" label="🌐">
    <div class="items">
      <template v-for="locale in localeLinks" :key="locale.link">
        <VPMenuLink :item="locale" />
      </template>
    </div>
  </VPFlyout>
</template>

<style scoped>
.VPNavBarTranslations {
  display: none;
}
@media (min-width: 1280px) {
  .VPNavBarTranslations {
    display: flex;
    align-items: center;
  }
}
</style>