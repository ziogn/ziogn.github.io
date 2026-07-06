<script lang="ts" setup>
import tagIndex from 'virtual:tag-index'
import { useData } from 'vitepress'
import { computed } from 'vue'
import { allTagsFromIndex, tagChipStyle } from '../util/tagChip'
import { useHomeTagFilter } from '../util/useHomeTagFilter'

const { isDark } = useData()
const { selectedTags, toggleTag, clear, filteredCount, selectedCount } = useHomeTagFilter()

const allTags = computed(() => allTagsFromIndex(tagIndex as Record<string, { tags: string[]; title: string }>))
const totalDocs = computed(() => Object.keys(tagIndex as Record<string, { tags: string[]; title: string }>).length)
</script>

<template>
  <div v-if="allTags.length" class="HomeTagCloud">
    <h2>标签云</h2>
    <p class="hc-stats">
      <template v-if="selectedCount > 0">
        选中 {{ selectedCount }} 个标签：显示 {{ filteredCount }} 篇文档
      </template>
      <template v-else>
        共 {{ allTags.length }} 个标签，覆盖 {{ totalDocs }} 篇文档
      </template>
    </p>
    <div class="hc-tag-list">
      <button
        v-for="tag in allTags"
        :key="tag.name"
        class="tag-chip-base tag-chip"
        :class="{ active: selectedTags.has(tag.name) }"
        :style="tagChipStyle(tag.name, isDark)"
        type="button"
        :aria-pressed="selectedTags.has(tag.name) ? 'true' : 'false'"
        @click="toggleTag(tag.name)"
      >
        {{ tag.name }}
        <span class="tag-count">{{ tag.count }}</span>
      </button>
      <button
        v-if="selectedCount > 0"
        class="tag-chip-base tag-chip tag-chip-clear"
        type="button"
        @click="clear"
      >
        清除
      </button>
    </div>
  </div>
</template>

<style scoped>
.HomeTagCloud {
  margin: 0 auto;
  max-width: 1152px;
  padding-top: 48px;
}

.HomeTagCloud h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 4px 0;
}

.hc-stats {
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
  margin: 0 0 12px 0;
}

.hc-tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.tag-chip {
  padding: 4px 14px;
  font-size: 0.85rem;
  cursor: pointer;
  font-family: inherit;
}

.tag-chip.active {
  box-shadow: 0 0 0 2px currentColor;
  filter: brightness(1.1);
}

.tag-chip-clear {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  border-color: var(--vp-c-divider);
}

.tag-chip-clear:hover {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

@media (max-width: 767px) {
  .HomeTagCloud {
    padding-top: 32px;
  }

  .HomeTagCloud h2 {
    font-size: 1.25rem;
  }

  .hc-tag-list {
    gap: 8px;
  }
}
</style>
