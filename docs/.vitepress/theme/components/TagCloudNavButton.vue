<script lang="ts" setup>
</script>

<template>
  <a
    class="tag-nav-button"
    href="/tags"
    title="标签云"
    aria-label="标签云"
  >
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
      <line x1="7" y1="7" x2="7.01" y2="7"/>
    </svg>
  </a>
</template>

<style scoped>
.tag-nav-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: var(--vp-c-text-2);
  transition: color 0.25s;
}

.tag-nav-button:hover {
  color: var(--vp-c-brand-1);
}

@media (max-width: 767px) {
  .tag-nav-button {
    width: 32px;
    height: 32px;
  }
}
</style>
