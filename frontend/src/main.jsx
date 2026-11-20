import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { SessionProvider } from './context/SessionContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { initMonitoring, reactErrorHandlers } from './lib/monitoring.js'

initMonitoring()

createRoot(document.getElementById('root'), reactErrorHandlers).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SessionProvider>
          <App />
        </SessionProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
