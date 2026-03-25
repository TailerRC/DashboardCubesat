import './Ubicacion.css';

export default function Ubicacion() {
  return (
    <div className="ubicacion-view">
      {/* Top Section */}
      <section className="ubicacion-top-section">
        
        {/* Radar/Map Panel */}
        <div className="map-panel">
          <div className="map-grid-bg">
            <div className="radar-circle">
               <svg viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2">
                 <path d="M12 2L12 22M2 12L22 12M4.9 4.9L19.1 19.1M19.1 4.9L4.9 19.1" />
               </svg>
            </div>
            
            <div className="map-coordinates-label">
              LAT: -12.4342, LON: -77.2134
            </div>
          </div>
          <div className="map-footer">
            <span className="map-title-label">MAPA DE TRAYECTORIA EN TIEMPO REAL</span>
            <span className="map-subtitle-label">Actualización cada 2s</span>
          </div>
        </div>

        {/* GPS Data Panel */}
        <div className="gps-data-panel">
          <h4 className="panel-header text-center">DATOS GPS</h4>
          
          <table className="gps-table">
            <tbody>
              <tr><td>Latitud:</td><td className="text-right">-12.4342</td></tr>
              <tr><td>Longitud:</td><td className="text-right">-77.2134</td></tr>
              <tr><td>Altitud GPS:</td><td className="text-right">525 m</td></tr>
              <tr><td>Velocidad:</td><td className="text-right">15.3 km/h</td></tr>
              <tr><td>Satélites visibles:</td><td className="text-right">9</td></tr>
              <tr><td>HDOP:</td><td className="text-right">0.8</td></tr>
              <tr><td>Fecha UTC:</td><td className="text-right">2026-03-24</td></tr>
              <tr><td>Hora UTC:</td><td className="text-right">21:00:23</td></tr>
            </tbody>
          </table>

          <div className="landing-coords">
            <div className="landing-label">Coordenadas de Aterrizaje:</div>
            <div className="landing-value">-12.4123, -77.2078</div>
          </div>
        </div>
      </section>

      {/* Bottom Section */}
      <section className="ubicacion-bottom-section">
        
        {/* Altitud GPS Chart */}
        <div className="panel-card altitud-card">
          <h4 className="panel-header">ALTITUD GPS</h4>
          <div className="panel-main-value">
            <span className="value">525</span>
            <span className="unit">m</span>
          </div>
          <div className="chart-area">
             <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="graph-svg">
                <polygon points="0,40 0,25 20,20 40,30 60,35 80,15 100,25 100,40" fill="rgba(255, 152, 0, 0.2)"/>
                <polyline points="0,25 20,20 40,30 60,35 80,15 100,25" fill="none" stroke="#ff9800" strokeWidth="2"/>
             </svg>
          </div>
          <div className="panel-footer-stats">
            <div><span className="stat-label">MÁX VUELO</span><span className="stat-value text-orange">514 m</span></div>
            <div><span className="stat-label">ASCENSO</span><span className="stat-value text-yellow">+1.3 m/s</span></div>
            <div><span className="stat-label">LÍMITE</span><span className="stat-value">500 m</span></div>
          </div>
        </div>

        {/* Distancia al Origen Chart */}
        <div className="panel-card distancia-card">
          <h4 className="panel-header">DISTANCIA AL ORI</h4>
          <div className="panel-main-value">
            <span className="value">118</span>
            <span className="unit">m</span>
          </div>
           <div className="chart-area">
             <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="graph-svg">
                <polygon points="0,40 0,35 20,20 40,25 60,30 80,20 100,35 100,40" fill="rgba(3, 169, 244, 0.2)"/>
                <polyline points="0,35 20,20 40,25 60,30 80,20 100,35" fill="none" stroke="#03a9f4" strokeWidth="2"/>
             </svg>
          </div>
          <div className="panel-footer-stats">
            <div><span className="stat-label">MÁX DIST.</span><span className="stat-value text-cyan">124m</span></div>
            <div><span className="stat-label">ASCENSO</span><span className="stat-value">2.6 km/h</span></div>
            <div><span className="stat-label">RADIO MAX</span><span className="stat-value">500 m</span></div>
          </div>
        </div>

        {/* Señal GPS Bars */}
        <div className="panel-card signal-card">
          <h4 className="panel-header">SEÑAL GPS</h4>
          <div className="panel-main-value">
            <span className="value">10</span>
          </div>
          <div className="signal-bars-area">
            <div className="signal-bar bar-1 active"></div>
            <div className="signal-bar bar-2 active"></div>
            <div className="signal-bar bar-3 active"></div>
            <div className="signal-bar bar-4 active"></div>
            <div className="signal-bar bar-5 active"></div>
            <div className="signal-bar bar-6 active"></div>
            <div className="signal-bar bar-7 active"></div>
            <div className="signal-bar bar-8"></div>
            <div className="signal-bar bar-9"></div>
            <div className="signal-bar bar-10"></div>
          </div>
          <div className="panel-footer-stats">
            <div><span className="stat-label">HDOP</span><span className="stat-value text-green">0.8</span></div>
            <div><span className="stat-label">CALIDAD</span><span className="stat-value text-green">EXCELENTE</span></div>
            <div><span className="stat-label">FIX</span><span className="stat-value text-green">30</span></div>
          </div>
        </div>

      </section>
    </div>
  );
}
