import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './assets/fontawesome/css/all.min.css'
import App from './App.jsx'
import { startAmbientalMockPublisher } from './mqtt/simulacion/ambientalMock'
import { startUbicacionMockPublisher } from './mqtt/simulacion/ubicacionMock'
import { startSateliteMockPublisher } from './mqtt/simulacion/sateliteMock'
import { startMisionMockPublisher } from './mqtt/simulacion/misionMock'
import { startComunicacionMockPublisher } from './mqtt/simulacion/comunicacionMock'
import { startOrientacion3DMockPublisher } from './mqtt/simulacion/orientacion3dMock'

// ── SIMULADORES MOCK DESACTIVADOS ──────────────────────────
// Todos los simuladores desactivados para recibir telemetría real por MQTT.
// startUbicacionMockPublisher();
// startMisionMockPublisher();
// startAmbientalMockPublisher();
// startSateliteMockPublisher();
// startComunicacionMockPublisher();
// startOrientacion3DMockPublisher();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
