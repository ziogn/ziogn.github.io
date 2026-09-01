'use strict'
const { escapeHTML } = require('hexo-util')
// Run BEFORE hexo's built-in backtick_code_block filter so the fenced mermaid
// blocks are still literal when we read them. Butterfly's mermaid runtime then
// finds <div class="mermaid-wrap"><pre class="mermaid-src" hidden> and renders.
hexo.extend.filter.register('before_post_render', function (data) {
  if (typeof data.content !== 'string') return data
  data.content = data.content.replace(/\n?\`\`\`mermaid\s*\n([\s\S]*?)\`\`\`/g, (m, body) => {
    const content = escapeHTML(body.replace(/\n+$/, ''))
    return '\n<div class="mermaid-wrap"><pre class="mermaid-src" data-config="{}" hidden>' + content + '</pre></div>\n'
  })
  return data
}, 0)
