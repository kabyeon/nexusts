<template>
  <div>
    <div class="experimental-banner">⚡ Experimental</div>
    <DefaultTheme.Layout />
  </div>
</template>

<script setup lang="ts">
import DefaultTheme from 'vitepress/theme';
</script>

<style>
.experimental-banner {
  position: sticky;
  top: 0;
  z-index: 100;
  text-align: center;
  padding: 6px 12px;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  background: #fef3c7;
  color: #92400e;
  border-bottom: 1px solid #f59e0b;
}
.dark .experimental-banner {
  background: #422006;
  color: #fbbf24;
  border-bottom-color: #a16207;
}
</style>
