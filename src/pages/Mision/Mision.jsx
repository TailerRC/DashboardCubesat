import React from 'react';
import { useMisionMqtt } from '../../mqtt/paquete_mqtt/useMisionMqtt';
import SensorChart from '../../components/Charts/SensorChart';
import './Mision.css';

export default function Mision() {
  const { data: misionData, faseUI, lastPacketId, isConnected } = useMisionMqtt();

  const fasesUIList = [
    { label: 'INICIALIZACIÓN', key: 'INICIALIZACIÓN' },
    { label: 'ASCENSO / LANZAMIENTO', key: 'ASCENSO / LANZAMIENTO' },
    { label: 'DESCENSO', key: 'DESCENSO' },
    { label: 'PROXIMIDAD AL SUELO', key: 'PROXIMIDAD AL SUELO' },
    { label: 'ATERRIZADO', key: 'ATERRIZADO' },
  ];

  // Helper to calculate status of each UI phase card based on current phaseUI
  const getFaseStatus = (faseKey) => {
    const order = ['INICIALIZACIÓN', 'ASCENSO / LANZAMIENTO', 'DESCENSO', 'PROXIMIDAD AL SUELO', 'ATERRIZADO'];
    const currentIdx = order.indexOf(faseUI);
    const itemIdx = order.indexOf(faseKey);

    if (itemIdx < currentIdx) return 'completed';
    if (itemIdx === currentIdx) return 'active';
    return 'pending';
  };

  const formatUptime = (totalSecs) => {
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `T+${m}m ${s}s`;
  };

  // Crosshair translation offset calculation for Orientation Panel
  const cabeceoVal = misionData.cabeceo_deg.v;
  const balanceoVal = misionData.balanceo_deg.v;
  const giroVal = misionData.giro_yaw_deg.v;
  const driftVal = misionData.giro_yaw_deg.drift_acumulado || 0.0;

  const crosshairStyle = {
    transform: `translate(${Math.max(-40, Math.min(40, balanceoVal * 2))}px, ${Math.max(-40, Math.min(40, -cabeceoVal * 2))}px)`
  };

  const altitudHist = misionData.altitud_m.history || [];

  return (
    <div className={`mision-view ${!isConnected ? 'view-stale' : ''}`}>

      {/* ── Top Status Banner ── */}
      <section className="mision-banner">
        <div className="mision-banner-left">
          <div className="mision-banner-icon">
            <i className="fa-solid fa-rocket"></i>
          </div>
          <div>
            <div className="mision-banner-title">FASE ACTUAL DE LA MISIÓN</div>
            <div className="mision-banner-phase">{faseUI}</div>
          </div>
        </div>
        <div className="mision-banner-right">
          {lastPacketId && (
            <span className="pkt-badge">
              Topic: <span style={{ color: '#aaa' }}>mision</span> | Pkt: <span style={{ color: '#4fc3f7' }}>#{lastPacketId}</span>
            </span>
          )}
          <span className="mision-stat-sub" style={{ color: '#a5d6a7' }}>
            <i className="fa-solid fa-circle-check" style={{ marginRight: '4px' }}></i>
            CDR Fase Oficial: <strong>{misionData.fase_cdr}</strong>
          </span>
        </div>
      </section>

      {/* ── Top 2-Column Grid: Fases + Orientación ── */}
      <section className="mision-top-grid">

        {/* Panel Izquierdo: Fases de Misión */}
        <div className="panel-card mision-fases premium-card-hover" style={{ '--card-color': '#4caf50' }}>
          <div className="fase-header">
            <span className="fase-subtitle">ESTADO DE FASES (5 ESTADOS UI)</span>
            <h2 className="fase-title">{faseUI}</h2>
          </div>

          <div className="fases-list">
            {fasesUIList.map((fase, i) => {
              const status = getFaseStatus(fase.key);
              return (
                <div key={i} className={`fase-item fase-${status}`}>
                  <div className="fase-icon">
                    {status !== 'pending' && <div className="fase-icon-inner"></div>}
                  </div>
                  <span className="fase-label">{fase.label}</span>
                  {status === 'completed' && (
                    <i className="fa-solid fa-check" style={{ marginLeft: 'auto', fontSize: '12px', opacity: 0.8 }}></i>
                  )}
                  {status === 'active' && (
                    <i className="fa-solid fa-circle-dot fa-beat" style={{ marginLeft: 'auto', fontSize: '12px', color: '#4fc3f7' }}></i>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel Derecho: Orientación en tiempo real (CDR Corrección 6) */}
        <div className="panel-card mision-aceleracion premium-card-hover" style={{ '--card-color': '#4fc3f7' }}>
          <h3 className="panel-header" style={{ textAlign: 'center' }}>ORIENTACIÓN EN TIEMPO REAL</h3>

          <div className="aceleracion-visualizer">
            <span className="ax-label ax-top">+20° Pitch</span>
            <span className="ax-label ax-bottom">−20° Pitch</span>
            <span className="ax-label ax-left">−20° Roll</span>
            <span className="ax-label ax-right">+20° Roll</span>

            <div className="crosshair-container">
              <div className="crosshair-h"></div>
              <div className="crosshair-v"></div>
              <div className="crosshair-circle"></div>
              <div className="crosshair-icon" style={crosshairStyle}>
                <i className="fa-solid fa-crosshairs" style={{ color: '#4fc3f7', fontSize: '22px' }}></i>
              </div>
            </div>
          </div>

          <div className="aceleracion-stats">
            <div className="stat-line">
              <span>Cabeceo (Pitch):</span>
              <strong>{cabeceoVal >= 0 ? `+${cabeceoVal}` : cabeceoVal}°</strong>
            </div>
            <div className="stat-line">
              <span>Balanceo (Roll):</span>
              <strong>{balanceoVal >= 0 ? `+${balanceoVal}` : balanceoVal}°</strong>
            </div>
            <div className="stat-line">
              <span>Giro (Yaw):</span>
              <div>
                <strong>{giroVal}°</strong>
                {/* CDR Corrección 4: Indicator for drift estimation without magnetometer */}
                <span className="drift-badge" title="Calculado por integración de gyro_z. Deriva acumulada estimada.">
                  ⚠ Estimado ({driftVal.toFixed(1)}° drift)
                </span>
              </div>
            </div>
          </div>
        </div>

      </section>

      {/* ── Perfil de Altitud vs Tiempo (Full Width) ── */}
      <section className="panel-card mision-perfil premium-card-hover" style={{ '--card-color': '#ffeb3b' }}>
        <h3 className="panel-header">
          <i className="fa-solid fa-chart-area" style={{ marginRight: '8px', color: '#ffeb3b' }}></i>
          PERFIL DE ALTITUD VS TIEMPO DE MISIÓN
        </h3>

        <div className="perfil-legend">
          <span className="legend-item">
            <span className="legend-dot" style={{ background: '#ffeb3b' }}></span>
            Altitud Telemetría (m)
          </span>
          <span className="legend-item">
            <span className="legend-dot" style={{ background: '#4fc3f7', opacity: 0.6 }}></span>
            Apogeo Máximo Objetivo (525m)
          </span>
        </div>

        <div style={{ height: '180px', marginTop: '6px' }}>
          <SensorChart
            data={altitudHist.map(pt => ({
              value: pt.value,
              tsAgo: Math.max(0, (Date.now() - pt.timestamp) / 1000)
            }))}
            color="#ffeb3b"
            yMin={0}
            yMax={600}
            unit="m"
            decimals={1}
          />
        </div>
      </section>

      {/* ── Stat KPI Cards Row ── */}
      <section className="mision-stats-grid">
        <div className="mision-stat-card premium-card-hover" style={{ '--card-color': '#ffeb3b' }}>
          <span className="mision-stat-label">Altitud Actual</span>
          <span className="mision-stat-value text-yellow">{misionData.altitud_m.v.toFixed(1)} <span style={{fontSize:'14px'}}>m</span></span>
          <span className="mision-stat-sub">Sensor Barométrico / GPS</span>
        </div>

        <div className="mision-stat-card premium-card-hover" style={{ '--card-color': '#4fc3f7' }}>
          <span className="mision-stat-label">Velocidad Vertical</span>
          <span className="mision-stat-value text-blue">{misionData.velocidad_vertical_ms.v > 0 ? `+${misionData.velocidad_vertical_ms.v}` : misionData.velocidad_vertical_ms.v} <span style={{fontSize:'14px'}}>m/s</span></span>
          <span className="mision-stat-sub">{misionData.velocidad_vertical_ms.v < 0 ? 'Descendiendo' : misionData.velocidad_vertical_ms.v > 0 ? 'Ascendiendo' : 'Estable'}</span>
        </div>

        <div className="mision-stat-card premium-card-hover" style={{ '--card-color': '#ab47bc' }}>
          <span className="mision-stat-label">Tiempo de Vuelo</span>
          <span className="mision-stat-value" style={{color:'#ab47bc'}}>{formatUptime(misionData.t_vuelo_seg.v)}</span>
          <span className="mision-stat-sub">Crono Misión T-0</span>
        </div>

        <div className="mision-stat-card premium-card-hover" style={{ '--card-color': '#66bb6a' }}>
          <span className="mision-stat-label">CDR Fase Interna</span>
          <span className="mision-stat-value text-green" style={{fontSize:'16px'}}>{misionData.fase_cdr}</span>
          <span className="mision-stat-sub">Fase {misionData.fase_cdr_index + 1} de 7 (CDR Tabla 3)</span>
        </div>
      </section>

      {/* ── System Hardware Status ── */}
      <section className="panel-card mision-hardware-grid premium-card-hover" style={{ '--card-color': '#9ca3af' }}>
        <div>
          <h3 className="panel-header">ESTADO DE HARDWARE DE MISIÓN</h3>
          <div className="hw-status-list">
            <div className="hw-status-item">
              <span className="hw-label"><i className="fa-solid fa-sd-card fa-fw" style={{marginRight:'8px', color:'#ffb74d'}}></i>Tarjeta SD Log</span>
              {/* CDR Corrección 7: SD Card Status set to N/A */}
              <span className="hw-val text-yellow">{misionData.sd_card_status} (no confirmada en CDR)</span>
            </div>
            <div className="hw-status-item">
              <span className="hw-label"><i className="fa-solid fa-microchip fa-fw" style={{marginRight:'8px', color:'#4fc3f7'}}></i>Procesador OBC (ESP32)</span>
              <span className="hw-val text-green">ONLINE · 240MHz</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="panel-header">ESTADO DE PARACAÍDAS Y SENSORES</h3>
          <div className="hw-status-list">
            <div className="hw-status-item">
              <span className="hw-label"><i className="fa-solid fa-parachute-box fa-fw" style={{marginRight:'8px', color:'#66bb6a'}}></i>Sistema Desacople Paracaídas</span>
              <span className="hw-val text-green">{misionData.altitud_m.v <= 200 ? 'ARMADO / DESPLEGADO' : 'STANDBY'}</span>
            </div>
            <div className="hw-status-item">
              <span className="hw-label"><i className="fa-solid fa-compass fa-fw" style={{marginRight:'8px', color:'#ef5350'}}></i>Magnetómetro</span>
              {/* CDR Corrección 1 */}
              <span className="hw-val text-gray">NO DISPONIBLE (Descartado CDR 4.1)</span>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
