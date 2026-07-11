# Roadmap: Ziogn Notes

## Milestone v1.0 — 标签云 & 首页改造

**Started:** 2026-07-05
**Completed:** 2026-07-05
**Status:** Complete

### Overview

This milestone extends the existing tag chip filtering in the search modal with dedicated tag cloud navigation. Phase 1 creates a standalone tag cloud page accessible from the navigation bar, displaying all tags with document counts using the same HSL color system and pill-style chips. Phase 2 cleans up the homepage hero by removing the obsolete "开始浏览" button and adding a tag cloud section for at-a-glance content discovery.

### Phases

- [x] **Phase 1: 标签云页面** - 创建独立标签云页面与导航栏入口 (completed 2026-07-05)
- [x] **Phase 2: 首页改造** - 移除以废弃 hero 按钮并添加标签云展示区 (completed 2026-07-05)

### Phase Details

#### Phase 1: 标签云页面

**Goal**: Users can access and browse all tags from a dedicated tag cloud page via the navigation bar
**Depends on**: Nothing (first phase)
**Requirements**: TAGS-01, TAGS-02, TAGS-03
**Success Criteria** (what must be TRUE):

  1. User can click a tag cloud icon/button in the right side of the nav bar to navigate to the tag cloud page
  2. Tag cloud page displays all unique tags extracted from the `virtual:tag-index` data source
  3. Each tag on the tag cloud page shows its associated document count
  4. Each tag chip uses HSL deterministic color, pill (border-radius: 999px) shape, and hover effect (brightness increase, slight translateY) matching the search modal tag chips

**Plans**: 1/1 plans complete

**Plans**:

- [x] 01-01-PLAN.md — 标签云页面：共享工具函数提取 + 标签云页面组件 + 导航栏入口

**UI hint**: yes

#### Phase 2: 首页改造

**Goal**: Homepage provides a cleaner landing experience with a tag cloud area for document discovery
**Depends on**: Nothing (independent; can be done before or after Phase 1)
**Requirements**: HOME-01, HOME-02
**Success Criteria** (what must be TRUE):

  1. Homepage hero section no longer displays the "开始浏览" action button
  2. Homepage displays a tag cloud section showing all tags from the document collection
  3. Each tag chip on the homepage uses the same HSL deterministic color, pill shape, and hover effect as the search modal tag chips
  4. User can see the tag cloud area without scrolling past the hero section (visible in the upper portion of the page)

**Plans**: 1/1 plans complete

**Plans**:

- [x] 02-01-PLAN.md — 首页改造：移除 hero actions 按钮、提取公用标签芯片样式、创建 HomeTagCloud 组件并通过 home-hero-after slot 集成到主题

**UI hint**: yes

## Milestone v1.1 — 首页交互优化

**Started:** 2026-07-06
**Completed:** 2026-07-10
**Status:** Complete

### Overview

This milestone improves the homepage experience by giving the document list a clearer title and making tags interactive for content filtering. Phase 3 is a straightforward rename of the document list heading. Phase 4 enables tag-click filtering directly on the homepage — users can select multiple tags with AND logic, see visual highlight states, and deselect to expand the list.

### Phases

- [x] **Phase 3: 首页文章列表标题更新** - 将首页文档列表标题从「其他」改为「文章列表」 (completed 2026-07-06)
- [x] **Phase 4: 首页标签交互筛选** - 标签点击筛选文章列表、多标签 AND 组合、选中高亮与取消 (completed 2026-07-06)

### Phase Details

#### Phase 3: 首页文章列表标题更新

**Goal**: Users see a clearer, more descriptive title for the homepage document list
**Depends on**: Nothing (Markdown-only change)
**Requirements**: HOME-03
**Success Criteria** (what must be TRUE):

  1. User sees "文章列表" instead of "其他" as the heading for the document list on the homepage

**Plans**: 1/1 plans complete

**Plans**:

- [x] 03-01-PLAN.md — Update homepage document list heading from "其他" to "文章列表"

#### Phase 4: 首页标签交互筛选

