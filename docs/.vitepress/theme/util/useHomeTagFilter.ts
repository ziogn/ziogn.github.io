import { ref, computed, type ComputedRef, type Ref } from 'vue'
import tagIndex from 'virtual:tag-index'

interface TagIndexEntry {
  tags: string[]
  title: string
}

const selectedTags = ref<Set<string>>(new Set())

export function useHomeTagFilter() {
  const typedIndex = tagIndex as Record<string, TagIndexEntry>

  const toggleTag = (tag: string) => {
    const next = new Set(selectedTags.value)
    if (next.has(tag)) next.delete(tag)
    else next.add(tag)
    selectedTags.value = next
  }

  const clear = () => {
    selectedTags.value = new Set()
  }

  const filteredDocs: ComputedRef<{ url: string; title: string }[]> = computed(() => {
    const entries = Object.entries(typedIndex)
    if (selectedTags.value.size === 0) {
      return entries.map(([url, entry]) => ({ url, title: entry.title }))
    }
    return entries
      .filter(([, entry]) => {
        const docTags = entry.tags.map((t) => t.toLowerCase())
        return Array.from(selectedTags.value).every((st) =>
          docTags.includes(st.toLowerCase())
        )
      })
      .map(([url, entry]) => ({ url, title: entry.title }))
  })

  const selectedCount: ComputedRef<number> = computed(() => selectedTags.value.size)
  const filteredCount: ComputedRef<number> = computed(() => filteredDocs.value.length)
  const isEmpty: ComputedRef<boolean> = computed(() => filteredCount.value === 0 && selectedCount.value > 0)

  return {
    selectedTags,
    toggleTag,
    clear,
    filteredDocs,
    selectedCount,
    filteredCount,
    isEmpty
  }
}
