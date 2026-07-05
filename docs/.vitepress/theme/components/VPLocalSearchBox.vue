<script lang="ts" setup>
import localSearchIndex from '@localSearchIndex'
import tagIndex from 'virtual:tag-index'
import { tagHue, tagChipStyle, allTagsFromIndex, type TagItem } from '../util/tagChip'
import {
  computedAsync,
  debouncedWatch,
  onKeyStroke,
  useEventListener,
  useLocalStorage,
  useScrollLock,
  useSessionStorage
} from '@vueuse/core'
import { useFocusTrap } from '@vueuse/integrations/useFocusTrap'
import Mark from 'mark.js/src/vanilla.js'
import MiniSearch, { type SearchResult } from 'minisearch'
import { dataSymbol, inBrowser, useRouter } from 'vitepress'
import {
  computed,
  createApp,
  markRaw,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
  watchEffect,
  type Ref
} from 'vue'

// 从 vitepress 内部模块导入（通过 vitepress/dist/* 导出路径）
import { pathToFile } from 'vitepress/dist/client/app/utils'
import { escapeRegExp } from 'vitepress/dist/client/shared'
import { useData } from 'vitepress'
import { LRUCache } from 'vitepress/dist/client/theme-default/support/lru'
import { createSearchTranslate } from 'vitepress/dist/client/theme-default/support/translation'

// ModalTranslations 类型定义（从 vitepress types 复制，避免深层路径无法解析）
interface ModalTranslations {
  displayDetails?: string
  resetButtonTitle?: string
  backButtonTitle?: string
  noResultsText?: string
  footer?: {
    selectText?: string
    selectKeyAriaLabel?: string
    navigateText?: string
    navigateUpKeyAriaLabel?: string
    navigateDownKeyAriaLabel?: string
    closeText?: string
    closeKeyAriaLabel?: string
  }
}

const emit = defineEmits<{
  (e: 'close'): void
}>()

const el = shallowRef<HTMLElement>()
const resultsEl = shallowRef<HTMLElement>()

/* Search */

const searchIndexData = shallowRef(localSearchIndex)

// hmr
if (import.meta.hot) {
  import.meta.hot.accept('/@localSearchIndex', (m) => {
    if (m) {
      searchIndexData.value = m.default
    }
  })
}

interface Result {
  title: string
  titles: string[]
  text?: string
}

const vitePressData = useData()
const { activate } = useFocusTrap(el, {
  immediate: true,
  allowOutsideClick: true,
  clickOutsideDeactivates: true,
  escapeDeactivates: true
})
const { localeIndex, theme } = vitePressData
const searchIndex = computedAsync(async () =>
  markRaw(
    MiniSearch.loadJSON<Result>(
      (await searchIndexData.value[localeIndex.value]?.())?.default,
      {
        fields: ['title', 'titles', 'text'],
        storeFields: ['title', 'titles'],
        searchOptions: {
          fuzzy: 0.2,
          prefix: true,
          boost: { title: 4, text: 2, titles: 1 },
          ...(theme.value.search?.provider === 'local' &&
            theme.value.search.options?.miniSearch?.searchOptions)
        },
        ...(theme.value.search?.provider === 'local' &&
          theme.value.search.options?.miniSearch?.options)
      }
    )
  )
)

const disableQueryPersistence = computed(() => {
  return (
    theme.value.search?.provider === 'local' &&
    theme.value.search.options?.disableQueryPersistence === true
  )
})

const filterText = disableQueryPersistence.value
  ? ref('')
  : useSessionStorage('vitepress:local-search-filter', '')

const showDetailedList = useLocalStorage(
  'vitepress:local-search-detailed-list',
  theme.value.search?.provider === 'local' &&
    theme.value.search.options?.detailedView === true
)

const disableDetailedView = computed(() => {
  return (
    theme.value.search?.provider === 'local' &&
    (theme.value.search.options?.disableDetailedView === true ||
      theme.value.search.options?.detailedView === false)
  )
})

