// Intl 폴리필 (Hermes 호환성)
try {
    require('@formatjs/intl-getcanonicallocales/polyfill');
    require('@formatjs/intl-locale/polyfill');
    require('@formatjs/intl-datetimeformat/polyfill');
} catch (error) {
    console.log('Some polyfills not available:', error.message);
}

import { registerRootComponent } from 'expo';
import App from './App';
registerRootComponent(App);
