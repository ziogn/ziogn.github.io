<script lang="ts" setup>
import { inject } from 'vue'
import { TAG_FILTER_INJECTION_KEY, type TagFilterState } from '../util/useTagFilter'
import { tagChipStyle } from '../util/tagChip'
import { useData } from 'vitepress'

const { isDark } = useData()
const { allTags, selectedTags, compatibleTags, toggleTag, clearTags, isSelected } =
  inject(TAG_FILTER_INJECTION_KEY) as TagFilterState
</script>

<template>
  <div class="tag-panel">
    <div class="tag-cloud">
      <button
        v-for="tag in allTags"
        :key="tag.name"
        class="tag-chip-base tag-chip"
        :class="{
          active: isSelected(tag.name),
          incompatible: !compatibleTags.has(tag.name)
        }"
        :style="tagChipStyle(tag.name, isDark)"
        :aria-pressed="isSelected(tag.name) ? 'true' : 'false'"
        type="button"
        @click="toggleTag(tag.name)"
      >
        {{ tag.name }}
        <span class="tag-count">{{ tag.count }}</span>
      </button>
      <button
        v-if="selectedTags.size > 0"
        class="tag-chip-base tag-chip tag-clear"
        type="button"
        @click="clearTags()"
      >
        清除
      </button>
    </div>
  </div>
</template>

<style scoped>
.tag-cloud {
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

.tag-chip.incompatible {
  opacity: 0.35;
  cursor: not-allowed;
  pointer-events: none;
}

.tag-chip.tag-clear {
  background: transparent !important;
  color: var(--vp-c-text-2) !important;
  border-color: var(--vp-c-divider);
  font-size: 0.75rem;
  opacity: 0.7;
  cursor: pointer;
}

.tag-chip.tag-clear:hover {
  opacity: 1;
  color: var(--vp-c-text-1) !important;
  filter: brightness(1);
  transform: none;
}

@media (max-width: 767px) {
  .tag-cloud {
    gap: 8px;
  }
  .tag-chip {
    padding: 3px 10px;
    font-size: 0.8rem;
  }
}
</style>
