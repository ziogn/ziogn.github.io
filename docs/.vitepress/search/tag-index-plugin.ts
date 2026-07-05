import type { Plugin } from 'vite'
import fs from 'fs'
import path from 'path'

const VIRTUAL_MODULE_ID = 'virtual:tag-index'
const RESOLVED_ID = '\0' + VIRTUAL_MODULE_ID

interface TagIndex {
  [url: string]: string[]
}

export function tagIndexPlugin(): Plugin {
  let rootDir = process.cwd()

  return {
    name: 'vitepress-tag-index',
    enforce: 'pre',
    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) return RESOLVED_ID
    },
    load(id) {
      if (id !== RESOLVED_ID) return

      const docsDir = path.resolve(rootDir, 'docs')
      const tagIndex: TagIndex = {}

      if (!fs.existsSync(docsDir)) {
        return `export default {}`
      }

      const files = fs.readdirSync(docsDir).filter((f) => f.endsWith('.md'))
      for (const file of files) {
        const content = fs.readFileSync(path.join(docsDir, file), 'utf-8')
        const tags = extractTags(content)
        if (tags.length === 0) continue
        const url = fileToUrl(file)
        tagIndex[url] = tags
      }

      return `export default ${JSON.stringify(tagIndex)}`
    },
  }
}

function extractTags(content: string): string[] {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return []
  const fmBlock = match[1]

  // Match `tags: [tag1, tag2, ...]` in YAML frontmatter
  const tagMatch = fmBlock.match(/^tags:\s*\[([^\]]*)\]/m)
  if (!tagMatch) return []

  return tagMatch[1]
    .split(',')
    .map((v) => v.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean)
}

function fileToUrl(filename: string): string {
  // index.md → /
  if (filename === 'index.md') return '/'
  // Certbot使用指南.md → /Certbot使用指南
  return '/' + filename.replace(/\.md$/, '')
}
