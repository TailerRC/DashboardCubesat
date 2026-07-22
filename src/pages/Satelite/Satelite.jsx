import './Satelite.css';

export default function Satelite() {
  return (
    <div className="satelite-view">

      {/* ── Top Grid: 3 Power Gauges ── */}
      <section className="satelite-top-grid">

        {/* Voltaje Batería */}
        <div className="satelite-card">
          <h4 className="card-header text-center">VOLTAJE BATERÍA</h4>
          <div className="circle-gauge-container">
            <div className="circle-gauge red-gauge">
              <span className="value">12.5</span>
              <span className="unit">Voltios</span>
              <span className="gauge-pct">97.7%</span>
            </div>
          </div>
          <div className="mini-stats">
            <div><span className="stat-lbl">Inicial</span><span className="stat-val text-red">12.80 V</span></div>
            <div><span className="stat-lbl">Actual</span><span className="stat-val text-red">11.61 V</span></div>
            <div><span className="stat-lbl">Mínimo</span><span className="stat-val">11.43 V</span></div>
            <div><span className="stat-lbl">Caída</span><span className="stat-val text-yellow">−1.62 V</span></div>
          </div>
          <div className="sat-chart-wrap">
            <div className="sat-chart-y">
              <span>13.0V</span>
              <span>12.0V</span>
              <span>11.0V</span>
            </div>
            <div className="sat-chart-body">
              <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="sat-graph-svg">
                <defs>
                  <linearGradient id="vBatFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef5350" stopOpacity="0.3"/>
                    <stop offset="100%" stopColor="#ef5350" stopOpacity="0.03"/>
                  </linearGradient>
                </defs>
                <line x1="0" y1="0"  x2="100" y2="0"  stroke="#2a3038" strokeWidth="0.5"/>
                <line x1="0" y1="15" x2="100" y2="15" stroke="#2a3038" strokeWidth="0.5"/>
                <line x1="0" y1="30" x2="100" y2="30" stroke="#2a3038" strokeWidth="0.5"/>
                <polygon points="0,30 0,5 15,6 30,8 45,10 60,12 75,14 90,15 100,16 100,30" fill="url(#vBatFill)"/>
                <polyline points="0,5 15,6 30,8 45,10 60,12 75,14 90,15 100,16" fill="none" stroke="#ef5350" strokeWidth="1.5"/>
                <circle cx="100" cy="16" r="2" fill="#ef5350" stroke="#fff" strokeWidth="0.8"/>
              </svg>
              <div className="sat-chart-x">
                <span>−60s</span><span>−45s</span><span>−30s</span><span>−15s</span><span>0s</span>
              </div>
            </div>
          </div>
        </div>

        {/* Corriente */}
        <div className="satelite-card">
          <h4 className="card-header text-center">CORRIENTE</h4>
          <div className="circle-gauge-container">
            <div className="circle-gauge blue-gauge">
              <span className="value">455.8</span>
              <span className="unit">mA</span>
              <span className="gauge-pct">50.6%</span>
            </div>
          </div>
          <div className="mini-stats">
            <div><span className="stat-lbl">Base</span><span className="stat-val text-blue">380 mA</span></div>
            <div><span className="stat-lbl">Actual</span><span className="stat-val text-blue">455.8 mA</span></div>
            <div><span className="stat-lbl">Pico Máx</span><span className="stat-val">620 mA</span></div>
            <div><span className="stat-lbl">Límite</span><span className="stat-val">900 mA</span></div>
          </div>
          <div className="sat-chart-wrap">
            <div className="sat-chart-y">
              <span>600mA</span>
              <span>450mA</span>
              <span>300mA</span>
            </div>
            <div className="sat-chart-body">
              <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="sat-graph-svg">
                <defs>
                  <linearGradient id="corrFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#42a5f5" stopOpacity="0.3"/>
                    <stop offset="100%" stopColor="#42a5f5" stopOpacity="0.03"/>
                  </linearGradient>
                </defs>
                <line x1="0" y1="0"  x2="100" y2="0"  stroke="#2a3038" strokeWidth="0.5"/>
                <line x1="0" y1="15" x2="100" y2="15" stroke="#2a3038" strokeWidth="0.5"/>
                <line x1="0" y1="30" x2="100" y2="30" stroke="#2a3038" strokeWidth="0.5"/>
                <polygon points="0,30 0,14 15,12 30,18 45,13 60,16 75,12 90,15 100,14 100,30" fill="url(#corrFill)"/>
                <polyline points="0,14 15,12 30,18 45,13 60,16 75,12 90,15 100,14" fill="none" stroke="#42a5f5" strokeWidth="1.5"/>
                <circle cx="100" cy="14" r="2" fill="#42a5f5" stroke="#fff" strokeWidth="0.8"/>
              </svg>
              <div className="sat-chart-x">
                <span>−60s</span><span>−45s</span><span>−30s</span><span>−15s</span><span>0s</span>
              </div>
            </div>
          </div>
        </div>

        {/* Consumo Energía */}
        <div className="satelite-card">
          <h4 className="card-header text-center">CONSUMO ENERGÍA</h4>
          <div className="circle-gauge-container">
            <div className="circle-gauge purple-gauge">
              <span className="value">4.56</span>
              <span className="unit">Watts</span>
              <span className="gauge-pct">45.6%</span>
            </div>
          </div>
          <div className="mini-stats">
            <div><span className="stat-lbl">Base</span><span className="stat-val">4.5 W</span></div>
            <div><span className="stat-lbl">Actual</span><span className="stat-val text-purple">4.56 W</span></div>
            <div><span className="stat-lbl">Pico Máx</span><span className="stat-val">10.25 W</span></div>
            <div><span className="stat-lbl">Límite</span><span className="stat-val">10 W</span></div>
          </div>
          <div className="sat-chart-wrap">
            <div className="sat-chart-y">
              <span>8.0W</span>
              <span>5.0W</span>
              <span>2.0W</span>
            </div>
            <div className="sat-chart-body">
              <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="sat-graph-svg">
                <defs>
                  <linearGradient id="powFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ba68c8" stopOpacity="0.3"/>
                    <stop offset="100%" stopColor="#ba68c8" stopOpacity="0.03"/>
                  </linearGradient>
                </defs>
                <line x1="0" y1="0"  x2="100" y2="0"  stroke="#2a3038" strokeWidth="0.5"/>
                <line x1="0" y1="15" x2="100" y2="15" stroke="#2a3038" strokeWidth="0.5"/>
                <line x1="0" y1="30" x2="100" y2="30" stroke="#2a3038" strokeWidth="0.5"/>
                <polygon points="0,30 0,16 15,12 30,18 45,8 60,16 75,12 90,18 100,16 100,30" fill="url(#powFill)"/>
                <polyline points="0,16 15,12 30,18 45,8 60,16 75,12 90,18 100,16" fill="none" stroke="#ba68c8" strokeWidth="1.5"/>
                <circle cx="100" cy="16" r="2" fill="#ba68c8" stroke="#fff" strokeWidth="0.8"/>
              </svg>
              <div className="sat-chart-x">
                <span>−60s</span><span>−45s</span><span>−30s</span><span>−15s</span><span>0s</span>
              </div>
            </div>
          </div>
        </div>

      </section>

      {/* ── Bottom Grid: Aceleración + Estado ── */}
      <section className="satelite-bottom-grid">

        {/* Aceleración 3 ejes */}
        <div className="satelite-card">
          <h4 className="card-header text-center">ACELERÓMETRO 3 EJES (m/s²)</h4>
          <div className="accel-container">
            {/* X axis */}
            <div className="accel-row">
              <span className="accel-label text-red">X</span>
              <div className="accel-gauge-wrapper">
                <div className="accel-status-text">+9.0 m/s²</div>
                <div className="accel-slider-track">
                  <div className="accel-indicator" style={{ left: '72.5%', backgroundColor: '#ef5350' }}></div>
                </div>
                <div className="accel-ticks">
                  <span>−20</span><span>−10</span><span>0</span><span>+10</span><span>+20</span>
                </div>
              </div>
            </div>
            {/* Y axis */}
            <div className="accel-row">
              <span className="accel-label text-yellow">Y</span>
              <div className="accel-gauge-wrapper">
                <div className="accel-status-text">+7.2 m/s²</div>
                <div className="accel-slider-track">
                  <div className="accel-indicator" style={{ left: '68%', backgroundColor: '#ffca28' }}></div>
                </div>
                <div className="accel-ticks">
                  <span>−20</span><span>−10</span><span>0</span><span>+10</span><span>+20</span>
                </div>
              </div>
            </div>
            {/* Z axis */}
            <div className="accel-row">
              <span className="accel-label text-green">Z</span>
              <div className="accel-gauge-wrapper">
                <div className="accel-status-text">+8.5 m/s²</div>
                <div className="accel-slider-track">
                  <div className="accel-indicator" style={{ left: '71.25%', backgroundColor: '#66bb6a' }}></div>
                </div>
                <div className="accel-ticks">
                  <span>−20</span><span>−10</span><span>0</span><span>+10</span><span>+20</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Estado del Sistema */}
        <div className="satelite-card">
          <h4 className="card-header text-center">ESTADO DEL SISTEMA</h4>
          <div className="system-status-list">
            <div className="system-status-item">
              <span className="sys-label"><i className="fa-solid fa-microchip fa-fw" style={{color:'#4fc3f7', marginRight:'6px'}}></i>Sensores Activos</span>
              <span className="sys-value text-green">7 / 7</span>
            </div>
            <div className="system-status-item">
              <span className="sys-label"><i className="fa-solid fa-temperature-half fa-fw" style={{color:'#ff7043', marginRight:'6px'}}></i>Temperatura MCU</span>
              <span className="sys-value">28.3 °C</span>
            </div>
            <div className="system-status-item">
              <span className="sys-label"><i className="fa-solid fa-memory fa-fw" style={{color:'#66bb6a', marginRight:'6px'}}></i>Memoria Flash</span>
              <span className="sys-value text-green">OK</span>
            </div>
            <div className="system-status-item">
              <span className="sys-label"><i className="fa-solid fa-sd-card fa-fw" style={{color:'#66bb6a', marginRight:'6px'}}></i>SD Card</span>
              <span className="sys-value text-green">OK — 2.1 GB libres</span>
            </div>
            <div className="system-status-item">
              <span className="sys-label"><i className="fa-solid fa-satellite fa-fw" style={{color:'#4fc3f7', marginRight:'6px'}}></i>GPS Fix</span>
              <span className="sys-value text-green">3D FIX · 9 sat.</span>
            </div>
            <div className="system-status-item">
              <span className="sys-label"><i className="fa-solid fa-clock fa-fw" style={{color:'#ab47bc', marginRight:'6px'}}></i>Tiempo Encendido</span>
              <span className="sys-value">01:05:23</span>
            </div>
          </div>
        </div>

      </section>
    </div>
  );
}
