# Requirements: Ziogn Notes

**Defined:** 2026-07-05
**Core Value:** 用户可以通过标签快速定位相关文档，尤其是当文档量增长后，标签搜索成为比全文搜索更精准的发现方式

## v1 Requirements (Completed)

### 标签云页面

- [x] **TAGS-01**: 导航栏右侧新增标签云入口按钮，点击跳转到标签云页面
- [x] **TAGS-02**: 标签云页面展示所有标签及其关联的文档计数
- [x] **TAGS-03**: 标签云页面的标签样式与搜索弹窗 tag chip 一致

### 首页改造

- [x] **HOME-01**: 首页 hero 区域移除「开始浏览」按钮
- [x] **HOME-02**: 首页新增标签云展示区域
- [x] **HOME-03**: 首页文档列表部分的标题从「其他」改为「文章列表」
- [x] **HOME-04**: 用户点击首页标签云中的标签可筛选下方文章列表
- [x] **HOME-05**: 用户可选择多个标签，文章列表按 AND 逻辑过滤
- [x] **HOME-06**: 已选中的标签有视觉高亮状态，再次点击可取消选中

## v1.2.0 Requirements (标签云页面交互筛选)

### 布局

- [ ] **TAGCLOUD-04**: 标签云页面使用左标签右文档列表的双栏布局

### 筛选

- [ ] **TAGCLOUD-05**: 用户点击标签云中的标签可筛选下方文档列表
- [x] **TAGCLOUD-06**: 用户可选择多个标签，文档列表按 AND 逻辑过滤
- [ ] **TAGCLOUD-07**: 已选中的标签有视觉高亮状态，再次点击可取消选中

### 兼容性高亮

- [ ] **TAGCLOUD-08**: 选中标签后，兼容标签（与所有已选标签同属至少一篇文档的标签）高亮显示，不兼容标签置灰，避免筛选后结果为 0

## Future Requirements

### 标签交互增强

- **TAGS-05**: 标签云页面支持按文档数排序/筛选

## Out of Scope

| Feature | Reason |
|---------|--------|
| 标签 CRUD 管理界面 | 标签通过 frontmatter 维护，无需管理 UI |
| 标签关联推荐 | 不自动推荐相关标签，仅展示已有标签 |
| 标签层级/分类 | 保持扁平标签体系 |
| 标签云跳转到搜索弹窗 | 用户选择在标签云页面内直接筛选 |
| 首页标签云筛选 | 首页标签云已移除，筛选功能集中在 /tags 页面 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| TAGS-01 | Phase 1 | Complete |
| TAGS-02 | Phase 1 | Complete |
| TAGS-03 | Phase 1 | Complete |
| HOME-01 | Phase 2 | Complete |
| HOME-02 | Phase 2 | Complete |
| HOME-03 | Phase 3 | Complete |
| HOME-04 | Phase 4 | Complete |
| HOME-05 | Phase 4 | Complete |
| HOME-06 | Phase 4 | Complete |
| TAGCLOUD-04 | Phase 6 | Pending |
| TAGCLOUD-05 | Phase 6 | Pending |
| TAGCLOUD-06 | Phase 5 | Complete |
| TAGCLOUD-07 | Phase 6 | Pending |
| TAGCLOUD-08 | Phase 6 | Pending |

**Coverage:**

- v1 requirements: 9 total, mapped: 9 ✓
- v1.2.0 requirements: 5 total, mapped: 5 ✓

---
*Requirements defined: 2026-07-05*
*Last updated: 2026-07-10 — milestone v1.2.0*