const buttonText = computed(() => {
  const options = theme.value.search?.options ?? theme.value.algolia

  return (
    options?.locales?.[localeIndex.value]?.translations?.button?.buttonText ||
    options?.translations?.button?.buttonText ||
    'Search'
  )
})

watchEffect(() => {
  if (disableDetailedView.value) {
    showDetailedList.value = false
  }
})

const results: Ref<(SearchResult & Result)[]> = shallowRef([])

const enableNoResults = ref(false)

watch(filterText, () => {
  enableNoResults.value = false
})

const mark = computedAsync(async () => {
  if (!resultsEl.value) return
  return markRaw(new Mark(resultsEl.value))
}, null)

const cache = new LRUCache<string, Map<string, string>>(16) // 16 files

/* tag 芯片筛选状态 */
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

/** 从 virtual:tag-index 提取所有唯一标签及文档计数（大小写忽略归一化） */
const allTags = computed<TagItem[]>(() => allTagsFromIndex(tagIndex as Record<string, string[]>))

const isDark = useData().isDark

/** 使用标签芯片 + 文本查询的搜索过滤函数 */
function searchWithTagFilter(
  index: MiniSearch<Result>,
  query: string
): (SearchResult & Result)[] {
  // 无查询且无选中标签 → 空结果
  if (!query.trim() && selectedTags.value.size === 0) {
    return []
  }

  // 有查询 → MiniSearch 搜索；无查询但有标签 → 用 wildcard 获取全部文档用于过滤
  let rawResults: (SearchResult & Result)[]
  if (query.trim()) {
    rawResults = index.search(query) as (SearchResult & Result)[]
  } else {
    rawResults = index.search((MiniSearch as any).wildcard) as (SearchResult & Result)[]
  }

  // 应用多标签 AND 过滤
  if (selectedTags.value.size > 0) {
    const selected = new Set(
      [...selectedTags.value].map((t) => t.toLowerCase())
    )
    rawResults = rawResults.filter((r) => {
      const url = r.id.split('#')[0]
      const docTags = (tagIndex as Record<string, string[]>)[url]
      if (!docTags || docTags.length === 0) return false
      return [...selected].every((tag) =>
        docTags.some((t) => t.toLowerCase() === tag)
      )
    })
  }

  return rawResults.slice(0, 16)
}

debouncedWatch(
  () => [searchIndex.value, filterText.value, showDetailedList.value, selectedTags.value.size] as const,
  async ([index, filterTextValue, showDetailedListValue], old, onCleanup) => {
    if (old?.[0] !== index) {
      // in case of hmr
      cache.clear()
    }

    let canceled = false
    onCleanup(() => {
      canceled = true
    })

    if (!index) return

    // Search (with tag: prefix support)
    results.value = searchWithTagFilter(index, filterTextValue)
    enableNoResults.value = true

    // Highlighting
    const mods = showDetailedListValue
      ? await Promise.all(results.value.map((r) => fetchExcerpt(r.id)))
      : []
    if (canceled) return
    for (const { id, mod } of mods) {
      const mapId = id.slice(0, id.indexOf('#'))
      let map = cache.get(mapId)
      if (map) continue
      map = new Map()
      cache.set(mapId, map)
      const comp = mod.default ?? mod
      if (comp?.render || comp?.setup) {
        const app = createApp(comp)
        // Silence warnings about missing components
        app.config.warnHandler = () => {}
        app.provide(dataSymbol, vitePressData)
        Object.defineProperties(app.config.globalProperties, {
          $frontmatter: {
            get() {
              return vitePressData.frontmatter.value
            }
          },
          $params: {
            get() {
              return vitePressData.page.value.params
            }
          }
        })
        const div = document.createElement('div')
        app.mount(div)
        const headings = div.querySelectorAll('h1, h2, h3, h4, h5, h6')
        headings.forEach((el) => {
          const href = el.querySelector('a')?.getAttribute('href')
          const anchor = href?.startsWith('#') && href.slice(1)
          if (!anchor) return
          let html = ''
          while ((el = el.nextElementSibling!) && !/^h[1-6]$/i.test(el.tagName))
            html += el.outerHTML
          map!.set(anchor, html)
        })
        app.unmount()
      }
      if (canceled) return
    }

    const terms = new Set<string>()

    results.value = results.value.map((r) => {
      const [id, anchor] = r.id.split('#')
      const map = cache.get(id)
      const text = map?.get(anchor) ?? ''
      for (const term in r.match) {
        terms.add(term)
      }
      return { ...r, text }
    })

    await nextTick()
    if (canceled) return

    await new Promise((r) => {
      mark.value?.unmark({
        done: () => {
          mark.value?.markRegExp(formMarkRegex(terms), { done: r })
        }
      })
    })

    const excerpts = el.value?.querySelectorAll('.result .excerpt') ?? []
    for (const excerpt of excerpts) {
      excerpt
        .querySelector('mark[data-markjs="true"]')
        ?.scrollIntoView({ block: 'center' })
    }
    // FIXME: without this whole page scrolls to the bottom
    resultsEl.value?.firstElementChild?.scrollIntoView({ block: 'start' })
  },
  { debounce: 200, immediate: true }
)

