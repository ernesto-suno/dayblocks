import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MsalProvider } from '@azure/msal-react'
import { msalInstance } from './lib/msalConfig'
import { AppProvider } from './store/AppContext'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MsalProvider instance={msalInstance}>
      <AppProvider>
        <App />
      </AppProvider>
    </MsalProvider>
  </StrictMode>,
)
