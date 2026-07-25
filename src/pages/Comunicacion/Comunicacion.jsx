import React from 'react';
import './Comunicacion.css';

export default function Comunicacion() {
  const pkts = Array(30).fill('ok');
  pkts[15] = 'error';
  pkts[16] = 'error';
  pkts[28] = 'error';

  return (
    <div className="comunicacion-view">
      
      {/* Top Stats Grid */}
      <section className="com-stats-grid">
        <div className="com-stat-card premium-card-hover" style={{ '--card-color': '#4fc3f7' }}>
          <span className="com-stat-title">PAQUETES ENVIADOS</span>
          <div className="com-stat-value blue-text">5880</div>
          <span className="com-stat-subtitle">Desde el satélite</span>
        </div>
        
        <div className="com-stat-card premium-card-hover" style={{ '--card-color': '#8bc34a' }}>
          <span className="com-stat-title">PAQUETES RECIBIDOS</span>
          <div className="com-stat-value green-text">6265</div>
          <span className="com-stat-subtitle">En estación terrena</span>
        </div>
        
        <div className="com-stat-card premium-card-hover" style={{ '--card-color': '#ff9800' }}>
          <span className="com-stat-title">PAQUETES PERDIDOS</span>
          <div className="com-stat-value orange-text">- 318</div>
        </div>
        
        <div className="com-stat-card premium-card-hover" style={{ '--card-color': '#ffeb3b' }}>
          <span className="com-stat-title">FRECUENCIA TX</span>
          <div className="com-stat-value yellow-text">433 <span className="unit-small">MHz</span></div>
        </div>
      </section>

      {/* Middle Grid */}
      <section className="com-middle-grid">
        {/* Signal Stats */}
        <div className="panel-card signal-panel premium-card-hover" style={{ '--card-color': '#2196f3' }}>
          <div className="signal-header">
            <i className="fa-solid fa-tower-broadcast" style={{ color: '#fff', fontSize: '24px' }}></i>
            <h2>ENLACE ACTIVO</h2>
          </div>
          
          <div className="signal-list">
            <div className="signal-row"><span>RSSI:</span><strong>-72 dBm</strong></div>
            <div className="signal-row"><span>SNR:</span><strong>8.4 dB</strong></div>
            <div className="signal-row"><span>FRECUENCIA:</span><strong>433.0 MHz</strong></div>
            <div className="signal-row"><span>BAUDIOS:</span><strong>9600</strong></div>
            <div className="signal-row"><span>ÚLTIMO PKT:</span><strong>08:13:25</strong></div>
          </div>
        </div>

        {/* Visualizacion de paquetes */}
        <div className="panel-card pkt-panel premium-card-hover" style={{ '--card-color': '#4caf50' }}>
          <h3 className="panel-header" style={{textTransform: 'none'}}>Visualización de Paquetes</h3>
          
          <div className="pkt-blocks">
            {pkts.map((status, i) => (
              <div key={i} className={`pkt-block pkt-${status}`}></div>
            ))}
          </div>

          <div className="pkt-legend">
            <div className="legend-item"><div className="pkt-block pkt-ok"></div> RX OK</div>
            <div className="legend-item"><div className="pkt-block pkt-error"></div> RX ERROR</div>
          </div>

          <h3 className="panel-header" style={{textTransform: 'none', marginTop: '16px'}}>Progreso de la misión</h3>
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{width: '62.4%'}}></div>
            <span className="progress-text">298 / 500 paquetes (62.4%)</span>
          </div>
        </div>
      </section>

      {/* Bottom Log */}
      <section className="panel-card log-panel premium-card-hover" style={{ '--card-color': '#ffb74d' }}>
        <h3 className="panel-header">LOG DE PAQUETES RECIENTES</h3>
        <div className="log-container">
          <div className="log-line"><span>08:13:25</span> <span className="log-ok">[RX OK]</span> PKT#001 - CO2:409 T:23.3 H:66.0</div>
          <div className="log-line"><span>08:13:26</span> <span className="log-ok">[RX OK]</span> PKT#002 - CMD:ACK</div>
          <div className="log-line"><span>08:13:27</span> <span className="log-ok">[RX OK]</span> PKT#003 - CO2:410 T:23.4 H:66.1</div>
          <div className="log-line"><span>08:13:28</span> <span className="log-error">[RX ERROR]</span> PKT#004 - Checksum Error</div>
          <div className="log-line"><span>08:13:29</span> <span className="log-ok">[RX OK]</span> PKT#005 - CO2:409 T:23.3 H:66.0</div>
          <div className="log-line"><span>08:13:30</span> <span className="log-ok">[RX OK]</span> PKT#006 - CMD:ACK</div>
          <div className="log-line"><span>08:13:31</span> <span className="log-ok">[RX OK]</span> PKT#007 - CO2:411 T:23.5 H:66.2</div>
          <div className="log-line"><span>08:13:32</span> <span className="log-ok">[RX OK]</span> PKT#008 - CO2:410 T:23.4 H:66.1</div>
        </div>
      </section>

    </div>
  );
}
