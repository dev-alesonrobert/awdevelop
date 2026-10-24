import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
export function mountLanding(element, content, preview = false) {
  const root = createRoot(element);
  root.render(<App content={content} preview={preview}/>);
  return () => root.unmount();
}