**Goal**: Users can click tags on the homepage tag cloud to filter the document list, supporting multi-select AND logic with visual feedback
**Depends on**: Phase 2 (requires the homepage tag cloud from Phase 2)
**Requirements**: HOME-04, HOME-05, HOME-06
**Success Criteria** (what must be TRUE):

  1. User can click a tag chip in the homepage tag cloud to filter the document list below, showing only documents tagged with that tag
  2. User can click additional tags to narrow results via AND logic (only documents matching ALL selected tags appear)
  3. Selected tag chips display a distinct visual highlight (e.g., filled background, border change) distinguishing them from unselected chips
  4. User can click an already-selected tag chip to deselect it and expand the filtered list
  5. When no tags are selected, the full document list is displayed as it was before filtering

**Plans**: 2/2 plans complete

**UI hint**: yes

**Plans**:

- [x] 04-01-PLAN.md — 数据层扩展：tagIndex 标题注入 + 消费者类型更新 + useHomeTagFilter composable
- [x] 04-02-PLAN.md — 交互层实现：HomeTagCloud 标签点击 + FilteredDocList 筛选列表

## Milestone v1.2 — 标签云页面交互筛选

**Started:** 2026-07-10
**Status:** Pending

### Overview

This milestone adds interactive tag filtering to the tag cloud page at /tags. The existing static tag cloud (displaying all tags as non-interactive pill chips) is extended with a dual-column layout where clicking tags filters the document list via multi-select AND logic. Phase 5 introduces the reactive data layer for tag selection state and document filtering. Phase 6 wires the full interaction and visual layout for a complete, user-friendly filtering experience.

### Phases

- [x] **Phase 5: 数据层扩展** - 添加标签选择状态管理与文档列表 AND 筛选核心逻辑 (completed 2026-07-10)
- [x] **Phase 6: 交互与布局实现** - 实现左标签右文档列表双栏布局与交互式筛选 (completed 2026-07-11)

### Phase Details

#### Phase 5: 数据层扩展

**Goal**: Tag cloud component has reactive state management and document filtering logic capable of AND-intersection across selected tags
**Depends on**: Nothing (uses existing `virtual:tag-index` and `tagChip.ts` utilities; independent of prior phases)
**Requirements**: TAGCLOUD-06
**Success Criteria** (what must be TRUE):

  1. Tag cloud component tracks a reactive `Set<string>` of selected tags that can be updated programmatically (add/remove/clear)
  2. Document list filtering function correctly computes AND-intersection: given N selected tags, returns only documents whose tags include ALL N selected tags
  3. Filtering returns the full document list when no tags are selected (pass-through behavior)
  4. Document list data is sourced from `tagIndex` with each document's title, URL path, and tags available for downstream rendering

**Plans**: 1/1 plans complete

- [ ] 05-PLAN.md

#### Phase 6: 交互与布局实现

**Goal**: Users can interactively filter documents on the /tags page by clicking tag chips in a dual-column layout with clear visual state feedback
**Depends on**: Phase 5
**Requirements**: TAGCLOUD-04, TAGCLOUD-05, TAGCLOUD-07, TAGCLOUD-08
**Success Criteria** (what must be TRUE):

  1. User sees a left-right dual-column layout on the /tags page: tag cloud on the left, scrollable document list on the right
  2. User can click a tag chip to filter the document list, showing only documents tagged with that tag; the document list updates immediately
  3. User can select multiple tags; the document list narrows via AND logic showing only documents matching ALL selected tags
  4. Selected tag chips display a distinct visual highlight (e.g., solid/filled background) distinguishing them from unselected chips; clicking an already-selected tag deselects it and expands the result set
  5. When tags are selected, compatible tags (tags that co-occur with ALL selected tags in at least one document) display with normal visual state while incompatible tags appear dimmed/disabled
  6. When no tags are selected, all tags display in their normal state and the full document list is shown

**Plans**: 1/1 plans complete
**UI hint**: yes

**Plans**:

- [x] 06-01-PLAN.md — 双栏交互实现：TagPanel + DocListPanel 子组件、双栏父容器重构、tags.md git 恢复

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. 标签云页面 | 1/1 | Complete | 2026-07-05 |
| 2. 首页改造 | 1/1 | Complete | 2026-07-05 |
| 3. 首页文章列表标题更新 | 1/1 | Complete | 2026-07-06 |
| 4. 首页标签交互筛选 | 2/2 | Complete | 2026-07-06 |
| 5. 数据层扩展 | 1/1 | Complete    | 2026-07-10 |
| 6. 交互与布局实现 | 1/1 | Complete   | 2026-07-11 |
