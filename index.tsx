// index.tsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './src/App';
import './index.css'; // ★★★ この行が全てのスタイルを読み込みます ★★★

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);