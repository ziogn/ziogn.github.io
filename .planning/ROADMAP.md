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

Plans:

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

Plans:

- [x] 02-01-PLAN.md — 首页改造：移除 hero actions 按钮、提取公用标签芯片样式、创建 HomeTagCloud 组件并通过 home-hero-after slot 集成到主题

**UI hint**: yes

## Milestone v1.1 — 首页交互优化

**Started:** 2026-07-06
**Status:** Planning

### Overview

This milestone improves the homepage experience by giving the document list a clearer title and making tags interactive for content filtering. Phase 3 is a straightforward rename of the document list heading. Phase 4 enables tag-click filtering directly on the homepage — users can select multiple tags with AND logic, see visual highlight states, and deselect to expand the list.

### Phases

- [ ] **Phase 3: 首页文章列表标题更新** - 将首页文档列表标题从「其他」改为「文章列表」
- [ ] **Phase 4: 首页标签交互筛选** - 标签点击筛选文章列表、多标签 AND 组合、选中高亮与取消

### Phase Details

#### Phase 3: 首页文章列表标题更新

**Goal**: Users see a clearer, more descriptive title for the homepage document list
**Depends on**: Nothing (Markdown-only change)
**Requirements**: HOME-03
**Success Criteria** (what must be TRUE):

  1. User sees "文章列表" instead of "其他" as the heading for the document list on the homepage

**Plans**: 1 plan

Plans:

- [ ] 03-01-PLAN.md — Update homepage document list heading from "其他" to "文章列表"

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

**Plans**: TBD

**UI hint**: yes

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. 标签云页面 | 1/1 | Complete | 2026-07-05 |
| 2. 首页改造 | 1/1 | Complete | 2026-07-05 |
| 3. 首页文章列表标题更新 | 0/1 | Planning | - |
| 4. 首页标签交互筛选 | 0/1 | Not started | - |
