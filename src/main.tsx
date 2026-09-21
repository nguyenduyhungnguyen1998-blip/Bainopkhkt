import { render } from 'preact';
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';
import { App } from './app';
import { installErrorLog } from './debug/errorlog';

installErrorLog();
render(<App />, document.getElementById('app')!);
