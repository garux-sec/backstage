import '@backstage/cli/asset-types';
import ReactDOM from 'react-dom/client';

// Polyfill crypto.randomUUID for non-secure contexts (HTTP over IP)
if (typeof globalThis.crypto?.randomUUID !== 'function') {
  (globalThis.crypto as any).randomUUID = function () {
    return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c: any) =>
      (c ^ (globalThis.crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
    );
  };
}
import App from './App';
import '@backstage/ui/css/styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(App.createRoot());
