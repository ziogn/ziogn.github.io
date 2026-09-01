# Ziogn Notes（ziogn.github.io）

个人技术文档知识库博客，基于 **Hexo + Butterfly 主题** 构建，托管于 GitHub Pages。

## 技术栈

- [Hexo](https://hexo.io/) v8 —— 静态站点生成器
- [Butterfly](https://butterfly.js.org/) v5.7 —— 主题（npm 包 `hexo-theme-butterfly`）
- 本地搜索：`hexo-generator-search` 生成 `search.xml`，主题 `local_search` 消费
- Mermaid 图：`scripts/mermaid-tag.js` 在渲染前把 ```mermaid 代码块转为主题识别的 `mermaid-wrap` 结构
- 部署：GitHub Actions（`.github/workflows/deploy.yml`）push main 后自动构建并发布到 `gh-pages` 分支

## 目录结构

```
_config.yml            # Hexo 站点配置
_config.butterfly.yml  # Butterfly 主题覆盖配置
source/
  _posts/              # 博客文章（Markdown，frontmatter 含 date/tags/description 等）
  tags/index.md        # 标签页
  categories/index.md  # 分类页
  css/custom.css       # 自定义样式
  404.md             # 404 页面
scaffolds/             # 新建文章/页面模板
scripts/mermaid-tag.js # Mermaid 代码块 → 主题容器转换
tools/migrate.mjs      # 内容迁移脚本（VitePress docs → Hexo _posts，可复用）
.github/workflows/deploy.yml  # CI 部署
```

## 本地开发

```bash
npm install          # 安装依赖
npm run server       # 本地预览 http://localhost:4000
npm run build        # 生成静态站点到 public/
npm run clean        # 清理 public/ 与缓存
```

## 发布

推送到 `main` 分支即可触发 GitHub Actions 自动构建并发布到 `gh-pages`，无需本地操作。

## 文章管理

- 新建文章：`npx hexo new "标题"`（写入 `source/_posts/`）
- 文章 frontmatter：`title / date / updated / tags / description`（`tags` 为数组）
- 写 Mermaid 图：直接用 ```mermaid 代码块即可

## 历史迁移说明

本仓库原为 VitePress 站点，已迁移为 Hexo：

- 43 篇文档全部迁入 `source/_posts/`（`docs/` 目录已删除，历史可在 git 中追溯）
- frontmatter：VitePress 的 `created/updated` → Hexo 的 `date/updated`
- 文档间相对链接（`](foo.md)`）已重写为 Hexo permalink（`/foo/`）
- 迁移脚本保留在 `tools/migrate.mjs`，如需重新迁移：`MIGRATE_SRC=<原docs目录> node tools/migrate.mjs`
