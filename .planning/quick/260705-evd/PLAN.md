# Quick Plan: Tag Chip Filter UI for VPLocalSearchBox

## Summary

Replace the existing `tag:` prefix search with a visual tag chip filter UI below the search bar. Extract all unique tags from `virtual:tag-index`, render them as color-coded chip buttons, and implement multi-select AND filtering on search results. Show per-tag document counts on each chip.

## Files Modified

| File | Change |
|------|--------|
| `docs/.vitepress/theme/components/VPLocalSearchBox.vue` | Rewrite search logic, add tag chip template and CSS |

## Implementation Details

### 1. Remove `tag:` prefix logic from `searchWithTagFilter`

Delete the TAG_PREFIX detection block (lines 171-195 in the current file). Simplify the function to:

```ts
function searchWithTagFilter(
  index: MiniSearch<Result>,
  query: string
): (SearchResult & Result)[] {
  // Empty query + no tags selected = empty results (no-op state)
  if (!query.trim() && selectedTags.value.size === 0) {
    return []
  }

  // Get base results: use MiniSearch.wildcard for empty query when tags are active,
  // so tag filtering can operate on all documents
  let rawResults: (SearchResult & Result)[]
  if (query.trim()) {
    rawResults = index.search(query) as (SearchResult & Result)[]
  } else {
    // Empty query + tags selected: get all documents for tag filtering
    rawResults = index.search(MiniSearch.wildcard as any) as (SearchResult & Result)[]
  }

  // Apply tag filter (multi-select AND)
  if (selectedTags.value.size > 0) {
    const selected = new Set(
      [...selectedTags.value].map((t) => t.toLowerCase())
    )
    rawResults = rawResults.filter((r) => {
      const url = r.id.split('#')[0]
      const docTags: string[] | undefined = (tagIndex as Record<string, string[]>)[url]
      if (!docTags || docTags.length === 0) return false
      // Every selected tag must be present in the document's tags
      return [...selected].every((tag) =>
        docTags.some((t) => t.toLowerCase() === tag)
      )
    })
  }

  return rawResults.slice(0, 16)
}
```

**Note:** `MiniSearch.wildcard` is a built-in Symbol in MiniSearch 7.x that returns all indexed documents. If TypeScript complains about the type, use `(MiniSearch as any).wildcard`.

### 2. Add reactive state for tag selection

```ts
// In <script setup>, after the `tagIndex` import (line 3):

interface TagItem {
  name: string
  count: number
}

const selectedTags = ref(new Set<string>())

function toggleTag(tag: string) {
  const next = new Set(selectedTags.value)
  if (next.has(tag)) {
    next.delete(tag)
  } else {
    next.add(tag)
  }
  selectedTags.value = next
}
```

### 3. Compute unique tags with counts

```ts
const allTags = computed<TagItem[]>(() => {
  const countMap = new Map<string, number>()
  for (const [, tags] of Object.entries(tagIndex as Record<string, string[]>)) {
    for (const tag of tags) {
      countMap.set(tag, (countMap.get(tag) ?? 0) + 1)
    }
  }
  return Array.from(countMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
})
```

### 4. Deterministic HSL color generation

```ts
function tagHue(tag: string): number {
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = ((hash << 5) - hash) + tag.charCodeAt(i)
    hash |= 0 // force 32-bit integer
  }
  return ((hash % 360) + 360) % 360 // always positive 0-359
}

function tagChipStyle(tag: string): Record<string, string> {
  const hue = tagHue(tag)
  // Use CSS custom properties so the chip style is driven by a single hue value
  return {
    '--tag-hue': String(hue)
  }
}
```

The CSS will use `var(--tag-hue)` with fixed saturation (50%) and two lightness levels:
- **Light mode background:** `hsla(var(--tag-hue), 50%, 50%, 0.12)` (semi-transparent tint)
- **Light mode text:** `hsl(var(--tag-hue), 45%, 30%)` (darker hue)
- **Dark mode background:** `hsla(var(--tag-hue), 50%, 60%, 0.15)`
- **Dark mode text:** `hsl(var(--tag-hue), 50%, 65%)`

Use a CSS `:root` + dark selector or prefer `color-mix` / media query to adjust. Since the chips live inside `.VPLocalSearchBox` which already respects VitePress theme, use a CSS approach:

```css
/* In <style scoped> */
.tag-chip {
  --chip-bg: hsla(var(--tag-hue), 50%, 50%, 0.12);
  --chip-text: hsl(var(--tag-hue), 50%, 30%);
  --chip-border: hsla(var(--tag-hue), 50%, 50%, 0.2);
  --chip-active-bg: hsla(var(--tag-hue), 50%, 50%, 0.22);
}
/* Handle dark mode: the `.dark` class is on <html> in VitePress */
.dark .tag-chip {
  --chip-bg: hsla(var(--tag-hue), 50%, 60%, 0.15);
  --chip-text: hsl(var(--tag-hue), 50%, 65%);
  --chip-border: hsla(var(--tag-hue), 50%, 60%, 0.25);
  --chip-active-bg: hsla(var(--tag-hue), 50%, 60%, 0.28);
}
```

**Note:** Since `scoped` styles don't cascade to `.dark` selector on `<html>`, use `:deep()` or `v-bind` or prefer inline-ComputedStyle approach. Actually the simplest reliable approach: watch `isDark` from `useData()` and compute inline styles reactively. The tag chip `:style` binding uses a computed property:

