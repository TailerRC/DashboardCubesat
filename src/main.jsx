import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './assets/fontawesome/css/all.min.css'
import App from './App.jsx'
import { startAmbientalMockPublisher } from './mock_data/ambientalMock'

// Start mock CubeSat MQTT telemetry stream
startAmbientalMockPublisher();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
