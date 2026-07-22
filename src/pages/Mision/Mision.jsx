import React from 'react';
import './Mision.css';

export default function Mision() {
  const fases = [
    { label: 'INICIALIZACIÓN', status: 'completed', icon: 'fa-check' },
    { label: 'ASCENSO / LANZAMIENTO', status: 'completed', icon: 'fa-check' },
    { label: 'DESCENSO', status: 'active', icon: 'fa-arrow-down' },
    { label: 'PROXIMIDAD AL SUELO', status: 'pending', icon: 'fa-circle-dot' },
    { label: 'ATERRIZADO', status: 'pending', icon: 'fa-circle-dot' },
  ];

  return (
    <div className="mision-view">

      {/* ── Panel Izquierdo: Fases de Misión ── */}
      <section className="panel-card mision-fases">
        <div className="fase-header">
          <span className="fase-subtitle">FASE ACTUAL</span>
          <h2 className="fase-title">DESCENSO</h2>
        </div>

        <div className="fases-list">
          {fases.map((fase, i) => (
            <div key={i} className={`fase-item fase-${fase.status}`}>
              <div className="fase-icon">
                {fase.status !== 'pending'
                  ? <div className="fase-icon-inner"></div>
                  : null}
              </div>
              <span className="fase-label">{fase.label}</span>
              {fase.status === 'completed' && (
                <i className="fa-solid fa-check" style={{ marginLeft: 'auto', fontSize: '12px', opacity: 0.8 }}></i>
              )}
              {fase.status === 'active' && (
                <i className="fa-solid fa-circle-dot fa-beat" style={{ marginLeft: 'auto', fontSize: '12px', color: '#4fc3f7' }}></i>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Panel Derecho: Actitud/Orientación ── */}
      <section className="panel-card mision-aceleracion">
        <h3 className="panel-header" style={{ textAlign: 'center' }}>ORIENTACIÓN EN TIEMPO REAL</h3>

        <div className="aceleracion-visualizer">
          <span className="ax-label ax-top">+10°</span>
          <span className="ax-label ax-bottom">−10°</span>
          <span className="ax-label ax-left">−10°</span>
          <span className="ax-label ax-right">+10°</span>

          <div className="crosshair-container">
            <div className="crosshair-h"></div>
            <div className="crosshair-v"></div>
            <div className="crosshair-circle"></div>
            <div className="crosshair-icon">
              <i className="fa-solid fa-crosshairs" style={{ color: '#4fc3f7', fontSize: '22px' }}></i>
            </div>
          </div>
        </div>

        <div className="aceleracion-stats">
          <span>Cabeceo: <strong>+2.3°</strong></span>
          <span>Balanceo: <strong>−0.8°</strong></span>
          <span>Giro (Yaw): <strong>180°</strong></span>
        </div>
      </section>

      {/* ── Panel Inferior: Perfil de Altitud vs Tiempo ── */}
      <section className="panel-card mision-perfil">
        <h3 className="panel-header">
          <i className="fa-solid fa-chart-area" style={{ marginRight: '8px', color: '#ffeb3b' }}></i>
          PERFIL DE ALTITUD VS TIEMPO DE MISIÓN
        </h3>

        <div className="perfil-legend">
          <span className="legend-item"><span className="legend-dot" style={{ background: '#ffeb3b' }}></span>Altitud (m)</span>
          <span className="legend-item"><span className="legend-dot" style={{ background: '#4fc3f7', opacity: 0.6 }}></span>Trayectoria objetivo</span>
          <span className="legend-item">
            <span style={{ display: 'inline-block', width: '14px', height: '2px', background: '#ef5350', marginRight: '5px', verticalAlign: 'middle' }}></span>
            Altitud máxima alcanzada (514m)
          </span>
        </div>

        <div className="perfil-chart-wrap">
          <div className="perfil-y-axis">
            <span>500m</span>
            <span>400m</span>
            <span>300m</span>
            <span>200m</span>
            <span>100m</span>
            <span>0m</span>
          </div>
          <div className="perfil-chart-body">
            <svg
              className="perfil-svg"
              viewBox="0 0 200 100"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="altPerfilFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffeb3b" stopOpacity="0.35"/>
                  <stop offset="100%" stopColor="#ffeb3b" stopOpacity="0.04"/>
                </linearGradient>
                <linearGradient id="targetFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4fc3f7" stopOpacity="0.12"/>
                  <stop offset="100%" stopColor="#4fc3f7" stopOpacity="0.01"/>
                </linearGradient>
              </defs>

              {/* Grid lines horizontal */}
              <line x1="0" y1="0"   x2="200" y2="0"   stroke="#2a3038" strokeWidth="0.6"/>
              <line x1="0" y1="20"  x2="200" y2="20"  stroke="#2a3038" strokeWidth="0.6"/>
              <line x1="0" y1="40"  x2="200" y2="40"  stroke="#2a3038" strokeWidth="0.6"/>
              <line x1="0" y1="60"  x2="200" y2="60"  stroke="#2a3038" strokeWidth="0.6"/>
              <line x1="0" y1="80"  x2="200" y2="80"  stroke="#2a3038" strokeWidth="0.6"/>
              <line x1="0" y1="100" x2="200" y2="100" stroke="#2a3038" strokeWidth="0.6"/>

              {/* Grid lines vertical */}
              <line x1="50"  y1="0" x2="50"  y2="100" stroke="#2a3038" strokeWidth="0.5"/>
              <line x1="100" y1="0" x2="100" y2="100" stroke="#2a3038" strokeWidth="0.5"/>
              <line x1="150" y1="0" x2="150" y2="100" stroke="#2a3038" strokeWidth="0.5"/>

              {/* Target trajectory (pale blue) */}
              <polygon
                points="0,100 0,100 30,100 60,30 80,3 100,3 120,30 150,70 180,100 200,100 200,100"
                fill="url(#targetFill)"
              />
              <polyline
                points="0,100 30,100 60,30 80,3 100,3 120,30 150,70 180,100 200,100"
                fill="none" stroke="#4fc3f7" strokeWidth="0.8" strokeDasharray="4 3" opacity="0.45"
              />

              {/* Actual altitude area (yellow) */}
              <polygon
                points="0,100 0,100 25,100 50,65 70,18 90,3.5 105,3.5 120,40 140,75 160,92 175,100 200,100 200,100"
                fill="url(#altPerfilFill)"
              />
              <polyline
                points="0,100 25,100 50,65 70,18 90,3.5 105,3.5 120,40 140,75 160,92 175,100"
                fill="none" stroke="#ffeb3b" strokeWidth="1.8"
              />

              {/* Max altitude line */}
              <line x1="85" y1="3.5" x2="115" y2="3.5" stroke="#ef5350" strokeWidth="1" strokeDasharray="4 2" opacity="0.85"/>

              {/* Current position marker (at descent ~T+9 min) */}
              <circle cx="140" cy="75" r="3.5" fill="#ffeb3b" stroke="#fff" strokeWidth="1"/>
              {/* Tooltip */}
              <rect x="143" y="66" width="38" height="14" rx="3" fill="rgba(0,0,0,0.6)" stroke="#ffeb3b" strokeWidth="0.5"/>
              <text x="147" y="76" fontSize="7" fill="#ffeb3b" fontFamily="JetBrains Mono, monospace">525 m · T+9</text>
            </svg>
            <div className="perfil-x-axis">
              <span>T+0 min</span>
              <span>T+3 min</span>
              <span>T+6 min</span>
              <span>T+9 min</span>
              <span>T+12 min</span>
              <span>T+15 min</span>
              <span>T+18 min</span>
              <span>T+21 min</span>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
