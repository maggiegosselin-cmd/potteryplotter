import { mount } from 'svelte';
import './fonts.css';
import './app.css';
import App from './App.svelte';
import { listenForInstall } from './lib/install.js';
import { startSync } from './lib/sync.js';

listenForInstall();
startSync();

export default mount(App, { target: document.getElementById('app') });
