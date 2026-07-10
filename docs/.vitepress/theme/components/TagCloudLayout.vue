<script lang="ts" setup>
import TagPanel from './TagPanel.vue'
import DocListPanel from './DocListPanel.vue'
import { useTagFilter, TAG_FILTER_INJECTION_KEY } from '../util/useTagFilter'
import { provide } from 'vue'

const tagFilter = useTagFilter()
provide(TAG_FILTER_INJECTION_KEY, tagFilter)
</script>

<template>
  <div class="TagCloud">
    <div class="dual-layout">
      <div class="tag-panel-col">
        <div class="header">
          <h1 class="title">标签云</h1>
          <p class="subtitle">
            共 {{ tagFilter.allTags.length }} 个标签，覆盖 {{ tagFilter.filteredDocs.length }} 篇文档
          </p>
        </div>
        <TagPanel />
      </div>
      <div class="doc-list-col">
        <DocListPanel />
      </div>
    </div>
  </div>
</template>

<style scoped>
.TagCloud {
  min-height: 100vh;
}

.dual-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 24px;
  max-width: 1200px;
  margin: 0 auto;
  padding: 48px 24px;
}

.tag-panel-col {
  align-self: start;
}

@media (min-width: 768px) {
  .tag-panel-col {
    position: sticky;
    top: calc(var(--vp-nav-height) + 24px);
  }
}

.header {
  margin-bottom: 24px;
}

.title {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.3;
  margin: 0 0 8px 0;
}

.subtitle {
  color: var(--vp-c-text-2);
  font-size: 0.85rem;
  margin: 0;
}

@media (max-width: 767px) {
  .dual-layout {
    grid-template-columns: 1fr;
    gap: 16px;
    padding: 32px 16px;
  }

  .tag-panel-col {
    position: static;
  }

  .title {
    font-size: 1.5rem;
  }

  .TagCloud {
    padding-top: 0;
  }
}
</style>
