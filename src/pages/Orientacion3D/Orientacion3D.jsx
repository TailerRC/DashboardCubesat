import React, { useState } from 'react';
import CubeSatModel from '../../components/3d/CubeSatModel';
import './Orientacion3D.css';

export default function Orientacion3D() {
  const [modo, setModo] = useState('AUTO'); // 'AUTO' | 'MANUAL'
  const [cabeceo, setCabeceo] = useState(25.3); // X - rojo
  const [balanceo, setBalanceo] = useState(-10.8); // Z - verde
  const [giro, setGiro] = useState(175.1); // Y - azul

  // Render para convertir % del rango de [-180, 180] al width visual de las barras Euler
  const getBarWidth = (val) => {
    // Normalizar de -180...180 a 0...100%
    const normalized = ((Number(val) + 180) / 360) * 100;
    return `${normalized}%`;
  };

  return (
    <div className="orientacion3d-view">
      
      {/* Columna Izquierda: Visor 3D */}
      <section className="visor-column">
        <h3 className="visor-title">Orientación 3D del CubeSat</h3>
        <div className="visor-container-frame">
           <div className="corner-tl"></div>
           <div className="corner-tr"></div>
           <div className="corner-bl"></div>
           <div className="corner-br"></div>
           <div className="visor-canvas-wrapper">
             <CubeSatModel 
               cabeceo={cabeceo} 
               balanceo={balanceo} 
               giro={giro} 
               modo={modo}
               onAutoUpdate={(c, b, g) => {
                 setCabeceo(c);
                 setBalanceo(b);
                 setGiro(g);
               }}
             />
           </div>
        </div>
      </section>

      {/* Columna Derecha: Controles y Datos */}
      <section className="controls-column">
        
        {/* Euler Angles */}
        <div className="panel-card euler-panel premium-card-hover" style={{ '--card-color': '#ef5350' }}>
          <h4 className="panel-header">Euler Angles</h4>
          
          <div className="euler-row">
            <span className="euler-label">Cabezeo:</span>
            <div className="euler-bar-track">
              <div className="euler-bar red-fill" style={{ width: getBarWidth(cabeceo) }}></div>
            </div>
            <span className="euler-value">{Number(cabeceo).toFixed(1)}°</span>
          </div>

          <div className="euler-row">
            <span className="euler-label">Balanceo:</span>
            <div className="euler-bar-track">
              <div className="euler-bar green-fill" style={{ width: getBarWidth(balanceo) }}></div>
            </div>
            <span className="euler-value">{Number(balanceo).toFixed(1)}°</span>
          </div>

          <div className="euler-row">
            <span className="euler-label">Giro:</span>
            <div className="euler-bar-track">
              <div className="euler-bar blue-fill" style={{ width: getBarWidth(giro) }}></div>
            </div>
            <span className="euler-value">{Number(giro).toFixed(1)}°</span>
          </div>
        </div>

        {/* Datos de Movimiento */}
        <div className="panel-card movement-panel premium-card-hover" style={{ '--card-color': '#4fc3f7' }}>
          <h4 className="panel-header">Datos de movimiento</h4>
          
          <div className="sensor-category">Acelerómetro:</div>
          <div className="sensor-grid">
            <div className="sensor-box"><span>X</span><span>0.12</span></div>
            <div className="sensor-box"><span>Y</span><span>0.87</span></div>
            <div className="sensor-box"><span>Z</span><span>9.81</span></div>
          </div>

          <div className="sensor-category">Campo Magnético:</div>
          <div className="sensor-grid">
            <div className="sensor-box"><span>X</span><span>23.4</span></div>
            <div className="sensor-box"><span>Y</span><span>-12.0</span></div>
            <div className="sensor-box"><span>Z</span><span>45.1</span></div>
          </div>

          <div className="sensor-category">Fuerza Inercial:</div>
          <div className="sensor-grid">
            <div className="sensor-box"><span>X</span><span>2.3</span></div>
            <div className="sensor-box"><span>Y</span><span>0.34</span></div>
            <div className="sensor-box"><span>Z</span><span>0.1</span></div>
          </div>
        </div>

        {/* Manual Control */}
        <div className="panel-card manual-panel premium-card-hover" style={{ '--card-color': '#ffb74d' }}>
          <h4 className="panel-header">Manual Control</h4>
          
          <div className="slider-row">
            <span className="slider-label">Cabezeo:</span>
            <input 
              type="range" min="-180" max="180" 
              value={cabeceo} 
              onChange={(e) => setCabeceo(e.target.value)} 
              disabled={modo === 'AUTO'}
              className="styled-slider"
            />
          </div>
          <div className="slider-row">
            <span className="slider-label">Balanceo:</span>
            <input 
              type="range" min="-180" max="180" 
              value={balanceo} 
              onChange={(e) => setBalanceo(e.target.value)} 
              disabled={modo === 'AUTO'}
              className="styled-slider"
            />
          </div>
          <div className="slider-row">
            <span className="slider-label">Giro:</span>
            <input 
              type="range" min="-180" max="180" 
              value={giro} 
              onChange={(e) => setGiro(e.target.value)} 
              disabled={modo === 'AUTO'}
              className="styled-slider"
            />
          </div>
        </div>

        {/* Simulation Mode */}
        <div className="panel-card mode-panel premium-card-hover" style={{ '--card-color': '#66bb6a' }}>
          <h4 className="panel-header">Simulation Mode</h4>
          <div className="mode-buttons-row">
            <button 
              className={`mode-btn ${modo === 'AUTO' ? 'active-auto' : ''}`}
              onClick={() => setModo('AUTO')}
            >
              AUTO IMU
            </button>
            <button 
              className={`mode-btn ${modo === 'MANUAL' ? 'active-manual' : ''}`}
              onClick={() => setModo('MANUAL')}
            >
              MANUAL
            </button>
          </div>
        </div>

      </section>
    </div>
  );
}
