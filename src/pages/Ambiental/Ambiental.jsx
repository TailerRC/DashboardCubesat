import { useState, useRef, useEffect } from 'react';
import { useAmbientalMqtt } from '../../mqtt/paquete_mqtt/useAmbientalMqtt';
import SensorChart from '../../components/Charts/SensorChart';
import './Ambiental.css';

/* ── Tutorial Modal ────────────────────────────────────────────────────── */
function TutorialModal({ onClose }) {
  return (
    <div className="tutorial-overlay" onClick={onClose}>
      <div className="tutorial-modal tutorial-modal--compact" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="tutorial-modal__header">
          <span className="tutorial-modal__title">
            <i className="fa-solid fa-chart-line" style={{ marginRight: '7px', color: '#4fc3f7' }}></i>
            Referencia Ambiental
          </span>
          <button className="tutorial-modal__close" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="tutorial-modal__body">

          {/* ── Banner de estado ── */}
          <section className="tref-section">
            <div className="tref-label">
              <i className="fa-solid fa-shield-halved"></i> ESTADO BANNER
            </div>
            <div className="tref-rows">
              <div className="tref-row">
                <span className="tref-badge tref-badge--ok">
                  <i className="fa-solid fa-circle-check"></i> SEGURO
                </span>
                <span className="tref-desc">0 – 1 vars fuera de umbral</span>
              </div>
              <div className="tref-row">
                <span className="tref-badge tref-badge--warning">
                  <i className="fa-solid fa-triangle-exclamation"></i> EN RIESGO
                </span>
                <span className="tref-desc">2 – 3 vars fuera de umbral</span>
              </div>
              <div className="tref-row">
                <span className="tref-badge tref-badge--danger">
                  <i className="fa-solid fa-circle-xmark"></i> CRÍTICO
                </span>
                <span className="tref-desc">4 – 5 vars fuera de umbral</span>
              </div>
            </div>
          </section>

          {/* ── Umbrales ── */}
          <section className="tref-section">
            <div className="tref-label">
              <i className="fa-solid fa-sliders"></i> UMBRALES DE ALERTA
            </div>
            <table className="tref-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Variable</th>
                  <th>Normal</th>
                  <th>Alerta</th>
                  <th>Ud.</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><i className="fa-solid fa-smog" style={{ color: '#f9a825' }}></i></td>
                  <td>CO₂</td><td>400–1000</td><td>&gt; 1000</td><td>ppm</td>
                </tr>
                <tr>
                  <td><i className="fa-solid fa-temperature-half" style={{ color: '#ff7043' }}></i></td>
                  <td>Temperatura</td><td>−10–40</td><td>&gt; 40</td><td>°C</td>
                </tr>
                <tr>
                  <td><i className="fa-solid fa-sun" style={{ color: '#ff9800' }}></i></td>
                  <td>UV</td><td>0–7.5</td><td>&gt; 7.5</td><td>idx</td>
                </tr>
                <tr>
                  <td><i className="fa-solid fa-droplet" style={{ color: '#03a9f4' }}></i></td>
                  <td>Humedad</td><td>0–85</td><td>&gt; 85</td><td>%RH</td>
                </tr>
                <tr>
                  <td><i className="fa-solid fa-gauge-high" style={{ color: '#ab47bc' }}></i></td>
                  <td>Presión*</td><td>±45 Pa</td><td>|P|&gt;45</td><td>Pa</td>
                </tr>
              </tbody>
            </table>
            <div className="tref-note">
              <i className="fa-solid fa-asterisk" style={{ color: '#ab47bc', fontSize: '8px' }}></i>
              &nbsp;Relativa a lanzamiento (0 Pa). Anomalía de tasa ≠ estado ambiental.
            </div>
          </section>

          {/* ── Indicadores de tarjeta ── */}
          <section className="tref-section">
            <div className="tref-label">
              <i className="fa-solid fa-circle-info"></i> INDICADORES
            </div>
            <div className="tref-indicators">
              <div className="tref-ind">
                <i className="fa-solid fa-circle" style={{ color: '#00e676' }}></i>
                <span>Dato fresco · en rango</span>
              </div>
              <div className="tref-ind">
                <i className="fa-solid fa-circle" style={{ color: '#ffb74d' }}></i>
                <span>Dato &gt; 1.5 s de antigüedad</span>
              </div>
              <div className="tref-ind">
                <i className="fa-solid fa-circle" style={{ color: '#ef5350' }}></i>
                <span>Valor fuera de umbral</span>
              </div>
              <div className="tref-ind">
                <i className="fa-regular fa-circle" style={{ color: '#4b5563' }}></i>
                <span>Sin datos recibidos</span>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

/* ── Gauge config per sensor ──────────────────────────────────────────── */
const GAUGE_INFO = {
  co2_ppm: {
    color: '#f9a825',
    barClass: 'co2-bar',
    indicatorPct: (v) => {
      const clamped = Math.max(400, Math.min(5000, v));
      if (clamped <= 1000) {
        return 50 * (clamped - 400) / 600;
      } else {
        return 50 + 50 * (clamped - 1000) / 4000;
      }
    },
    gaugeLabels: [
      ['Mínimo', '400ppm'],
      ['Normal', '700ppm'],
      ['Límite', '1000ppm'],
      ['Peligro', '3000ppm'],
      ['Crítico', '5000ppm'],
    ],
    threshold: 1000,
    yMin: 400,
    yMax: 5000,
    decimals: 2
  },
  temperatura_c: {
    color: '#ff7043',
    barClass: 'temp-bar',
    indicatorPct: (v) => Math.max(0, Math.min(100, ((v + 10) / 70) * 100)),
    gaugeLabels: [
      ['Frío', '-10°C'],
      ['Fresco', '10°C'],
      ['Normal', '25°C'],
      ['Cálido', '40°C'],
      ['Peligro', '60°C'],
    ],
    threshold: 40,
    yMin: -10,
    yMax: 60,
    decimals: 1
  },
  humedad_pct: {
    color: '#03a9f4',
    barClass: 'hum-bar',
    indicatorPct: (v) => Math.max(0, Math.min(100, v)),
    gaugeLabels: [
      ['Seco', '0%'],
      ['Aceptable', '30%'],
      ['Confort', '50%'],
      ['Húmedo', '75%'],
      ['Límite', '100%'],
    ],
    threshold: 85,
    yMin: 0,
    yMax: 100,
    decimals: 1
  },
  presion_pa: {
    color: '#ab47bc',
    barClass: 'pres-bar',
    indicatorPct: (v) => Math.max(0, Math.min(100, ((v + 200) / 400) * 100)),
    gaugeLabels: [
      ['Baja Pres.', '-200 Pa'],
      ['', '-100 Pa'],
      ['Lanzam.', '0 Pa'],
      ['', '+100 Pa'],
      ['Alta Pres.', '+200 Pa'],
    ],
    threshold: 45,
    yMin: -200,
    yMax: 200,
    decimals: 2
  },
  radiacion_uv: {
    color: '#ff9800',
    barClass: 'uv-bar',
    indicatorPct: (v) => Math.max(0, Math.min(100, (v / 15) * 100)),
    gaugeLabels: [
      ['Bajo', '0'],
      ['Moderado', '2.5'],
      ['Alto', '5.5'],
      ['Muy Alto', '10'],
      ['Extremo', '15'],
    ],
    threshold: 7.5,
    yMin: 0,
    yMax: 15,
    decimals: 1
  },
};

const SENSOR_META = {
  co2_ppm: {
    title: 'CONCENTRACIÓN DE CO₂',
    icon: 'fa-solid fa-smog',
    unit: 'ppm',
    color: '#f9a825'
  },
  temperatura_c: {
    title: 'TEMPERATURA',
    icon: 'fa-solid fa-temperature-half',
    unit: '°C',
    color: '#ff7043'
  },
  radiacion_uv: {
    title: 'RADIACIÓN ULTRAVIOLETA',
    icon: 'fa-solid fa-sun',
    unit: 'UV index',
    color: '#ff9800'
  },
  humedad_pct: {
    title: 'HUMEDAD RELATIVA',
    icon: 'fa-solid fa-droplet',
    unit: '%RH',
    color: '#03a9f4'
  },
  presion_pa: {
    title: 'PRESIÓN ATMOSFÉRICA',
    icon: 'fa-solid fa-gauge-high',
    unit: 'Pa',
    color: '#ab47bc'
  }
};

export default function Ambiental() {
  const { sensors, estadoAmbiental, lastPacketId, activeAlerts } = useAmbientalMqtt();

  // Tutorial modal state
  const [showTutorial, setShowTutorial] = useState(false);

  // Separate pressure anomaly alerts (informational) from ambiental-security alerts
  const securityAlerts = activeAlerts.filter(a => !a.includes('PRESIÓN (TASA)'));
  const hasPressureAnomaly = activeAlerts.some(a => a.includes('PRESIÓN (TASA)'));

  // Status banner configuration — based ONLY on the 5 ambient sensors
  let statusLabel = 'SIN TELEMETRÍA';
  let detailText  = 'ESPERANDO CONEXIÓN DEL BROKER MQTT...';
  let bannerClass = 'security-banner--info';
  let iconClass   = 'fa-wifi fa-fade';

  if (estadoAmbiental !== 'SIN_DATOS') {
    const count = securityAlerts.length;
    if (count === 0) {
      statusLabel = 'SEGURO';
      detailText  = 'TODOS LOS PARÁMETROS EN RANGO NORMAL';
      bannerClass = 'security-banner--ok';
      iconClass   = 'fa-circle-check';
    } else if (count <= 3) {
      statusLabel = 'EN RIESGO';
      detailText  = `PARÁMETROS FUERA DEL UMBRAL: ${securityAlerts.join(', ')}`;
      bannerClass = 'security-banner--warning';
      iconClass   = 'fa-triangle-exclamation';
    } else {
      statusLabel = 'CRÍTICO';
      detailText  = `PARÁMETROS FUERA DEL UMBRAL: ${securityAlerts.join(', ')}`;
      bannerClass = 'security-banner--danger';
      iconClass   = 'fa-triangle-exclamation fa-fade';
    }
  }

  return (
    <div className="ambiental-view">

      {/* ── Static separator bar ── */}
      <div className="ambiental-scroll-bar"></div>

      {/* ── Tutorial modal ── */}
      {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}

      {/* ── Security Status Banner ── */}
      <section className="security-status">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 className="section-title">ESTADO AMBIENTAL DE SEGURIDAD</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {lastPacketId && (
              <span className="packet-id-badge">
                Topic: <span style={{ color: '#aaa' }}>ambiental</span> | Pkt: <span style={{ color: '#4fc3f7' }}>{lastPacketId}</span>
              </span>
            )}
            <button
              className="tutorial-btn"
              onClick={() => setShowTutorial(true)}
              title="¿Cómo leer estos datos?"
            >
              <i className="fa-solid fa-circle-question"></i>
            </button>
          </div>
        </div>
        <div className={`security-banner ${bannerClass}`}>
          <div className="security-icon">
            <i className={`fa-solid ${iconClass}`} style={{ fontSize: '16px', color: '#fff' }}></i>
          </div>
          <div className="security-text">
            <span className="security-label">{statusLabel}</span>
            <span className="security-detail">{detailText}</span>
          </div>
        </div>
        {/* Pressure anomaly informational note — separate from security state */}
        {hasPressureAnomaly && (
          <div className="pressure-anomaly-notice">
            <i className="fa-solid fa-gauge-high" style={{ marginRight: '6px', color: '#ab47bc' }}></i>
            AVISO TÉCNICO: Tasa de cambio de presión elevada detectada
          </div>
        )}
      </section>

      {/* ── 2×3 Sensor Grid ── */}
      <section className="ambiental-grid">
        {Object.entries(SENSOR_META).map(([key, meta]) => {
          const sensor = sensors[key];
          const hasValue = sensor && sensor.v !== null;
          const gInfo = GAUGE_INFO[key];
          const indPct = hasValue ? gInfo.indicatorPct(sensor.v) : 0;

          let dotClass = 'card-live-dot--inactive';
          let ageClass = 'age-stale';

          if (hasValue) {
            // Determine age color class
            if (sensor.hace_seg <= 1.0) {
              ageClass = 'age-fresh';
            } else if (sensor.hace_seg <= 1.5) {
              ageClass = 'age-warning';
            } else {
              ageClass = 'age-stale';
            }

            // Determine status dot class
            const val = sensor.v;
            const threshold = sensor.umbral_alerta ?? gInfo.threshold;
            const isAlarm = key === 'presion_pa'
              ? (Math.abs(val) > threshold || estadoAmbiental === 'ANOMALIA')
              : (val > threshold);

            if (isAlarm) {
              dotClass = 'card-live-dot--danger';
            } else if (sensor.stale || sensor.hace_seg > 1.5) {
              dotClass = 'card-live-dot--warning';
            } else {
              dotClass = 'card-live-dot--ok';
            }
          }

          return (
            <div
              key={key}
              className={`ambiental-card ${sensor?.stale && hasValue ? 'card-stale' : ''}`}
              style={{ '--card-color': meta.color }}
            >
              {/* Header */}
              <div className="card-header-row">
                <span className="card-icon" style={{ color: meta.color }}>
                  <i className={meta.icon}></i>
                </span>
                <h4 className="card-header">{meta.title}</h4>
                {hasValue && (
                  <span className={`card-live-dot ${dotClass}`}></span>
                )}
              </div>

              {/* Main value */}
              <div className="card-main-value">
                {hasValue ? (
                  <>
                    <span className="value" style={{ color: sensor.stale ? '#7f8c8d' : meta.color }}>
                      {sensor.v.toFixed(2)}
                    </span>
                    <span className="unit">{meta.unit}</span>
                  </>
                ) : (
                  <span className="value-placeholder">---</span>
                )}
              </div>

              {/* Gauge */}
              <div className="gauge-container">
                <div className="gauge-labels">
                  {gInfo.gaugeLabels.map(([lbl, val], i) => (
                    <span key={i}>{lbl}<br/>{val}</span>
                  ))}
                </div>
                <div className={`gauge-bar ${gInfo.barClass}`}>
                  <div className="indicator" style={{ left: `${indPct}%` }}></div>
                </div>
              </div>

              {/* Chart */}
              <div className="chart-area-wrap">
                {hasValue && sensor.history && (
                  <SensorChart
                    data={sensor.history.map(pt => ({
                      value: pt.value,
                      tsAgo: Math.max(0, (Date.now() - pt.timestamp) / 1000)
                    }))}
                    color={meta.color}
                    yMin={gInfo.yMin}
                    yMax={gInfo.yMax}
                    unit={meta.unit}
                    decimals={gInfo.decimals}
                    thresholdY={key === 'presion_pa' ? -Math.abs(sensor.umbral_alerta ?? gInfo.threshold) : (sensor.umbral_alerta ?? gInfo.threshold)}
                  />
                )}
              </div>

              {/* Footer: Elapsed time + stale marker */}
              <div className="card-footer-row">
                {hasValue ? (
                  <>
                    <span className={`elapsed-time ${ageClass}`}>
                      <i className="fa-regular fa-clock" style={{ marginRight: '4px', opacity: 0.6 }}></i>
                      hace {sensor.hace_seg.toFixed(1)}s
                    </span>
                    {sensor.stale && (
                      <span className="stale-badge">
                        <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '3px' }}></i>
                        DATO OBSOLETO
                      </span>
                    )}
                  </>
                ) : (
                  <span className="elapsed-time">Esperando datos...</span>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
