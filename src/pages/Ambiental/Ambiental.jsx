import { useAmbientalMqtt } from '../../hooks/useAmbientalMqtt';
import SensorChart from '../../components/Charts/SensorChart';
import './Ambiental.css';

/* ── Gauge config per sensor ──────────────────────────────────────────── */
const GAUGE_INFO = {
  co2_ppm: {
    color: '#f9a825',
    barClass: 'co2-bar',
    indicatorPct: (v) => Math.max(0, Math.min(100, ((v - 360) / (480 - 360)) * 100)),
    gaugeLabels: [
      ['Normal', '380ppm'],
      ['Elevado', '410ppm'],
      ['Alto', '440ppm'],
      ['Peligroso', '460ppm'],
      ['Crítico', '480ppm'],
    ],
    threshold: 440,
    yMin: 360,
    yMax: 480,
    decimals: 2
  },
  gas_voc_ppb: {
    color: '#00bcd4',
    barClass: 'voc-bar',
    indicatorPct: (v) => Math.max(0, Math.min(100, (v / 80) * 100)),
    gaugeLabels: [
      ['Limpio', '0ppb'],
      ['Aceptable', '30ppb'],
      ['Moderado', '45ppb'],
      ['Alto', '60ppb'],
      ['Peligroso', '80ppb'],
    ],
    threshold: 45,
    yMin: 0,
    yMax: 80,
    decimals: 1
  },
  temperatura_c: {
    color: '#ff7043',
    barClass: 'temp-bar',
    indicatorPct: (v) => Math.max(0, Math.min(100, ((v - 10) / (40 - 10)) * 100)),
    gaugeLabels: [
      ['Frío', '10°C'],
      ['Fresco', '20°C'],
      ['Normal', '25°C'],
      ['Cálido', '30°C'],
      ['Caliente', '40°C'],
    ],
    threshold: 29.5,
    yMin: 10,
    yMax: 40,
    decimals: 1
  },
  humedad_pct: {
    color: '#03a9f4',
    barClass: 'hum-bar',
    indicatorPct: (v) => Math.max(0, Math.min(100, ((v - 20) / (90 - 20)) * 100)),
    gaugeLabels: [
      ['Muy Seco', '20%'],
      ['Seco', '35%'],
      ['Confort.', '50%'],
      ['Húmedo', '68%'],
      ['Muy Húm.', '90%'],
    ],
    threshold: 68.0,
    yMin: 20,
    yMax: 90,
    decimals: 1
  },
  presion_pa: {
    color: '#ab47bc',
    barClass: 'pres-bar',
    indicatorPct: (v) => Math.max(0, Math.min(100, ((v - 95000) / (102000 - 95000)) * 100)),
    gaugeLabels: [
      ['500m', '950hPa'],
      ['375m', '970hPa'],
      ['250m', '990hPa'],
      ['125m', '1006hPa'],
      ['Sup.', '1020hPa'],
    ],
    threshold: 100600.0, // corresponding to 1006.0 hPa
    yMin: 95000,
    yMax: 102000,
    decimals: 2
  },
  radiacion_uv: {
    color: '#ff9800',
    barClass: 'uv-bar',
    indicatorPct: (v) => Math.max(0, Math.min(100, (v / 10) * 100)),
    gaugeLabels: [
      ['Mínimo', '0'],
      ['Bajo', '2.5'],
      ['Mod.', '5.5'],
      ['Alto', '7.5'],
      ['Muy Alto', '10'],
    ],
    threshold: 5.5,
    yMin: 0,
    yMax: 10,
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
  gas_voc_ppb: {
    title: 'GASES NOCIVOS (VOC)',
    icon: 'fa-solid fa-biohazard',
    unit: 'ppb',
    color: '#00bcd4'
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

  // Status banner configuration
  let statusLabel = 'SIN TELEMETRÍA';
  let detailText = 'ESPERANDO CONEXIÓN DEL BROKER MQTT...';
  let bannerClass = 'security-banner--info';
  let iconClass = 'fa-wifi fa-fade';

  if (estadoAmbiental === 'SEGURO') {
    statusLabel = 'SEGURO';
    detailText = 'TODOS LOS PARÁMETROS EN RANGO NORMAL';
    bannerClass = 'security-banner--ok';
    iconClass = 'fa-circle-check';
  } else if (estadoAmbiental === 'PELIGRO') {
    statusLabel = 'EN RIESGO';
    detailText = `PARAMETROS FUERA DEL UMBRAL: ${activeAlerts.join(', ')}`;
    bannerClass = 'security-banner--warning';
    iconClass = 'fa-triangle-exclamation';
  } else if (estadoAmbiental === 'CRITICO' || estadoAmbiental === 'ANOMALIA') {
    statusLabel = 'CRÍTICO';
    detailText = `PARAMETROS FUERA DEL UMBRAL: ${activeAlerts.join(', ')}`;
    bannerClass = 'security-banner--danger';
    iconClass = 'fa-triangle-exclamation fa-fade';
  }

  return (
    <div className="ambiental-view">

      {/* ── Security Status Banner ── */}
      <section className="security-status">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 className="section-title">ESTADO AMBIENTAL DE SEGURIDAD</h3>
          {lastPacketId && (
            <span className="packet-id-badge">
              Topic: <span style={{ color: '#aaa' }}>ambiental</span> | Pkt: <span style={{ color: '#4fc3f7' }}>{lastPacketId}</span>
            </span>
          )}
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
      </section>

      {/* ── 2×3 Sensor Grid ── */}
      <section className="ambiental-grid">
        {Object.entries(SENSOR_META).map(([key, meta]) => {
          const sensor = sensors[key];
          const hasValue = sensor && sensor.v !== null;
          const gInfo = GAUGE_INFO[key];
          const indPct = hasValue ? gInfo.indicatorPct(sensor.v) : 0;

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
                  <span className={`card-live-dot ${sensor.stale ? 'card-live-dot--stale' : ''}`}></span>
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
                    data={sensor.history}
                    color={meta.color}
                    yMin={gInfo.yMin}
                    yMax={gInfo.yMax}
                    unit={meta.unit}
                    decimals={gInfo.decimals}
                    thresholdY={gInfo.threshold}
                  />
                )}
              </div>

              {/* Footer: Elapsed time + stale marker */}
              <div className="card-footer-row">
                {hasValue ? (
                  <>
                    <span className="elapsed-time">
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
