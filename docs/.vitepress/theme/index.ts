import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'
import VPLocalSearchBox from './components/VPLocalSearchBox.vue'
import TagCloudLayout from './components/TagCloudLayout.vue'
import TagCloudNavButton from './components/TagCloudNavButton.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'nav-bar-content-after': () => h(TagCloudNavButton),
      'nav-screen-content-after': () => h(TagCloudNavButton)
    })
  },
  enhanceApp({ app }) {
    app.component('VPLocalSearchBox', VPLocalSearchBox)
    app.component('tag-cloud', TagCloudLayout)
  },
}