async function fetchExcerpt(id: string) {
  const file = pathToFile(id.slice(0, id.indexOf('#')))
  try {
    if (!file) throw new Error(`Cannot find file for id: ${id}`)
    return { id, mod: await import(/*@vite-ignore*/ file) }
  } catch (e) {
    console.error(e)
    return { id, mod: {} }
  }
}

/* Search input focus */

const searchInput = ref<HTMLInputElement>()
const disableReset = computed(() => {
  return filterText.value?.length <= 0
})
function focusSearchInput(select = true) {
  searchInput.value?.focus()
  select && searchInput.value?.select()
}

onMounted(() => {
  focusSearchInput()
})

function onSearchBarClick(event: PointerEvent) {
  if (event.pointerType === 'mouse') {
    focusSearchInput()
  }
}

/* Search keyboard selection */

const selectedIndex = ref(-1)
const disableMouseOver = ref(true)

watch(results, (r) => {
  selectedIndex.value = r.length ? 0 : -1
  scrollToSelectedResult()
})

function scrollToSelectedResult() {
  nextTick(() => {
    const selectedEl = document.querySelector('.result.selected')
    selectedEl?.scrollIntoView({ block: 'nearest' })
  })
}

onKeyStroke('ArrowUp', (event) => {
  event.preventDefault()
  selectedIndex.value--
  if (selectedIndex.value < 0) {
    selectedIndex.value = results.value.length - 1
  }
  disableMouseOver.value = true
  scrollToSelectedResult()
})

onKeyStroke('ArrowDown', (event) => {
  event.preventDefault()
  selectedIndex.value++
  if (selectedIndex.value >= results.value.length) {
    selectedIndex.value = 0
  }
  disableMouseOver.value = true
  scrollToSelectedResult()
})

const router = useRouter()

onKeyStroke('Enter', (e) => {
  if (e.isComposing) return

  if (e.target instanceof HTMLButtonElement && e.target.type !== 'submit')
    return

  const selectedPackage = results.value[selectedIndex.value]
  if (e.target instanceof HTMLInputElement && !selectedPackage) {
    e.preventDefault()
    return
  }

  if (selectedPackage) {
    router.go(selectedPackage.id)
    emit('close')
  }
})

onKeyStroke('Escape', () => {
  emit('close')
})

// Translations
const defaultTranslations: { modal: ModalTranslations } = {
  modal: {
    displayDetails: 'Display detailed list',
    resetButtonTitle: 'Reset search',
    backButtonTitle: 'Close search',
    noResultsText: 'No results for',
    footer: {
      selectText: 'to select',
      selectKeyAriaLabel: 'enter',
      navigateText: 'to navigate',
      navigateUpKeyAriaLabel: 'up arrow',
      navigateDownKeyAriaLabel: 'down arrow',
      closeText: 'to close',
      closeKeyAriaLabel: 'escape'
    }
  }
}

const translate = createSearchTranslate(defaultTranslations)

// Back

onMounted(() => {
  // Prevents going to previous site
  window.history.pushState(null, '', null)
})

