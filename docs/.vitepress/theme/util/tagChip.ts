export interface TagItem {
  name: string
  count: number
}

/** 基于标签名的确定性 HSL 色相（Jenkins one-at-a-time hash） */
export function tagHue(tag: string): number {
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = ((hash << 5) - hash) + tag.charCodeAt(i)
    hash |= 0
  }
  return ((hash % 360) + 360) % 360
}

/** 为每个标签生成样式（亮/暗模式自适应，isDark 为纯布尔值，不依赖 vue reactivity） */
export function tagChipStyle(tag: string, isDark: boolean): Record<string, string> {
  const hue = tagHue(tag)
  const lightness = isDark ? 60 : 35
  return {
    backgroundColor: `hsla(${hue}, 50%, ${lightness}%, 0.15)`,
    color: `hsl(${hue}, 50%, ${lightness}%)`,
    borderColor: `hsla(${hue}, 50%, ${lightness}%, 0.25)`
  }
}

/** 从 virtual:tag-index 提取所有唯一标签及文档计数（大小写忽略归一化） */
export function allTagsFromIndex(tagIndex: Record<string, { tags: string[]; title: string }>): TagItem[] {
  const countMap = new Map<string, number>()
  for (const [, entry] of Object.entries(tagIndex)) {
    const seen = new Set<string>()
    for (const tag of entry.tags) {
      const key = tag.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      countMap.set(key, (countMap.get(key) ?? 0) + 1)
    }
  }
  return Array.from(countMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
}
