import React from 'react';
import './Mision.css';

export default function Mision() {
  const fases = [
    { label: 'INICIALIZACIÓN', status: 'completed' },
    { label: 'ASCENSO / LANZAMIENTO', status: 'completed' },
    { label: 'DESCENSO', status: 'active' },
    { label: 'PROXIMIDAD AL SUELO', status: 'pending' },
    { label: 'ATERRIZADO', status: 'pending' },
  ];

  return (
    <div className="mision-view">
      
      {/* Pabel Izquierdo: Fases de Misión */}
      <section className="panel-card mision-fases">
        <div className="fase-header">
          <span className="fase-subtitle">FASE ACTUAL</span>
          <h2 className="fase-title">DESCENSO</h2>
        </div>
        
        <div className="fases-list">
          {fases.map((fase, i) => (
            <div key={i} className={`fase-item fase-${fase.status}`}>
              <div className="fase-icon">
                {fase.status !== 'pending' && <div className="fase-icon-inner"></div>}
              </div>
              <span className="fase-label">{fase.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Panel Derecho Top: Aceleración */}
      <section className="panel-card mision-aceleracion">
        <h3 className="panel-header" style={{textAlign: 'center', margin: 0}}>ACELERACIÓN EN TIEMPO REAL</h3>
        
        <div className="aceleracion-visualizer">
          <span className="ax-label ax-top">+10°</span>
          <span className="ax-label ax-bottom">-10°</span>
          <span className="ax-label ax-left">-10°</span>
          <span className="ax-label ax-right">+10°</span>
          
          <div className="crosshair-container">
             <div className="crosshair-h"></div>
             <div className="crosshair-v"></div>
             <div className="crosshair-circle"></div>
             <div className="crosshair-icon">
               <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                 <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07L19.07 4.93" />
               </svg>
             </div>
          </div>
        </div>

        <div className="aceleracion-stats">
          <span>Cabeceo: <strong>+2.3°</strong></span>
          <span>Balanceo: <strong>-0.8°</strong></span>
          <span>Giro: <strong>180°</strong></span>
        </div>
      </section>

      {/* Panel Inferior: Perfil de Altitud */}
      <section className="panel-card mision-perfil">
        <h3 className="panel-header">PERFIL DE ALTITUD VS TIEMPO DE MISIÓN</h3>
        <div className="chart-container">
          <div className="y-axis">
            <span>500 m</span>
            <span>400 m</span>
            <span>300 m</span>
            <span>200 m</span>
            <span>100 m</span>
            <span>0 m</span>
          </div>
          <div className="chart-area">
            {/* Líneas de cuadrícula horizontal */}
            <div className="grid-line" style={{bottom: '100%'}}></div>
            <div className="grid-line" style={{bottom: '80%'}}></div>
            <div className="grid-line" style={{bottom: '60%'}}></div>
            <div className="grid-line" style={{bottom: '40%'}}></div>
            <div className="grid-line" style={{bottom: '20%'}}></div>
            <div className="grid-line" style={{bottom: '0%'}}></div>

            {/* Simulación del SVG de la gráfica */}
            <svg 
              className="chart-svg" 
              viewBox="0 0 100 100" 
              preserveAspectRatio="none"
            >
              <polyline 
                points="0,100 20,100 35,20 45,20 70,100 100,100" 
                fill="none" 
                stroke="#ffeb3b" 
                strokeWidth="0.8"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>
        </div>
      </section>

    </div>
  );
}
