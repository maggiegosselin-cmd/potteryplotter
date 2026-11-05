import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import { listenForInstall } from './lib/install.js';

listenForInstall();

export default mount(App, { target: document.getElementById('app') });
