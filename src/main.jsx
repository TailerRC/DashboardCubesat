import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './assets/fontawesome/css/all.min.css'
import App from './App.jsx'
import { startAmbientalMockPublisher } from './mqtt/simulacion/ambientalMock'
import { startUbicacionMockPublisher } from './mqtt/simulacion/ubicacionMock'

// Start mock CubeSat MQTT telemetry stream
startAmbientalMockPublisher();
startUbicacionMockPublisher();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
