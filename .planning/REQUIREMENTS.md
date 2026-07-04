# Requirements: Ziogn Notes

**Defined:** 2026-07-05
**Core Value:** 用户可以通过标签快速定位相关文档

## v1 Requirements

### 搜索增强

- [ ] **SEARCH-01**: 普通搜索（无 `tag:` 前缀）时，文档 frontmatter 中的 `tags` 字段内容纳入 MiniSearch 索引，匹配标签的文档出现在搜索结果中
- [ ] **SEARCH-02**: 输入 `tag: vue react` 前缀时，搜索范围限定在标签字段，多个标签用空格分隔表示交集（AND），只返回同时包含所有标签的文档
- [ ] **SEARCH-03**: `tag:` 前缀搜索支持自动补全/提示，在输入 `tag:` 后可展示已有标签列表

### 标签页面

- [ ] **PAGE-01**: 标签汇总页面（如 `/tags/`），列出所有文档中用到的标签，每个标签显示对应的文章数量
- [ ] **PAGE-02**: 标签可点击，点击后跳转到包含该标签的文档列表/筛选结果

### 文档元信息（可选增强）

- [ ] **META-01**: 在每篇文档的标题附近或正文内展示该文档的标签

## v2 Requirements

### 增强搜索

- **SEARCH-v2-01**: 支持 `tag:` 前缀的否定语法 `tag: -javascript` 排除某标签
- **SEARCH-v2-02**: 搜索结果页支持按标签二次筛选
- **PAGE-v2-01**: 标签云样式展示（按使用频率大小不一）

## Out of Scope

| 功能 | 原因 |
|------|------|
| 标签 CRUD 管理界面 | 标签直接在文档 frontmatter 中维护 |
| 标签层级/父子关系 | 仅平铺标签 |
| 文档目录分类重组 | 已有 sidebar 承担导航角色 |
| Algolia 等外部搜索 | 保持本地搜索 |
| CI/CD 管线搭建 | 与标签搜索无关 |
| 修复已存在的死链等债务 | 独立问题，不混入本功能迭代 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEARCH-01 | Phase 1 | Pending |
| SEARCH-02 | Phase 2 | Pending |
| SEARCH-03 | Phase 3 | Pending |
| PAGE-01 | Phase 4 | Pending |
| PAGE-02 | Phase 5 | Pending |
| META-01 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 6 total
- Mapped to phases: 6 ✓
- Unmapped: 0 ✓

### Phase Summary

| Phase | Requirements |
|-------|-------------|
| Phase 1: Tag Indexing in Search | SEARCH-01 |
| Phase 2: Tag-Prefix Search | SEARCH-02 |
| Phase 3: Tag Autocomplete | SEARCH-03 |
| Phase 4: Tag Summary Page | PAGE-01 |
| Phase 5: Clickable Tags | PAGE-02 |
| Phase 6: Document Tag Display | META-01 |

---
*Requirements defined: 2026-07-05*
*Last updated: 2026-07-06 after roadmap creation*
