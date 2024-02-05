import { Provider } from 'mobx-react';
import { createRoot } from 'react-dom/client'
import App from './App'
import './globals.scss'
import stores from './stores';

createRoot(document.getElementById('root')!).render(
  <Provider {...stores}>
    <App />
  </Provider>,
)

postMessage({ payload: 'removeLoading' }, '*')