useEventListener('popstate', (event) => {
  event.preventDefault()
  emit('close')
})

/** Lock body */
const isLocked = useScrollLock(inBrowser ? document.body : null)

onMounted(() => {
  nextTick(() => {
    isLocked.value = true
    nextTick().then(() => activate())
  })
})

onBeforeUnmount(() => {
  isLocked.value = false
})

function resetSearch() {
  filterText.value = ''
  nextTick().then(() => focusSearchInput(false))
}

function formMarkRegex(terms: Set<string>) {
  return new RegExp(
    [...terms]
      .sort((a, b) => b.length - a.length)
      .map((term) => `(${escapeRegExp(term)})`)
      .join('|'),
    'gi'
  )
}

function onMouseMove(e: MouseEvent) {
  if (!disableMouseOver.value) return
  const el = (e.target as HTMLElement)?.closest<HTMLAnchorElement>('.result')
  const index = Number.parseInt(el?.dataset.index!)
  if (index >= 0 && index !== selectedIndex.value) {
    selectedIndex.value = index
  }
  disableMouseOver.value = false
}
</script>

<template>
  <Teleport to="body">
    <div
      ref="el"
      role="button"
      :aria-owns="results?.length ? 'localsearch-list' : undefined"
      aria-expanded="true"
      aria-haspopup="listbox"
      aria-labelledby="localsearch-label"
      class="VPLocalSearchBox"
    >
      <div class="backdrop" @click="$emit('close')" />

      <div class="shell">
        <form
          class="search-bar"
          @pointerup="onSearchBarClick($event)"
          @submit.prevent=""
        >
          <label
            :title="buttonText"
            id="localsearch-label"
            for="localsearch-input"
          >
            <span aria-hidden="true" class="vpi-search search-icon local-search-icon" />
          </label>
          <div class="search-actions before">
            <button
              class="back-button"
              :title="translate('modal.backButtonTitle')"
              @click="$emit('close')"
            >
              <span class="vpi-arrow-left local-search-icon" />
            </button>
          </div>
          <input
            ref="searchInput"
            v-model="filterText"
            :aria-activedescendant="selectedIndex > -1 ? ('localsearch-item-' + selectedIndex) : undefined"
            aria-autocomplete="both"
            :aria-controls="results?.length ? 'localsearch-list' : undefined"
            aria-labelledby="localsearch-label"
            autocapitalize="off"
            autocomplete="off"
            autocorrect="off"
            class="search-input"
            id="localsearch-input"
            enterkeyhint="go"
            maxlength="64"
            :placeholder="buttonText"
            spellcheck="false"
            type="search"
          />
          <div class="search-actions">
            <button
              v-if="!disableDetailedView"
              class="toggle-layout-button"
              type="button"
              :class="{ 'detailed-list': showDetailedList }"
              :title="translate('modal.displayDetails')"
              @click="
                selectedIndex > -1 && (showDetailedList = !showDetailedList)
              "
            >
              <span class="vpi-layout-list local-search-icon" />
            </button>

            <button
              class="clear-button"
              type="reset"
              :disabled="disableReset"
              :title="translate('modal.resetButtonTitle')"
              @click="resetSearch"
            >
              <span class="vpi-delete local-search-icon" />
            </button>
          </div>
        </form>

        <div v-if="allTags.length" class="tag-filters">
          <button
            v-for="tag in allTags"
            :key="tag.name"
            class="tag-chip-base tag-chip"
            :class="{ active: selectedTags.has(tag.name) }"
            :style="tagChipStyle(tag.name, isDark.value)"
            @click="toggleTag(tag.name)"
            :aria-pressed="selectedTags.has(tag.name) ? 'true' : 'false'"
            type="button"
          >
            {{ tag.name }}
            <span class="tag-count">{{ tag.count }}</span>
          </button>
          <button
            v-if="selectedTags.size > 0"
            class="tag-chip-base tag-chip tag-clear"
            type="button"
            @click="selectedTags = new Set()"
          >
            清除
          </button>
        </div>

        <ul
          ref="resultsEl"
          :id="results?.length ? 'localsearch-list' : undefined"
          :role="results?.length ? 'listbox' : undefined"
          :aria-labelledby="results?.length ? 'localsearch-label' : undefined"
          class="results"
          @mousemove="onMouseMove"
        >
          <li
            v-for="(p, index) in results"
            :key="p.id"
            :id="'localsearch-item-' + index"
            :aria-selected="selectedIndex === index ? 'true' : 'false'"
            role="option"
          >
            <a
              :href="p.id"
              class="result"
              :class="{
                selected: selectedIndex === index
              }"
              :aria-label="[...p.titles, p.title].join(' > ')"
              @mouseenter="!disableMouseOver && (selectedIndex = index)"
              @focusin="selectedIndex = index"
              @click="$emit('close')"
              :data-index="index"
            >
              <div>
                <div class="titles">
                  <span class="title-icon">#</span>
                  <span
                    v-for="(t, index) in p.titles"
                    :key="index"
                    class="title"
                  >
                    <span class="text" v-html="t" />
                    <span class="vpi-chevron-right local-search-icon" />
                  </span>
                  <span class="title main">
                    <span class="text" v-html="p.title" />
                  </span>
                </div>

                <div v-if="showDetailedList" class="excerpt-wrapper">
                  <div v-if="p.text" class="excerpt" inert>
                    <div class="vp-doc" v-html="p.text" />
                  </div>
                  <div class="excerpt-gradient-bottom" />
                  <div class="excerpt-gradient-top" />
                </div>
              </div>
            </a>
          </li>
          <li
            v-if="filterText && !results.length && enableNoResults"
            class="no-results"
          >
            {{ translate('modal.noResultsText') }} "<strong>{{ filterText }}</strong
            >"
          </li>
        </ul>

        <div class="search-keyboard-shortcuts">
          <span>
            <kbd :aria-label="translate('modal.footer.navigateUpKeyAriaLabel')">
              <span class="vpi-arrow-up navigate-icon" />
            </kbd>
            <kbd :aria-label="translate('modal.footer.navigateDownKeyAriaLabel')">
              <span class="vpi-arrow-down navigate-icon" />
            </kbd>
            {{ translate('modal.footer.navigateText') }}
          </span>
          <span>
            <kbd :aria-label="translate('modal.footer.selectKeyAriaLabel')">
              <span class="vpi-corner-down-left navigate-icon" />
            </kbd>
            {{ translate('modal.footer.selectText') }}
          </span>
          <span>
            <kbd :aria-label="translate('modal.footer.closeKeyAriaLabel')">esc</kbd>
            {{ translate('modal.footer.closeText') }}
          </span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.VPLocalSearchBox {
  position: fixed;
  z-index: 100;
  inset: 0;
  display: flex;
}

