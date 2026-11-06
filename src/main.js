import { mount } from 'svelte';
import '@fontsource/nunito/latin-400.css';
import '@fontsource/nunito/latin-400-italic.css';
import '@fontsource/nunito/latin-600.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-800.css';
import './app.css';
import App from './App.svelte';
import { listenForInstall } from './lib/install.js';
import { startSync } from './lib/sync.js';

listenForInstall();
startSync();

export default mount(App, { target: document.getElementById('app') });