```ts
const isDark = useData().isDark

const tagChipStyles = computed(() => {
  const baseLightness = isDark.value ? 60 : 35
  return (tag: string) => ({
    backgroundColor: `hsla(${tagHue(tag)}, 50%, ${baseLightness}%, 0.15)`,
    color: `hsl(${tagHue(tag)}, 50%, ${baseLightness}%)`,
    borderColor: `hsla(${tagHue(tag)}, 50%, ${baseLightness}%, 0.25)`,
  })
})
```

Then in template: `:style="tagChipStyles(tag.name)"`. This method avoids scoped CSS scoping issues with `.dark` selector entirely.

### 5. Template changes

Add between the `</form>` (line 547) and `<ul ref="resultsEl">` (line 549):

```html
<div v-if="allTags.length" class="tag-filters">
  <span class="tag-filters-label">Tags:</span>
  <button
    v-for="tag in allTags"
    :key="tag.name"
    class="tag-chip"
    :class="{ active: selectedTags.has(tag.name) }"
    :style="tagChipStyles(tag.name)"
    @click="toggleTag(tag.name)"
    :aria-pressed="selectedTags.has(tag.name) ? 'true' : 'false'"
  >
    {{ tag.name }}
    <span class="tag-count">{{ tag.count }}</span>
  </button>
</div>
```

When tag fitlers are active and no search results match, the existing no-results message (`No results for`) at line 603-608 handles it.

### 6. Update the watcher to pass `selectedTags` into search

The existing watcher at line 204 should already re-trigger because `searchWithTagFilter` reads `selectedTags.value` directly. No change needed to the watcher dependencies — the `ref` value is read inside `searchWithTagFilter` which is called from the watcher body, so it will re-execute when `selectedTags` changes.

**However**, `debouncedWatch` currently watches `[searchIndex.value, filterText.value, showDetailedList.value]`. It does NOT watch `selectedTags`. Since `searchWithTagFilter` imperatively reads `selectedTags.value` inside the watcher callback, Vue should still re-invoke when `selectedTags` changes because the ref is accessed during execution.

If the debounced watch doesn't trigger on `selectedTags` change, add a `selectedTags.size` dummy dependency to the watch array, or call `triggerRef(selectedTags)` when toggling. The safest approach: add `selectedTags.value.size` to the watcher's dependency array.

**Update line 205:**
```ts
debouncedWatch(
  () => [searchIndex.value, filterText.value, showDetailedList.value, selectedTags.value.size] as const,
```

### 7. URL matching between tagIndex and search results

The `tagIndex` uses keys like `/flutter-widget` (from `fileToUrl`). Search results have `r.id` like `/flutter-widget#introduction` or `/flutter-widget` (with optional anchor). The split on `#` and take `[0]` handles this — already proven in the current code at line 182.

**Edge case: `index.md` → `/`** — the tagIndex maps `index.md` to `'/'`. Search result IDs for the home page will be `/` or `/#something`. The split on `#` + `[0]` returns `'/'` which matches the tagIndex key.

### 8. CSS additions

Add to the `<style scoped>` block (before the existing SVG rule at line 925):

```css
.tag-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  max-height: 100px;
  overflow-y: auto;
}

.tag-filters-label {
  font-size: 0.8rem;
  opacity: 0.6;
  margin-right: 2px;
  white-space: nowrap;
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-size: 0.8rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
  line-height: 1.6;
}

.tag-chip:hover {
  filter: brightness(1.15);
  transform: translateY(-1px);
}

.tag-chip.active {
  box-shadow: 0 0 0 2px currentColor;
  filter: brightness(1.1);
}

.tag-count {
  font-size: 0.7rem;
  opacity: 0.75;
}
```

The chips use `border-radius: 999px` for pill shape. The `active` class adds a ring around the chip. The `filter: brightness()` gives hover/active feedback without needing separate color calculations.

### 9. Edge cases

| Edge case | Behavior |
|-----------|----------|
| No query, tags selected | `MiniSearch.wildcard` returns all docs, filtered by AND-tag logic |
| No query, no tags | Empty results (existing behavior) |
| Query + tags | MiniSearch search + tag filter (narrows results) |
| Tag selected, query cleared | Results switch to full `wildcard` list filtered by tag |
| All tags removed | Results revert to normal search behavior |
| Document has no tags | Excluded from tag-filtered results (already excluded from tagIndex) |
| Tag filter produces 0 results | Existing no-results message shows |
| Very narrow viewport | Tag chips wrap naturally via flex-wrap |
| Many tags (>20) | Container has `max-height: 100px` with `overflow-y: auto` |
| Dark mode | `tagChipStyles` computed reacts to `isDark`, adjusts lightness |

### 10. No other files need changes

- `search/index.ts` — no change; `tag:` prefix injection into MiniSearch text was for the old approach; since we're removing tag: prefix search entirely, the hidden `<span>` injection becomes irrelevant for search. However, removing it would require updating search/index.ts which is out of scope for this task. The hidden spans cause no harm (they occupy ~0 bytes in index).
- `tag-index-plugin.ts` — no change; the virtual module already provides the data structure we need.
- `custom.css` — no change; all tag styling is scoped inside VPLocalSearchBox.

## Verification

1. Run `npm run build` — must succeed with no TypeScript errors
2. Run `npm run dev` — navigate to a page, open search (Cmd+K), verify:
   - Tag chip row appears below search bar with colored pills
   - Each chip shows tag name + count in parentheses
   - Clicking a chip adds it to filter (ring highlight)
   - Clicking again removes chip
   - Selecting one tag: results filtered to documents with that tag
   - Selecting two tags: results filtered to documents with BOTH tags (AND)
   - Clearing search query with tags selected: still shows tag-filtered results
   - Dark mode toggle: tag colors adjust appropriately
