---
status: complete
---

# Quick Task: 标签芯片筛选 UI

将 `tag:` 前缀搜索替换为可视化标签芯片筛选 UI。

## 变更

1. **移除 `tag:` 前缀搜索逻辑** — `searchWithTagFilter` 重构为基于 `selectedTags` Set 的 AND 过滤
2. **标签状态管理** — 添加 `selectedTags` (Set)、`toggleTag`、`allTags` (computed)、`tagChipStyle` (HSL 颜色生成)
3. **标签芯片模板** — 在搜索框下方渲染彩色标签 chips，支持多选 AND 过滤
4. **清除按钮** — 选中标签时显示"清除"按钮，一键清除所有标签筛选
5. **亮/暗模式自适应** — 通过 `useData().isDark` 动态调整 HSL 明度
6. **CSS** — 药丸形状、hover 微动效、active 环状高亮

## 文件

- `docs/.vitepress/theme/components/VPLocalSearchBox.vue` — 唯一修改文件
