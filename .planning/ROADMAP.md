# Roadmap: Ziogn Notes

**Milestone:** v1.0 — 标签云 & 首页改造
**Started:** 2026-07-05
**Status:** Planning

## Overview

This milestone extends the existing tag chip filtering in the search modal with dedicated tag cloud navigation. Phase 1 creates a standalone tag cloud page accessible from the navigation bar, displaying all tags with document counts using the same HSL color system and pill-style chips. Phase 2 cleans up the homepage hero by removing the obsolete "开始浏览" button and adding a tag cloud section for at-a-glance content discovery.

## Phases

- [x] **Phase 1: 标签云页面** - 创建独立标签云页面与导航栏入口 (completed 2026-07-05)
- [ ] **Phase 2: 首页改造** - 移除以废弃 hero 按钮并添加标签云展示区

## Phase Details

### Phase 1: 标签云页面

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

### Phase 2: 首页改造

**Goal**: Homepage provides a cleaner landing experience with a tag cloud area for document discovery
**Depends on**: Nothing (independent; can be done before or after Phase 1)
**Requirements**: HOME-01, HOME-02
**Success Criteria** (what must be TRUE):

  1. Homepage hero section no longer displays the "开始浏览" action button
  2. Homepage displays a tag cloud section showing all tags from the document collection
  3. Each tag chip on the homepage uses the same HSL deterministic color, pill shape, and hover effect as the search modal tag chips
  4. User can see the tag cloud area without scrolling past the hero section (visible in the upper portion of the page)

**Plans**: 1 plan

Plans:

- [ ] 02-01-PLAN.md — 首页改造：移除 hero actions 按钮、提取公用标签芯片样式、创建 HomeTagCloud 组件并通过 home-hero-after slot 集成到主题

**UI hint**: yes

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. 标签云页面 | 1/1 | Complete    | 2026-07-05 |
| 2. 首页改造 | 0/1 | Not started | - |
