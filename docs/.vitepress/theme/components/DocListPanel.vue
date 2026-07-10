<script lang="ts" setup>
import { inject } from 'vue'
import { TAG_FILTER_INJECTION_KEY, type TagFilterState } from '../util/useTagFilter'
import { tagChipStyle } from '../util/tagChip'
import { useData } from 'vitepress'

const { isDark } = useData()
const { filteredDocs, selectedTags, clearTags } = inject(TAG_FILTER_INJECTION_KEY) as TagFilterState
</script>

<template>
  <div class="doc-list-panel">
    <div v-if="selectedTags.size > 0" class="result-header">
      筛选结果（{{ filteredDocs.length }} 篇）
    </div>
    <div v-if="filteredDocs.length === 0 && selectedTags.size > 0" class="empty-state">
      <p>未找到匹配的文档</p>
      <button
        class="tag-chip-base tag-chip tag-clear"
        type="button"
        @click="clearTags()"
      >
        清除筛选
      </button>
    </div>
    <div
      v-for="doc in filteredDocs"
      :key="doc.url"
      class="doc-item"
    >
      <a :href="doc.url" class="doc-title">{{ doc.title }}</a>
      <div class="doc-tags">
        <span
          v-for="tag in doc.tags"
          :key="tag"
          class="tag-chip-base"
          :style="tagChipStyle(tag, isDark)"
        >
          {{ tag }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.result-header {
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.doc-item {
  padding: 12px 0;
  border-bottom: 1px solid var(--vp-c-divider);
}

.doc-item:last-child {
  border-bottom: none;
}

.doc-title {
  display: block;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.5;
  color: var(--vp-c-text-1);
  text-decoration: none;
}

.doc-title:hover {
  color: var(--vp-c-brand-1);
}

.doc-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.doc-tags .tag-chip-base {
  padding: 1px 8px;
  font-size: 0.75rem;
  cursor: default;
  pointer-events: none;
}

.empty-state {
  text-align: center;
  padding-top: 48px;
  color: var(--vp-c-text-2);
}

.empty-state .tag-chip.tag-clear {
  background: transparent !important;
  color: var(--vp-c-brand-1) !important;
  border-color: var(--vp-c-divider);
  font-size: 0.85rem;
  cursor: pointer;
  padding: 4px 14px;
}

.empty-state .tag-chip.tag-clear:hover {
  opacity: 1;
  color: var(--vp-c-brand-1) !important;
  filter: brightness(1);
  transform: none;
}

@media (max-width: 767px) {
  .doc-item {
    padding: 10px 0;
  }
}
</style>
