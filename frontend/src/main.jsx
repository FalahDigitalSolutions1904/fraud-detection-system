import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Error stack trace interceptor
window.addEventListener('error', (event) => {
  console.log('UNHANDLED ERROR STACK:', event.error?.stack || event.message);
});
const originalConsoleError = console.error;
console.error = function (...args) {
  originalConsoleError.apply(console, args);
  const stack = new Error().stack;
  console.log('CONSOLE ERROR STACK:', stack);
};
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
