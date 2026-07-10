import { ref, computed, type Ref, type ComputedRef } from 'vue'
import tagIndex from 'virtual:tag-index'
import { allTagsFromIndex, type TagItem } from './tagChip'

export interface DocEntry {
  title: string
  url: string
  tags: string[]
}

export interface TagFilterState {
  selectedTags: Ref<Set<string>>
  allTags: ComputedRef<TagItem[]>
  filteredDocs: ComputedRef<DocEntry[]>
  compatibleTags: ComputedRef<Set<string>>
  toggleTag: (tag: string) => void
  clearTags: () => void
  isSelected: (tag: string) => boolean
}

export const TAG_FILTER_INJECTION_KEY = Symbol('tagFilter')

export function useTagFilter(): TagFilterState {
  const selectedTags = ref<Set<string>>(new Set())

  const allTags = computed<TagItem[]>(() =>
    allTagsFromIndex(tagIndex as Record<string, { tags: string[]; title: string }>)
  )

  const allDocs = computed<DocEntry[]>(() => {
    const idx = tagIndex as Record<string, { tags: string[]; title: string }>
    return Object.entries(idx).map(([url, entry]) => ({
      title: entry.title,
      url,
      tags: entry.tags,
    }))
  })

  const filteredDocs = computed<DocEntry[]>(() => {
    const selected = selectedTags.value
    if (selected.size === 0) return allDocs.value
    const lowerSelected = [...selected].map((t) => t.toLowerCase())
    return allDocs.value.filter((doc) =>
      lowerSelected.every((tag) =>
        doc.tags.some((t) => t.toLowerCase() === tag)
      )
    )
  })

  const compatibleTags = computed<Set<string>>(() => {
    const selected = selectedTags.value
    if (selected.size === 0) {
      return new Set(allTags.value.map((t) => t.name))
    }
    const lowerSelected = [...selected].map((t) => t.toLowerCase())
    const compatible = new Set<string>()
    for (const entry of allDocs.value) {
      const docTags = entry.tags.map((t) => t.toLowerCase())
      if (lowerSelected.every((tag) => docTags.includes(tag))) {
        for (const tag of entry.tags) {
          compatible.add(tag.toLowerCase())
        }
      }
    }
    return compatible
  })

  function toggleTag(tag: string) {
    const next = new Set(selectedTags.value)
    if (next.has(tag)) {
      next.delete(tag)
    } else {
      next.add(tag)
    }
    selectedTags.value = next
  }

  function clearTags() {
    selectedTags.value = new Set()
  }

  function isSelected(tag: string): boolean {
    return selectedTags.value.has(tag)
  }

  return {
    selectedTags,
    allTags,
    filteredDocs,
    compatibleTags,
    toggleTag,
    clearTags,
    isSelected,
  }
}
