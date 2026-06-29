<template>
  <div>
    <div class="experimental-banner">Experimental</div>
    <DefaultTheme.Layout />
  </div>
</template>

<script setup lang="ts">
import DefaultTheme from 'vitepress/theme';
</script>

<style>
.experimental-banner {
  position: fixed;
  top: 24px;
  right: -44px;
  z-index: 9999;
  width: 160px;
  text-align: center;
  transform: rotate(45deg);
  padding: 3px 0;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  background: #f59e0b;
  color: #fff;
  box-shadow: 0 1px 4px rgba(0,0,0,0.2);
  pointer-events: none;
  user-select: none;
}
.dark .experimental-banner {
  background: #a16207;
  color: #fef3c7;
}
</style>
