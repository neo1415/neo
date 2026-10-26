import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import '@fontsource-variable/inter'
import '@fontsource-variable/plus-jakarta-sans'
import '@fontsource/instrument-serif/400-italic.css'
import '@fontsource/instrument-serif/400.css'
import './styles.css'
import App from './App'
import { StoreProvider } from './store'
import { ToastProvider } from './ui'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <StoreProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </StoreProvider>
    </HashRouter>
  </React.StrictMode>
)
