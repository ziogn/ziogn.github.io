---
phase: 02-tag-prefix-search
plan: 01
subsystem: search
tags: [vitepress, minisearch, tag-prefix, virtual-module]
requires: [01-tag-indexing-in-search]
provides:
  - `tag:` 前缀搜索功能，输入 `tag: flutter` 仅显示标签匹配的文档
  - 多标签 AND 交集：`tag: flutter dart` 只显示同时包含两个标签的文档
  - 构建时标签索引 Vite 插件 (virtual:tag-index)
  - 覆盖 VPLocalSearchBox 组件实现搜索拦截
affects: [03-tag-autocomplete]
tech-stack:
  added:
    - Vite 虚拟模块 virtual:tag-index（构建时扫描 frontmatter 生成标签索引）
  patterns:
    - Vite 插件模式：扫描 docs/*.md 提取 frontmatter 标签
    - 组件覆写模式：通过 app.component 覆盖内置 VPLocalSearchBox
    - SSR 兼容：mark.js 添加至 ssr.noExternal
key-files:
  created:
    - docs/.vitepress/search/tag-index-plugin.ts
    - docs/.vitepress/theme/components/VPLocalSearchBox.vue
  modified:
    - docs/.vitepress/theme/index.ts
    - docs/.vitepress/config.mts
key-decisions:
  - "Vite 虚拟模块 virtual:tag-index 提供构建时标签索引（而非 content loader），避免路径解析问题"
  - "组件覆写 VPLocalSearchBox 而非通过 Config 注入——MiniSearch searchOptions 不支持自定义 filter 回调"
  - "多标签为 AND 交集：tagTerms.every() 保证所有标签必须匹配"
  - "标签匹配为大小写不敏感：查询词和存储标签均 toLowerCase() 后比较"
  - "mark.js 添加至 ssr.noExternal：Node 22 ESM 模式下 extensionless import 会报 ERR_MODULE_NOT_FOUND"
patterns-established:
  - "标签索引规划：Vite plugin 在 resolve/load hook 中扫描 .md 文件，暴露为 virtual:tag-index"
  - "搜索覆写规划：复制内置 VPLocalSearchBox，添加 searchWithTagFilter() 函数"
  - "SSR 兼容规划：通过 vite.ssr.noExternal 解决第三方库的 ESM 兼容性问题"
requirements-completed: [SEARCH-02]
duration: ~15min
completed: 2026-07-05
status: complete
---

# Phase 2: Tag-Prefix Search Summary

**用户输入 `tag:` 前缀时搜索限定在标签字段，支持多标签 AND 交集**

## Performance

- **Duration:** ~15 min
- **Tasks:** 4
- **Files modified/created:** 5

## Accomplishments

- **构建时标签索引**：`tag-index-plugin.ts` 扫描 `docs/*.md` 的 frontmatter 标签，通过 Vite 虚拟模块 `virtual:tag-index` 暴露为 `{url: string[]}` 结构
- **搜索拦截**：覆写 `VPLocalSearchBox.vue`，在 `debouncedWatch` 搜索回调前检测 `tag:` 前缀
- **多标签 AND 交集**：`tag: flutter dart` 查询拆分为 `['flutter', 'dart']`，通过 `tagTerms.every(term => docTags.some(t => t.toLowerCase() === term.toLowerCase()))` 过滤
- **无前缀回退**：无 `tag:` 前缀时，搜索行为与内置 VPLocalSearchBox 完全一致
- **SSR 兼容**：`mark.js` 添加至 `vite.ssr.noExternal`，解决 Node 22 ESM 下 extensionless import 错误
- **构建通过**：`npm run build` 成功，tag 索引数据已确认在构建 JS 包中

## Files Created/Modified

- `docs/.vitepress/search/tag-index-plugin.ts` — Vite 插件，提供 `virtual:tag-index` 虚拟模块
- `docs/.vitepress/theme/components/VPLocalSearchBox.vue` — 覆写的搜索组件，添加 `tag:` 前缀检测
- `docs/.vitepress/theme/index.ts` — 注册 VPLocalSearchBox 组件覆写
- `docs/.vitepress/config.mts` — 添加 tagIndexPlugin、ssr.noExternal mark.js

## Decisions Made

- **Vite 虚拟模块 > content loader**：虚拟模块在 resolve/load hook 中注入数据，无需额外文件 IO
- **组件覆写 > Config 注入**：MiniSearch searchOptions 不允许自定义 filter 回调，只能通过覆写组件修改搜索逻辑
- **AND 而非 OR**：`tag: a b` = 文档必须同时包含 a 和 b（AND），而非包含任一（OR），满足 SEARCH-02 定义
- **mark.js SSR 修复**：Node 22 ESM 模式下，`mark.js/src/vanilla.js` 的 extensionless import (`./lib/mark`) 会抛出 `ERR_MODULE_NOT_FOUND`，通过 `ssr.noExternal` 将其打包进 SSR bundle 避免 Node.js 直接加载

## Deviations

无 — 直接实现 Phase 2 功能，未创建前置 PLAN.md（快速跟随用户指令）

## Issues Encountered

- `mark.js` SSR 兼容：Node 22 + ESM 模式下 extensionless import 失败。修复：添加 `ssr.noExternal: ['mark.js']`
- 组件内部路径：覆写的 `VPLocalSearchBox.vue` 使用 `vitepress/dist/client/...` 绝对包路径替代原组件的相对路径

## Next Phase Readiness

- Phase 3 (Tag Autocomplete) 可以直接使用 `virtual:tag-index` 提供的标签列表
- VPLocalSearchBox 覆写点已建立，Phase 3 可在同一组件中叠加自动补全功能
- 手动验证（可选）：`npm run dev` → 浏览器 → 搜索 `tag: flutter` → 确认仅 Flutter 相关文档出现

---
*Phase: 02-tag-prefix-search*
*Completed: 2026-07-05*
