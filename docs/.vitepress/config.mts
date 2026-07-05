import { defineConfig } from 'vitepress'
import { generateSidebar } from 'vitepress-sidebar'
import { createSearchConfig } from './search/index'
import { tagIndexPlugin } from './search/tag-index-plugin'

// markdown-it 插件：在解析前自动将含空格的链接 URL 包裹角括号 `<url>`。
// markdown-it 原生不支持 `[text](url with spaces)`，但支持 `[text](<url with spaces>)`。
function fixLinkSpaces(md: any): void {
  md.core.ruler.before('block', 'fix-link-spaces', (state: any) => {
    state.src = state.src.replace(
      /\]\(([^)]* [^)]*)\)/g,
      (_m: string, url: string) => `](<${url}>)`,
    )
  })
}

// vitepress-sidebar 默认把所有内容包进一个根分组(以 srcDir 名 "docs" 命名)。
const rawSidebar = generateSidebar({
  capitalizeFirst: false,
  collapsed: true,
  frontmatterTitle: 'title',
}) as any[]

// 展开根分组:根级文档直接平铺,仅子目录(写作/调研)保留为分组。
function flattenRootGroup(items: any[]): any[] {
  if (items.length === 1 && items[0]?.items && !items[0]?.link) {
    return items[0].items
  }
  return items
}

// vitepress-sidebar 生成的 link 带 '/docs' 前缀(srcDir 名),但 VitePress 的 URL 不含该层,
// 递归去掉,否则点击侧边栏会跳到 /docs/xxx 导致 404。
function stripDocsPrefix(items: any[]): any[] {
  return items.map((item) => {
    const fixed = { ...item }
    if (fixed.link === '/docs') fixed.link = '/'
    else if (fixed.link?.startsWith('/docs/')) fixed.link = fixed.link.slice('/docs'.length)
    if (fixed.items) fixed.items = stripDocsPrefix(fixed.items)
    return fixed
  })
}

export default defineConfig({
  title: 'Ziogn Notes',
  description: '个人技术文档知识库',
  lang: 'zh-CN',
  lastUpdated: true,
  cleanUrls: true,
  ignoreDeadLinks: true,
  head: [['meta', { name: 'theme-color', content: '#6366f1' }]],
  vite: {
    build: {
      chunkSizeWarningLimit: 1000,
    },
    plugins: [tagIndexPlugin()],
    ssr: {
      noExternal: ['mark.js'],
    },
  },
  markdown: {
    languageAlias: {
      logql: 'sql',
      logsql: 'sql',
      alloy: 'yaml',
    },
    config: (md) => {
      fixLinkSpaces(md)
    },
  },
  themeConfig: {
    socialLinks: [
      { icon: 'github', link: 'https://github.com/ziogn/ziogn.github.io' },
    ],
    search: {
      provider: 'local',
      options: {
        ...createSearchConfig(),
        translations: {
          button: { buttonText: '搜索文档', buttonAriaLabel: '搜索' },
          modal: { noResultsText: '无法找到相关结果' },
        },
      },
    },
    outline: { label: '本页内容', level: [2, 3] },
    sidebar: stripDocsPrefix(flattenRootGroup(rawSidebar)),
    docFooter: { prev: '上一篇', next: '下一篇' },
    darkModeSwitchLabel: '主题',
    sidebarMenuLabel: '菜单',
    returnToTopLabel: '回到顶部',
    lastUpdatedText: '最后更新',
  },
})
