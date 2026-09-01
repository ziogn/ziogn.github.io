import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'

const ROOT = process.cwd()
const SRC = process.env.MIGRATE_SRC || path.join(ROOT, 'docs')
const OUT = path.join(ROOT, 'source', '_posts')

function parseFront(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!m) return { data: null, body: content }
  const data = yaml.load(m[1]) || {}
  return { data, body: content.slice(m[0].length) }
}

// ---- format js-yaml Date to 'YYYY-MM-DD HH:mm' ----
function fmtDate(v) {
  if (v instanceof Date && !isNaN(v)) {
    const p = n => String(n).padStart(2, '0')
    return v.getFullYear() + '-' + p(v.getMonth() + 1) + '-' + p(v.getDate()) + ' ' + p(v.getHours()) + ':' + p(v.getMinutes())
  }
  return v
}

// ---- safe single-line YAML value ----
function yamlScalar(v) {
  if (v == null) return 'null'
  const s = String(v)
  if (/^[\d.]+$/.test(s) || /^(true|false|null)$/i.test(s)) return s
  if (/^[A-Za-z0-9_\u4e00-\u9fa5.\-+\/\s]+$/.test(s) && !/:/.test(s)) return s
  return JSON.stringify(s)
}
function yamlInlineArray(arr) {
  return '[' + arr.map(x => yamlScalar(x)).join(', ') + ']'
}

// ---- link rewriting ----
function rewriteLinks(body, docSet) {
  return body.replace(/\]\(([^)\n]+?)\)/g, (whole, target) => {
    if (/^https?:\/\//i.test(target)) return whole
    const hashIdx = target.indexOf('#')
    const hash = hashIdx >= 0 ? target.slice(hashIdx) : ''
    const filePart = hashIdx >= 0 ? target.slice(0, hashIdx) : target
    const decoded = decodeURIComponent(filePart)
    const base = path.basename(decoded).replace(/^\.\//, '')
    if (!docSet.has(base)) return whole
    const slug = base.replace(/\.md$/i, '')
    const url = encodeURI('/' + slug + '/') + hash
    return '](' + url + ')'
  })
}

// ---- frontmatter rebuild ----
function buildFront(data, fallbackDate) {
  const lines = []
  if (data.title != null) lines.push('title: ' + yamlScalar(data.title))
  const date = fmtDate(data.created || data.date || fallbackDate)
  lines.push('date: ' + yamlScalar(date))
  if (data.updated != null && String(data.updated) !== String(data.created)) {
    lines.push('updated: ' + yamlScalar(fmtDate(data.updated)))
  }
  if (data.tags) {
    lines.push('tags: ' + (Array.isArray(data.tags) ? yamlInlineArray(data.tags) : yamlScalar(data.tags)))
  }
  if (data.description) lines.push('description: ' + yamlScalar(data.description))
  if (data.version != null) lines.push('version: ' + yamlScalar(data.version))
  if (data.author != null) lines.push('author: ' + yamlScalar(data.author))
  if (data.aliases) lines.push('aliases: ' + (Array.isArray(data.aliases) ? yamlInlineArray(data.aliases) : yamlScalar(data.aliases)))
  if (data.source != null) lines.push('source: ' + yamlScalar(data.source))
  return '---\n' + lines.join('\n') + '\n---\n\n'
}

const files = fs.readdirSync(SRC).filter(f => f.endsWith('.md'))
const docSet = new Set(files)
const skip = new Set(['index.md', 'tags.md'])
let migrated = 0
const warn = []

for (const f of files) {
  if (skip.has(f)) { warn.push('skip (VitePress page): ' + f); continue }
  const content = fs.readFileSync(path.join(SRC, f), 'utf8')
  const { data, body } = parseFront(content)
  const fallback = data.created || '2026-01-01 00:00'
  const newBody = rewriteLinks(body, docSet)
  const front = buildFront(data, fallback)
  fs.mkdirSync(OUT, { recursive: true })
  fs.writeFileSync(path.join(OUT, f), front + newBody)
  migrated++
}

console.log('migrated:', migrated, '| skipped:', skip.size, '| docSet:', docSet.size)
for (const w of warn) console.log('WARN', w)