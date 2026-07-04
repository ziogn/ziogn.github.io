# Roadmap: Ziogn Notes (Tag 搜索功能)

## Overview

为现有的 VitePress 文档站添加标签搜索能力，使 tags 字段成为可搜索的导航维度。从 MiniSearch 索引增强开始，逐步叠加 `tag:` 前缀搜索、自动补全、标签汇总页、可点击标签和文档标签展示，最终实现完整的标签发现和导航体验。

## Phases

- [x] **Phase 1: Tag Indexing in Search** - 将 frontmatter tags 纳入 MiniSearch 索引，普通搜索即可匹配标签 (completed 2026-07-04)
- [ ] **Phase 2: Tag-Prefix Search** - `tag:` 前缀触发纯标签搜索，空格分隔多标签做 AND 交集
- [ ] **Phase 3: Tag Autocomplete** - 输入 `tag:` 时自动提示可用标签列表
- [ ] **Phase 4: Tag Summary Page** - 静态生成的 `/tags/` 汇总页面，展示所有标签及文章数量
- [ ] **Phase 5: Clickable Tags** - 标签可点击跳转到筛选结果，多标签累加为 AND 交集
- [ ] **Phase 6: Document Tag Display** - 在文档页面展示标签元信息

## Phase Details

### Phase 1: Tag Indexing in Search

**Goal**: 普通搜索能匹配到文档 frontmatter 中的 tags 字段内容
**Mode**: mvp
**Depends on**: Nothing (first phase)
**Requirements**: SEARCH-01
**Success Criteria** (what must be TRUE):

  1. User can search a term that appears only in a document's tags (not in title or body) and that document appears in search results
  2. User's normal search experience (without `tag:` prefix) is unchanged from before — same UI, same interaction
  3. Search results continue to use VitePress native search popup with existing styling

**Plans**: 1/1 plans complete

Plans:

- [x] 01-01-PLAN.md — Create search module with _render injection and MiniSearch config for tag indexing

### Phase 2: Tag-Prefix Search

**Goal**: 用户输入 `tag:` 前缀时，搜索范围限定在标签字段，支持多标签 AND 交集
**Mode**: mvp
**Depends on**: Phase 1
**Requirements**: SEARCH-02
**Success Criteria** (what must be TRUE):

  1. User can type `tag: flutter` in the search box and only documents tagged with "flutter" appear in results
  2. User can type `tag: flutter dart` and only documents tagged with BOTH "flutter" AND "dart" appear
  3. Documents without matching tags are excluded from tag-prefix search results
  4. Tag-prefix search happens in the same VitePress search box as normal search (no separate UI)

**Plans**: TBD
**UI hint**: yes

### Phase 3: Tag Autocomplete

**Goal**: 输入 `tag:` 前缀后，搜索框自动展示可用标签列表供选择
**Mode**: mvp
**Depends on**: Phase 2
**Requirements**: SEARCH-03
**Success Criteria** (what must be TRUE):

  1. When user types `tag:` in the search box, a dropdown list of all available tags appears
  2. User can select a tag from the suggestion list to autocomplete their search query
  3. Suggestions filter as user continues typing after `tag:` (e.g., `tag: fl` shows only tags starting with "fl")
  4. Autocomplete only activates after `tag:` prefix — normal search is unaffected

**Plans**: TBD
**UI hint**: yes

### Phase 4: Tag Summary Page

**Goal**: 静态生成的 `/tags/` 页面，展示所有标签及对应的文章数量
**Mode**: mvp
**Depends on**: Nothing (independent build-time generation)
**Requirements**: PAGE-01
**Success Criteria** (what must be TRUE):

  1. User can navigate to `/tags/` and see a page listing every tag used across all documents
  2. Each tag shows the count of documents using that tag (e.g., "flutter (5)")
  3. The page is statically generated at build time — no runtime computation or API calls
  4. Tags on the summary page are sorted in a readable order (alphabetical or by count)

**Plans**: TBD
**UI hint**: yes

### Phase 5: Clickable Tags

**Goal**: 标签可点击，点击后跳转到包含该标签的筛选结果页面
**Mode**: mvp
**Depends on**: Phase 2, Phase 4
**Requirements**: PAGE-02
**Success Criteria** (what must be TRUE):

  1. Clicking a tag on the tag summary page navigates to search results filtered by that tag
  2. Clicking a tag displayed on a document page navigates to search results filtered by that tag
  3. Clicking a second tag adds to the filter with AND logic (tag1 AND tag2), narrowing results

**Plans**: TBD
**UI hint**: yes

### Phase 6: Document Tag Display

**Goal**: 在每篇文档页面上展示该文档的标签
**Mode**: mvp
**Depends on**: Nothing (independent display enhancement)
**Requirements**: META-01
**Success Criteria** (what must be TRUE):

  1. Each document page displays its tags near the title or in a consistent, visible location
  2. Tags are rendered as clickable elements using the navigation mechanism from Phase 5
  3. Documents without tags do not show a tag section
  4. Tag display uses the project's indigo brand styling (consistent with site theme)

**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Tag Indexing in Search | 1/1 | Complete   | 2026-07-04 |
| 2. Tag-Prefix Search | 0/0 | Not started | - |
| 3. Tag Autocomplete | 0/0 | Not started | - |
| 4. Tag Summary Page | 0/0 | Not started | - |
| 5. Clickable Tags | 0/0 | Not started | - |
| 6. Document Tag Display | 0/0 | Not started | - |
