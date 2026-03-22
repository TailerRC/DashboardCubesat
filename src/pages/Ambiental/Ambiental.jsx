import './Ambiental.css';

export default function Ambiental() {
  return (
    <div className="ambiental-view">
      {/* Security Status */}
      <section className="security-status">
        <h3 className="section-title">ESTADO AMBIENTAL DE SEGURIDAD</h3>
        <div className="security-banner security-banner--ok">
          <div className="security-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className="security-text">
            <span className="security-label">SEGURO</span>
            <span className="security-detail">TODOS LOS PARAMETROS EN RANGO NORMAL</span>
          </div>
        </div>
      </section>

      {/* Grid Content */}
      <section className="ambiental-grid">
        {/* Panel 1: CO2 */}
        <div className="ambiental-card">
          <h4 className="card-header">CONCENTRACIÓN DE CO2</h4>
          <div className="card-main-value">
            <span className="value">409.88</span>
            <span className="unit">ppm</span>
          </div>
          <div className="gauge-container">
            <div className="gauge-labels">
              <span>Normal<br/>380ppm</span>
              <span>Elevado<br/>420ppm</span>
              <span>Alto<br/>450ppm</span>
              <span>Peligroso<br/>500ppm</span>
              <span>Crítico<br/>600ppm</span>
            </div>
            <div className="gauge-bar co2-bar">
              <div className="indicator" style={{ left: '15%' }}></div>
            </div>
          </div>
          <div className="chart-placeholder">
             <div className="chart-bg-lines">
                <div></div><div></div><div></div><div></div><div></div>
             </div>
             <svg className="chart-line-svg" viewBox="0 0 100 30" preserveAspectRatio="none">
                <polyline points="0,20 10,22 20,18 30,25 40,21 50,19 60,20 70,23 80,18 90,20 100,19" fill="none" stroke="#2196f3" strokeWidth="2"/>
                <polyline points="0,25 10,25 20,25 30,25 40,25 50,25 60,25 70,25 80,25 90,25 100,25" fill="none" stroke="#f44336" strokeLinecap="square" strokeDasharray="4 4" strokeWidth="1"/>
             </svg>
             <div className="chart-x-axis">
               <span>120 s</span><span>90 s</span><span>60 s</span><span>30 s</span><span>0 s</span>
             </div>
          </div>
        </div>
        
        {/* Panel 2: VOC */}
        <div className="ambiental-card">
          <h4 className="card-header">GASES NOCIVOS (VOC)</h4>
          <div className="card-main-value">
            <span className="value">23</span>
            <span className="unit">ppb</span>
          </div>
          <div className="gauge-container">
            <div className="gauge-labels">
              <span>Limpio<br/>0 ppb</span>
              <span>Aceptabl<br/>50 ppb</span>
              <span>Moderado<br/>100 ppb</span>
              <span>Alto<br/>300 ppb</span>
              <span>Peligroso<br/>500 ppb</span>
            </div>
            <div className="gauge-bar voc-bar">
              <div className="indicator" style={{ left: '10%' }}></div>
            </div>
          </div>
           <div className="chart-placeholder">
              <div className="chart-bg-lines">
                <div></div><div></div><div></div><div></div><div></div>
             </div>
             <svg className="chart-line-svg" viewBox="0 0 100 30" preserveAspectRatio="none">
                <polyline points="0,28 10,27 20,28 30,27 40,28 50,27 60,28 70,27 80,28 90,27 100,28" fill="none" stroke="#2196f3" strokeWidth="2"/>
                <polyline points="0,15 10,15 20,15 30,15 40,15 50,15 60,15 70,15 80,15 90,15 100,15" fill="none" stroke="#f44336" strokeLinecap="square" strokeDasharray="4 4" strokeWidth="1"/>
             </svg>
             <div className="chart-x-axis">
               <span>120 s</span><span>90 s</span><span>60 s</span><span>30 s</span><span>0 s</span>
             </div>
          </div>
        </div>

        {/* Panel 3: Temperature */}
        <div className="ambiental-card">
          <h4 className="card-header">TEMPERATURA</h4>
          <div className="card-main-value">
            <span className="value">24.9</span>
            <span className="unit">°C</span>
          </div>
          <div className="gauge-container multi-section-gauge">
            <div className="gauge-labels">
              <span>Frío<br/>15°C</span>
              <span>Fresco<br/>20°C</span>
              <span>Normal<br/>25°C</span>
              <span>Cálido<br/>32°C</span>
              <span>Caliente<br/>40°C</span>
            </div>
            <div className="gauge-bar temp-bar">
              <div className="indicator" style={{ left: '46%' }}></div>
            </div>
          </div>
        </div>

        {/* Panel 4: Humidity */}
        <div className="ambiental-card">
          <h4 className="card-header">HUMEDAD</h4>
          <div className="card-main-value">
            <span className="value">56.7</span>
            <span className="unit">%RH</span>
          </div>
          <div className="gauge-container multi-section-gauge">
            <div className="gauge-labels">
              <span>Muy Seco<br/>20 %R</span>
              <span>Seco<br/>30 %R</span>
              <span>Confortable<br/>50 %R</span>
              <span>Húmedo<br/>70 %RH</span>
              <span>Muy Húmedo<br/>90 %RH</span>
            </div>
            <div className="gauge-bar hum-bar">
              <div className="indicator" style={{ left: '55%' }}></div>
            </div>
          </div>
        </div>

        {/* Panel 5: Pressure */}
        <div className="ambiental-card">
          <h4 className="card-header">PRESIÓN ATMOSFÉRICA</h4>
          <div className="card-main-value">
             <span className="value">1001.45</span>
             <span className="unit">hPa</span>
          </div>
          <div className="gauge-container multi-section-gauge">
             <div className="gauge-labels">
               <span>500 m<br/>954 hPa</span>
               <span>375 m<br/>968 hPa</span>
               <span>250 m<br/>981 hPa</span>
               <span>125 m<br/>997 hPa</span>
               <span>Superficie<br/>1013 hPa</span>
             </div>
             <div className="gauge-bar pres-bar">
               <div className="indicator" style={{ left: '80%' }}></div>
             </div>
          </div>
        </div>

        {/* Panel 6: UV */}
        <div className="ambiental-card">
          <h4 className="card-header">RADIACIÓN ULTRAVIOLETA</h4>
          <div className="card-main-value">
             <span className="value">3.9</span>
             <span className="unit">UV index</span>
          </div>
          <div className="gauge-container multi-section-gauge">
             <div className="gauge-labels">
               <span>Mínimo<br/>0</span>
               <span>Bajo<br/>2</span>
               <span>Moderado<br/>4</span>
               <span>Alto<br/>6</span>
               <span>Muy Alto<br/>+8</span>
             </div>
             <div className="gauge-bar uv-bar">
               <div className="indicator" style={{ left: '38%' }}></div>
             </div>
          </div>
        </div>

      </section>
    </div>
  );
}
