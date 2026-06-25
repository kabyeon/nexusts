import DefaultTheme from 'vitepress/theme';
import NavBarTranslations from './components/VPNavBarTranslations.vue';
import NavScreenTranslations from './components/VPNavScreenTranslations.vue';
import './custom.css';

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('VPNavBarTranslations', NavBarTranslations);
    app.component('VPNavScreenTranslations', NavScreenTranslations);
  },
};