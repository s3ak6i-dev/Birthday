import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initSfx } from './lib/sfx'
import { initMusic } from './lib/music'
import { initAudioDebugLog } from './lib/audio-debug'

initSfx()
initMusic()
initAudioDebugLog()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
