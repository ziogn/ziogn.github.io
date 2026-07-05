import DefaultTheme from 'vitepress/theme'
import VPLocalSearchBox from './components/VPLocalSearchBox.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('VPLocalSearchBox', VPLocalSearchBox)
  },
}
