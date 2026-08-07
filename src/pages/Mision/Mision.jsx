import React from 'react';
import { useMisionContext } from '../../context/MisionContext';
import { useAmbientalMqtt } from '../../mqtt/paquete_mqtt/useAmbientalMqtt';
import SensorChart from '../../components/Charts/SensorChart';
import './Mision.css';

export default function Mision() {
  const { data: misionData, faseUI, lastPacketId, isConnected } = useMisionContext();
  const { sensors } = useAmbientalMqtt();

  const fasesUIList = [
    { step: 1, label: 'INICIALIZACIÓN', key: 'INICIALIZACIÓN', icon: 'fa-solid fa-sliders' },
    { step: 2, label: 'ASCENSO / LANZAMIENTO', key: 'ASCENSO / LANZAMIENTO', icon: 'fa-solid fa-rocket' },
    { step: 3, label: 'DESCENSO', key: 'DESCENSO', icon: 'fa-solid fa-parachute-box' },
    { step: 4, label: 'PROXIMIDAD AL SUELO', key: 'PROXIMIDAD AL SUELO', icon: 'fa-solid fa-location-crosshairs' },
    { step: 5, label: 'ATERRIZADO', key: 'ATERRIZADO', icon: 'fa-solid fa-flag-checkered' },
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

  // Use Altura de Vuelo (Barometric / BME280) — starts at 0m from launch point
  const altitudHist = sensors?.altura_barometrica_m?.history || [];
  const currentAltitud = isConnected ? (sensors?.altura_barometrica_m?.v ?? 0) : 0;

  const altVals = altitudHist.map(pt => pt.value);
  const maxAltInHist = altVals.length > 0 ? Math.max(...altVals) : 0;
  const altEffectiveMax = 100;

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
          {lastPacketId && <span className="pkt-badge">PKT ID: #{lastPacketId}</span>}
        </div>
      </section>

      {/* ── Fases de Misión Stepper (Full Width Cards) ── */}
      <section className="panel-card mision-fases premium-card-hover" style={{ '--card-color': '#4caf50' }}>
        <div className="fase-header">
          <span className="fase-subtitle">Secuencia de Misión</span>
          <h2 className="fase-title">FASES DEL VUELO</h2>
        </div>

        <div className="fases-list">
          {fasesUIList.map((fase) => {
            const status = getFaseStatus(fase.key);
            return (
              <div key={fase.step} className={`fase-item fase-${status}`}>
                <div className="fase-item-top">
                  <span className="fase-status-badge">
                    {status === 'completed' && <><i className="fa-solid fa-check"></i> COMPLETADO</>}
                    {status === 'active' && <><i className="fa-solid fa-circle-dot fa-beat"></i> EN CURSO</>}
                    {status === 'pending' && <>PENDIENTE</>}
                  </span>
                </div>

                <div className="fase-item-center">
                  <div className="fase-icon-wrapper">
                    <i className={fase.icon}></i>
                  </div>
                  <span className="fase-label">{fase.label}</span>
                </div>

                <div className="fase-item-bottom">
                  <span className="fase-step-num">FASE 0{fase.step}</span>
                </div>
              </div>
            );
          })}
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
            Altitud Telemetría / Vuelo (m)
          </span>
          <span className="legend-item">
            <span className="legend-dot" style={{ background: '#4fc3f7', opacity: 0.6 }}></span>
            Apogeo Máximo Objetivo (100m)
          </span>
        </div>

        <div style={{ height: '240px', marginTop: '6px' }}>
          <SensorChart
            data={altitudHist.map(pt => ({
              value: pt.value,
              tsAgo: Math.max(0, (Date.now() - pt.timestamp) / 1000)
            }))}
            color="#ffeb3b"
            yMin={0}
            yMax={altEffectiveMax}
            unit="m"
            decimals={1}
          />
        </div>
      </section>

      {/* ── Stat KPI Card (Altitud Actual) ── */}
      <section className="mision-stats-grid">
        <div className="mision-stat-card premium-card-hover" style={{ '--card-color': '#ffeb3b' }}>
          <span className="mision-stat-label">Altitud Actual</span>
          <span className="mision-stat-value text-yellow">{currentAltitud.toFixed(1)} <span style={{fontSize:'16px'}}>m</span></span>
          <span className="mision-stat-sub">Altitud de Vuelo (BME280)</span>
        </div>
      </section>

    </div>
  );
}



