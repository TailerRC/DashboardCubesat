import './Ubicacion.css';

export default function Ubicacion() {
  return (
    <div className="ubicacion-view">

      {/* ── Top: Map + GPS Data ── */}
      <section className="ubicacion-top-section">

        {/* Map Panel */}
        <div className="map-panel">
          <div className="map-grid-bg">
            {/* Simulated trajectory path */}
            <svg className="trajectory-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
              <polyline
                points="10,90 15,85 20,75 28,60 36,40 44,25 50,20 56,25 64,42 72,62 80,78 87,86 92,90"
                fill="none" stroke="rgba(76,175,80,0.4)" strokeWidth="0.8" strokeDasharray="3 2"
              />
              <circle cx="87" cy="86" r="1.5" fill="#4caf50" opacity="0.7"/>
            </svg>

            <div className="radar-circle">
              <i className="fa-solid fa-crosshairs fa-spin" style={{ color: '#4caf50', fontSize: '24px' }}></i>
            </div>

            {/* Map grid labels */}
            <div className="map-lat-label" style={{ top: '12px', left: '12px' }}>N −12.43°</div>
            <div className="map-lat-label" style={{ bottom: '36px', left: '12px' }}>S −12.44°</div>
            <div className="map-lon-label" style={{ bottom: '36px', left: '12px' }}>W −77.22°</div>
            <div className="map-lon-label" style={{ bottom: '36px', right: '12px' }}>E −77.20°</div>

            <div className="map-coordinates-label">
              LAT: −12.4342 &nbsp;|&nbsp; LON: −77.2134
            </div>
          </div>
          <div className="map-footer">
            <span className="map-title-label">
              <i className="fa-solid fa-route" style={{ marginRight: '6px', color: '#4fc3f7' }}></i>
              MAPA DE TRAYECTORIA EN TIEMPO REAL
            </span>
            <span className="map-subtitle-label">Actualización cada 2s · 9 satélites visibles</span>
          </div>
        </div>

        {/* GPS Data Panel */}
        <div className="gps-data-panel">
          <h4 className="gps-panel-header">
            <i className="fa-solid fa-satellite" style={{ marginRight: '6px', color: '#4fc3f7' }}></i>
            DATOS GPS
          </h4>

          <table className="gps-table">
            <tbody>
              <tr><td>Latitud:</td><td className="gps-val">−12.4342</td></tr>
              <tr><td>Longitud:</td><td className="gps-val">−77.2134</td></tr>
              <tr><td>Altitud GPS:</td><td className="gps-val gps-hi">525 m</td></tr>
              <tr><td>Velocidad:</td><td className="gps-val">15.3 km/h</td></tr>
              <tr><td>Satélites:</td><td className="gps-val gps-ok">9 visibles</td></tr>
              <tr><td>HDOP:</td><td className="gps-val gps-ok">0.8 (Excelente)</td></tr>
              <tr><td>Fecha UTC:</td><td className="gps-val">2026-03-24</td></tr>
              <tr><td>Hora UTC:</td><td className="gps-val mono">21:00:23</td></tr>
            </tbody>
          </table>

          <div className="landing-coords">
            <div className="landing-label">
              <i className="fa-solid fa-flag-checkered" style={{ marginRight: '5px' }}></i>
              Coordenadas de Aterrizaje
            </div>
            <div className="landing-value">−12.4123, −77.2078</div>
          </div>
        </div>
      </section>

      {/* ── Bottom: Charts ── */}
      <section className="ubicacion-bottom-section">

        {/* Altitud GPS */}
        <div className="panel-card altitud-card">
          <h4 className="ubi-panel-header">ALTITUD GPS</h4>
          <div className="panel-main-value">
            <span className="big-value">525</span>
            <span className="big-unit">m</span>
          </div>
          <div className="chart-axes-wrap">
            <div className="chart-y-side">
              <span>500m</span>
              <span>375m</span>
              <span>250m</span>
              <span>125m</span>
              <span>0m</span>
            </div>
            <div className="chart-body">
              <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="ubi-svg">
                <defs>
                  <linearGradient id="altFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff9800" stopOpacity="0.35"/>
                    <stop offset="100%" stopColor="#ff9800" stopOpacity="0.03"/>
                  </linearGradient>
                </defs>
                {/* Grid lines */}
                <line x1="0" y1="0"  x2="100" y2="0"  stroke="#2a3038" strokeWidth="0.5"/>
                <line x1="0" y1="12.5" x2="100" y2="12.5" stroke="#2a3038" strokeWidth="0.5"/>
                <line x1="0" y1="25" x2="100" y2="25" stroke="#2a3038" strokeWidth="0.5"/>
                <line x1="0" y1="37.5" x2="100" y2="37.5" stroke="#2a3038" strokeWidth="0.5"/>
                <line x1="0" y1="50" x2="100" y2="50" stroke="#2a3038" strokeWidth="0.5"/>
                {/* Area + line (cubesat: ascends then descends) */}
                <polygon points="0,50 0,50 15,50 30,35 45,10 55,5 65,5 75,22 85,38 100,50 100,50" fill="url(#altFill)"/>
                <polyline points="0,50 15,50 30,35 45,10 55,5 65,5 75,22 85,38 100,50" fill="none" stroke="#ff9800" strokeWidth="1.8"/>
                {/* Current position marker */}
                <circle cx="85" cy="38" r="2.5" fill="#ff9800" stroke="#fff" strokeWidth="0.8"/>
                {/* Max altitude line */}
                <line x1="45" y1="5" x2="65" y2="5" stroke="#ffeb3b" strokeWidth="0.6" strokeDasharray="3 2" opacity="0.7"/>
              </svg>
              <div className="chart-x-row">
                <span>T+0</span><span>T+3</span><span>T+6</span><span>T+9</span><span>T+12min</span>
              </div>
            </div>
          </div>
          <div className="panel-footer-stats">
            <div><span className="stat-label">MÁX VUELO</span><span className="stat-value text-orange">514 m</span></div>
            <div><span className="stat-label">VELOCIDAD</span><span className="stat-value text-yellow">−1.3 m/s</span></div>
            <div><span className="stat-label">LÍMITE</span><span className="stat-value">500 m</span></div>
          </div>
        </div>

        {/* Distancia al Origen */}
        <div className="panel-card distancia-card">
          <h4 className="ubi-panel-header">DISTANCIA AL ORIGEN</h4>
          <div className="panel-main-value">
            <span className="big-value">118</span>
            <span className="big-unit">m</span>
          </div>
          <div className="chart-axes-wrap">
            <div className="chart-y-side">
              <span>200m</span>
              <span>150m</span>
              <span>100m</span>
              <span>50m</span>
              <span>0m</span>
            </div>
            <div className="chart-body">
              <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="ubi-svg">
                <defs>
                  <linearGradient id="distFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#03a9f4" stopOpacity="0.35"/>
                    <stop offset="100%" stopColor="#03a9f4" stopOpacity="0.03"/>
                  </linearGradient>
                </defs>
                <line x1="0" y1="0"  x2="100" y2="0"  stroke="#2a3038" strokeWidth="0.5"/>
                <line x1="0" y1="12.5" x2="100" y2="12.5" stroke="#2a3038" strokeWidth="0.5"/>
                <line x1="0" y1="25" x2="100" y2="25" stroke="#2a3038" strokeWidth="0.5"/>
                <line x1="0" y1="37.5" x2="100" y2="37.5" stroke="#2a3038" strokeWidth="0.5"/>
                <line x1="0" y1="50" x2="100" y2="50" stroke="#2a3038" strokeWidth="0.5"/>
                {/* Distance increases during ascent/descent then returns near origin */}
                <polygon points="0,50 0,50 20,45 35,30 50,15 60,12 75,20 85,32 100,40 100,50" fill="url(#distFill)"/>
                <polyline points="0,50 20,45 35,30 50,15 60,12 75,20 85,32 100,40" fill="none" stroke="#03a9f4" strokeWidth="1.8"/>
                <circle cx="85" cy="32" r="2.5" fill="#03a9f4" stroke="#fff" strokeWidth="0.8"/>
              </svg>
              <div className="chart-x-row">
                <span>T+0</span><span>T+3</span><span>T+6</span><span>T+9</span><span>T+12min</span>
              </div>
            </div>
          </div>
          <div className="panel-footer-stats">
            <div><span className="stat-label">MÁX DIST.</span><span className="stat-value text-cyan">124 m</span></div>
            <div><span className="stat-label">VELOCIDAD</span><span className="stat-value">2.6 km/h</span></div>
            <div><span className="stat-label">RADIO MAX</span><span className="stat-value">500 m</span></div>
          </div>
        </div>

        {/* Señal GPS */}
        <div className="panel-card signal-card">
          <h4 className="ubi-panel-header">SEÑAL GPS</h4>
          <div className="panel-main-value">
            <span className="big-value">10</span>
            <span className="big-unit">/ 10</span>
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
          <div className="signal-scale">
            <span>Débil</span><span></span><span></span><span></span><span>Excelente</span>
          </div>
          <div className="panel-footer-stats" style={{ marginTop: '10px' }}>
            <div><span className="stat-label">HDOP</span><span className="stat-value text-green">0.8</span></div>
            <div><span className="stat-label">CALIDAD</span><span className="stat-value text-green">EXCELENTE</span></div>
            <div><span className="stat-label">FIX</span><span className="stat-value text-green">30</span></div>
          </div>
        </div>

      </section>
    </div>
  );
}
