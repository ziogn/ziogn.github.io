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
    <span class="tnb-label">标签云</span>
  </a>
</template>

<style scoped>
.tag-nav-button {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
  height: 36px;
  color: var(--vp-c-text-2);
  transition: color 0.25s;
  text-decoration: none;
}

.tag-nav-button:hover {
  color: var(--vp-c-brand-1);
}

.tnb-label {
  font-size: 0.85rem;
}

@media (max-width: 767px) {
  .tag-nav-button {
    height: 32px;
    padding: 0 6px;
  }

  .tnb-label {
    display: none;
  }
}
</style>
