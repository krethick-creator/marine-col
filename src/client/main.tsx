import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { useAppStore } from './store/index.ts'

// Detect if already installed via display-mode or navigator.standalone
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone
if (isStandalone) {
  useAppStore.getState().setIsAppInstalled(true)
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  if (!useAppStore.getState().isAppInstalled) {
    useAppStore.getState().setDeferredPrompt(e)
    useAppStore.getState().setIsInstallable(true)
  }
})

window.addEventListener('appinstalled', () => {
  useAppStore.getState().setIsAppInstalled(true)
  useAppStore.getState().setIsInstallable(false)
  useAppStore.getState().setDeferredPrompt(null)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
