import './styles/base.css';
import { mount } from 'svelte';
import App from './App.svelte';
import { init } from './lib/editor.svelte.js';

mount(App, { target: document.getElementById('app') });
init();
