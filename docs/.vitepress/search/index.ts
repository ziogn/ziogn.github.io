export function createSearchConfig() {
  return {
    _render: async (src: string, env: any, md: any): Promise<string> => {
      const html = md.render(src, env)
      const tags = env.frontmatter?.tags
      if (Array.isArray(tags) && tags.length > 0) {
        const tagsJoined = tags.join(' ')
        return `${html}<span style="display:none">${tagsJoined}</span>`
      }
      return html
    },
    miniSearch: {
      searchOptions: {
        fuzzy: 0.2,
        prefix: true,
        boost: { title: 4, text: 2, titles: 1 },
      },
    },
  }
}
