import './Satelite.css';

export default function Satelite() {
  return (
    <div className="satelite-view">
      {/* Top Grid */}
      <section className="satelite-top-grid">
        
        {/* Voltaje Batería */}
        <div className="satelite-card">
          <h4 className="card-header text-center">Voltaje Batería</h4>
          <div className="circle-gauge-container">
            <div className="circle-gauge red-gauge">
              <span className="value">12.5</span>
              <span className="unit">Voltios</span>
            </div>
          </div>
          <div className="mini-stats">
            <div><span className="stat-lbl">Inicial</span><span className="stat-val text-red">12.80V</span></div>
            <div><span className="stat-lbl">Actual</span><span className="stat-val text-red">11.61V</span></div>
            <div><span className="stat-lbl">Mínimo</span><span className="stat-val">11.43V</span></div>
            <div><span className="stat-lbl">Caída</span><span className="stat-val text-yellow">-1.62V</span></div>
          </div>
          <div className="chart-area mt-auto">
             <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="graph-svg">
                <polygon points="0,30 0,20 10,25 20,15 30,22 40,25 50,18 60,20 70,22 80,19 90,25 100,20 100,30" fill="rgba(244, 67, 54, 0.2)"/>
                <polyline points="0,20 10,25 20,15 30,22 40,25 50,18 60,20 70,22 80,19 90,25 100,20" fill="none" stroke="#f44336" strokeWidth="2"/>
             </svg>
          </div>
        </div>

        {/* Corriente */}
        <div className="satelite-card">
          <h4 className="card-header text-center">Corriente</h4>
          <div className="circle-gauge-container">
            <div className="circle-gauge blue-gauge">
              <span className="value">455.8</span>
              <span className="unit">mA</span>
            </div>
          </div>
          <div className="mini-stats">
            <div><span className="stat-lbl">Base</span><span className="stat-val text-blue">380 mA</span></div>
            <div><span className="stat-lbl">Actual</span><span className="stat-val text-blue">455.8 mA</span></div>
            <div><span className="stat-lbl">Pico Max</span><span className="stat-val">11.43V</span></div>
            <div><span className="stat-lbl">Límite</span><span className="stat-val">900 mA</span></div>
          </div>
          <div className="chart-area mt-auto">
             <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="graph-svg">
                <polygon points="0,30 0,22 15,18 30,25 45,20 60,24 75,19 85,22 100,18 100,30" fill="rgba(33, 150, 243, 0.2)"/>
                <polyline points="0,22 15,18 30,25 45,20 60,24 75,19 85,22 100,18" fill="none" stroke="#2196f3" strokeWidth="2"/>
             </svg>
          </div>
        </div>

        {/* Consumo Energía */}
        <div className="satelite-card">
          <h4 className="card-header text-center">Consumo Energía</h4>
          <div className="circle-gauge-container">
            <div className="circle-gauge purple-gauge">
              <span className="value">4.56</span>
              <span className="unit">Watts</span>
            </div>
          </div>
          <div className="mini-stats">
            <div><span className="stat-lbl">Base</span><span className="stat-val">-4.5 W</span></div>
            <div><span className="stat-lbl">Actual</span><span className="stat-val text-purple">4.56 W</span></div>
            <div><span className="stat-lbl">Pico Max</span><span className="stat-val">10.25 W</span></div>
            <div><span className="stat-lbl">Límite</span><span className="stat-val">10 W</span></div>
          </div>
          <div className="chart-area mt-auto">
             <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="graph-svg">
                <polygon points="0,30 0,20 20,22 35,15 50,25 65,22 80,15 100,20 100,30" fill="rgba(156, 39, 176, 0.2)"/>
                <polyline points="0,20 20,22 35,15 50,25 65,22 80,15 100,20" fill="none" stroke="#9c27b0" strokeWidth="2"/>
             </svg>
          </div>
        </div>

      </section>

      {/* Bottom Grid */}
      <section className="satelite-bottom-grid">
        
        {/* Aceleración */}
        <div className="satelite-card">
          <h4 className="card-header text-center">Aceleración</h4>
          
          <div className="accel-container">
             {/* X axis */}
             <div className="accel-row">
               <span className="accel-label text-red">X</span>
               <div className="accel-gauge-wrapper">
                 <div className="accel-status-text">+ 9 m/s2</div>
                 <div className="accel-slider-track">
                   <div className="accel-indicator" style={{ left: '60%', backgroundColor: '#f44336' }}></div>
                 </div>
                 <div className="accel-ticks"><span>-20</span><span>-10</span><span>0</span><span>+10</span><span>+20</span></div>
               </div>
             </div>

             {/* Y axis */}
             <div className="accel-row">
               <span className="accel-label text-yellow">Y</span>
               <div className="accel-gauge-wrapper">
                 <div className="accel-status-text">+ 7.2 m/s2</div>
                 <div className="accel-slider-track">
                   <div className="accel-indicator" style={{ left: '55%', backgroundColor: '#ff9800' }}></div>
                 </div>
                 <div className="accel-ticks"><span>-20</span><span>-10</span><span>0</span><span>+10</span><span>+20</span></div>
               </div>
             </div>

             {/* Z axis */}
             <div className="accel-row">
               <span className="accel-label text-green">Z</span>
               <div className="accel-gauge-wrapper">
                 <div className="accel-status-text">+ 8.5 m/s2</div>
                 <div className="accel-slider-track">
                   <div className="accel-indicator" style={{ left: '58%', backgroundColor: '#4caf50' }}></div>
                 </div>
                 <div className="accel-ticks"><span>-20</span><span>-10</span><span>0</span><span>+10</span><span>+20</span></div>
               </div>
             </div>
          </div>
        </div>

        {/* Estado del Sistema */}
        <div className="satelite-card">
          <h4 className="card-header text-center">Estado del Sistema</h4>
          
          <div className="system-status-list">
             <div className="system-status-item">
                <span className="sys-label">Sensores Activos:</span>
                <span className="sys-value">7/7</span>
             </div>
             <div className="system-status-item">
                <span className="sys-label">Temperatura MCU:</span>
                <span className="sys-value">28.3 °C</span>
             </div>
             <div className="system-status-item">
                <span className="sys-label">Memoria Flash:</span>
                <span className="sys-value text-green">OK</span>
             </div>
             <div className="system-status-item">
                <span className="sys-label">SD Card:</span>
                <span className="sys-value text-green">OK</span>
             </div>
             <div className="system-status-item">
                <span className="sys-label">GPS Fix:</span>
                <span className="sys-value">30 FIX</span>
             </div>
             <div className="system-status-item">
                <span className="sys-label">Tiempo Encendido:</span>
                <span className="sys-value">01:05:23</span>
             </div>
          </div>
        </div>

      </section>
    </div>
  );
}
