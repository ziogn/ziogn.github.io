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
  <div class="TagCloud">
    <div class="container">
      <div class="header">
        <h1 class="title">标签云</h1>
        <p class="subtitle">共 {{ allTags.length }} 个标签，覆盖 {{ totalDocs }} 篇文档</p>
      </div>
      <div class="tag-cloud">
        <button
          v-for="tag in allTags"
          :key="tag.name"
          class="tag-chip"
          :style="tagChipStyle(tag.name, isDark)"
          type="button"
        >
          {{ tag.name }}
          <span class="tag-count">{{ tag.count }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.TagCloud {
  min-height: 100vh;
  padding: 80px 24px 48px;
}

.container {
  max-width: 900px;
  margin: 0 auto;
}

.header {
  margin-bottom: 36px;
}

.title {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.3;
  margin: 0 0 8px 0;
}

.subtitle {
  color: var(--vp-c-text-2);
  font-size: 0.95rem;
  margin: 0;
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 14px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-size: 0.85rem;
  cursor: default;
  white-space: nowrap;
  transition: all 0.15s ease;
  line-height: 1.6;
  font-family: inherit;
}

.tag-chip:hover {
  filter: brightness(1.15);
  transform: translateY(-1px);
}

.tag-count {
  font-size: 0.7rem;
  opacity: 0.75;
}

@media (max-width: 767px) {
  .TagCloud {
    padding: 64px 16px 32px;
  }

  .title {
    font-size: 1.5rem;
  }

  .tag-cloud {
    gap: 8px;
  }

  .tag-chip {
    padding: 3px 10px;
    font-size: 0.8rem;
  }
}
</style>
