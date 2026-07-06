<script setup lang="ts">
import { useHomeTagFilter } from '../util/useHomeTagFilter'

const { filteredDocs, isEmpty } = useHomeTagFilter()
</script>

<template>
  <div class="FilteredDocList vp-doc">
    <TransitionGroup name="list" tag="ul">
      <li v-for="item in filteredDocs" :key="item.url">
        <a :href="item.url">{{ item.title }}</a>
      </li>
    </TransitionGroup>
    <p v-if="isEmpty" class="hc-empty">没有匹配标签的文档</p>
  </div>
</template>

<style scoped>
.FilteredDocList ul {
  padding-left: 0;
  list-style: none;
}
.FilteredDocList li {
  margin: 0.5em 0;
}
.FilteredDocList a {
  color: var(--vp-c-brand-1);
  text-decoration: none;
}
.FilteredDocList a:hover {
  text-decoration: underline;
}
.hc-empty {
  text-align: center;
  color: var(--vp-c-text-2);
  padding: 2em 0;
}
</style>
