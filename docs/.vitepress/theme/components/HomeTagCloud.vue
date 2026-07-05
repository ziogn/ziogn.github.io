<script lang="ts" setup>
import tagIndex from 'virtual:tag-index'
import { useData } from 'vitepress'
import { computed } from 'vue'
import { allTagsFromIndex, tagChipStyle } from '../util/tagChip'

const { isDark } = useData()

const allTags = computed(() => allTagsFromIndex(tagIndex as Record<string, string[]>))
const totalDocs = computed(() => Object.keys(tagIndex as Record<string, string[]>).length)
</script>

<template>
  <div v-if="allTags.length" class="HomeTagCloud">
    <h2>内容分类</h2>
    <p class="hc-stats">
      共 {{ allTags.length }} 个标签，覆盖 {{ totalDocs }} 篇文档
    </p>
    <div class="hc-tag-list">
      <button
        v-for="tag in allTags"
        :key="tag.name"
        class="tag-chip-base tag-chip"
        :style="tagChipStyle(tag.name, isDark)"
        type="button"
      >
        {{ tag.name }}
        <span class="tag-count">{{ tag.count }}</span>
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
  cursor: default;
  font-family: inherit;
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