.backdrop {
  position: absolute;
  inset: 0;
  background: var(--vp-backdrop-bg-color);
  transition: opacity 0.5s;
}

.shell {
  position: relative;
  padding: 12px;
  margin: 64px auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: var(--vp-local-search-bg);
  width: min(100vw - 60px, 900px);
  height: min-content;
  max-height: min(100vh - 128px, 900px);
  border-radius: 6px;
}

@media (max-width: 767px) {
  .shell {
    margin: 0;
    width: 100vw;
    height: 100vh;
    max-height: none;
    border-radius: 0;
  }
}

.search-bar {
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  cursor: text;
}

@media (max-width: 767px) {
  .search-bar {
    padding: 0 8px;
  }
}

.search-bar:focus-within {
  border-color: var(--vp-c-brand-1);
}

.local-search-icon {
  display: block;
  font-size: 18px;
}

.navigate-icon {
  display: block;
  font-size: 14px;
}

.search-icon {
  margin: 8px;
}

@media (max-width: 767px) {
  .search-icon {
    display: none;
  }
}

.search-input {
  padding: 6px 12px;
  font-size: inherit;
  width: 100%;
}

@media (max-width: 767px) {
  .search-input {
    padding: 6px 4px;
  }
}

.search-actions {
  display: flex;
  gap: 4px;
}

@media (any-pointer: coarse) {
  .search-actions {
    gap: 8px;
  }
}

@media (min-width: 769px) {
  .search-actions.before {
    display: none;
  }
}

.search-actions button {
  padding: 8px;
}

.search-actions button:not([disabled]):hover,
.toggle-layout-button.detailed-list {
  color: var(--vp-c-brand-1);
}

.search-actions button.clear-button:disabled {
  opacity: 0.37;
}

.search-keyboard-shortcuts {
  font-size: 0.8rem;
  opacity: 75%;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  line-height: 14px;
}

.search-keyboard-shortcuts span {
  display: flex;
  align-items: center;
  gap: 4px;
}

@media (max-width: 767px) {
  .search-keyboard-shortcuts {
    display: none;
  }
}

.search-keyboard-shortcuts kbd {
  background: rgba(128, 128, 128, 0.1);
  border-radius: 4px;
  padding: 3px 6px;
  min-width: 24px;
  display: inline-block;
  text-align: center;
  vertical-align: middle;
  border: 1px solid rgba(128, 128, 128, 0.15);
  box-shadow: 0 2px 2px 0 rgba(0, 0, 0, 0.1);
}

.results {
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.result {
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 4px;
  transition: none;
  line-height: 1rem;
  border: solid 2px var(--vp-local-search-result-border);
  outline: none;
}

.result > div {
  margin: 12px;
  width: 100%;
  overflow: hidden;
}

@media (max-width: 767px) {
  .result > div {
    margin: 8px;
  }
}

.titles {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  position: relative;
  z-index: 1001;
  padding: 2px 0;
}

.title {
  display: flex;
  align-items: center;
  gap: 4px;
}

.title.main {
  font-weight: 500;
}

.title-icon {
  opacity: 0.5;
  font-weight: 500;
  color: var(--vp-c-brand-1);
}

.title svg {
  opacity: 0.5;
}

.result.selected {
  --vp-local-search-result-bg: var(--vp-local-search-result-selected-bg);
  border-color: var(--vp-local-search-result-selected-border);
}

.excerpt-wrapper {
  position: relative;
}

.excerpt {
  opacity: 50%;
  pointer-events: none;
  max-height: 140px;
  overflow: hidden;
  position: relative;
  margin-top: 4px;
}

.result.selected .excerpt {
  opacity: 1;
}

.excerpt :deep(*) {
  font-size: 0.8rem !important;
  line-height: 130% !important;
}

.titles :deep(mark),
.excerpt :deep(mark) {
  background-color: var(--vp-local-search-highlight-bg);
  color: var(--vp-local-search-highlight-text);
  border-radius: 2px;
  padding: 0 2px;
}

.excerpt :deep(.vp-code-group) .tabs {
  display: none;
}

.excerpt :deep(.vp-code-group) div[class*='language-'] {
  border-radius: 8px !important;
}

.excerpt-gradient-bottom {
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 100%;
  height: 8px;
  background: linear-gradient(transparent, var(--vp-local-search-result-bg));
  z-index: 1000;
}

.excerpt-gradient-top {
  position: absolute;
  top: -1px;
  left: 0;
  width: 100%;
  height: 8px;
  background: linear-gradient(var(--vp-local-search-result-bg), transparent);
  z-index: 1000;
}

.result.selected .titles,
.result.selected .title-icon {
  color: var(--vp-c-brand-1) !important;
}

.no-results {
  font-size: 0.9rem;
  text-align: center;
  padding: 12px;
}

.tag-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  max-height: 100px;
  overflow-y: auto;
}

.tag-chip {
  padding: 2px 10px;
  font-size: 0.8rem;
  cursor: pointer;
}

.tag-chip.active {
  box-shadow: 0 0 0 2px currentColor;
  filter: brightness(1.1);
}

.tag-chip.tag-clear {
  background: transparent !important;
  color: var(--vp-c-text-2) !important;
  border-color: var(--vp-c-divider);
  font-size: 0.75rem;
  opacity: 0.7;
}

.tag-chip.tag-clear:hover {
  opacity: 1;
  color: var(--vp-c-text-1) !important;
}

svg {

  flex: none;
}
</style>
