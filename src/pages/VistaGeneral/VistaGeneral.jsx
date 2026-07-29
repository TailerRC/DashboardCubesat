import { useAmbientalMqtt } from '../../mqtt/paquete_mqtt/useAmbientalMqtt';
import { useUbicacionMqtt } from '../../mqtt/paquete_mqtt/useUbicacionMqtt';
import { useSateliteMqtt } from '../../mqtt/paquete_mqtt/useSateliteMqtt';
import { useMisionMqtt } from '../../mqtt/paquete_mqtt/useMisionMqtt';
import { useComunicacionMqtt } from '../../mqtt/paquete_mqtt/useComunicacionMqtt';
import { useOrientacion3DMqtt } from '../../mqtt/paquete_mqtt/useOrientacion3DMqtt';
import CubesatVisor3D from '../../components/3d/CubesatVisor3D';
import MapaOrbital from '../../components/map/MapaOrbital';
import './VistaGeneral.css';

export default function VistaGeneral() {
  const { sensors: ambSensors, estadoAmbiental, activeAlerts, isConnected } = useAmbientalMqtt();
  const { data: ubiData } = useUbicacionMqtt();
  const { data: satData } = useSateliteMqtt();
  const { faseUI } = useMisionMqtt();
  const { data: commData } = useComunicacionMqtt();
  const { data: orientData } = useOrientacion3DMqtt();

  // Safety values checks with robust fallbacks
  const co2Val = ambSensors.co2_ppm?.v !== undefined ? ambSensors.co2_ppm.v.toFixed(2) : '---';
  const tempVal = ambSensors.temperatura_c?.v !== undefined ? ambSensors.temperatura_c.v.toFixed(2) : '---';
  const uvVal = ambSensors.radiacion_uv?.v !== undefined ? ambSensors.radiacion_uv.v.toFixed(2) : '---';
  const altVal = ubiData.altitud_gps?.v !== undefined ? ubiData.altitud_gps.v.toFixed(2) : '---';
  const voltVal = satData.voltaje_v?.v !== undefined ? satData.voltaje_v.v.toFixed(2) : '---';

  const cards = [
    {
      icon: <i className="fa-solid fa-smog"></i>,
      value: co2Val,
      unit: 'ppm',
      label: 'CO2',
      color: '#f9a825',
    },
    {
      icon: <i className="fa-solid fa-thermometer-half"></i>,
      value: tempVal,
      unit: '°C',
      label: 'TEMPERATURA',
      color: '#ff7043',
    },
    {
      icon: <i className="fa-solid fa-sun"></i>,
      value: uvVal,
      unit: 'UV',
      label: 'RADIACIÓN UV',
      color: '#ab47bc',
    },
    {
      icon: <i className="fa-solid fa-mountain"></i>,
      value: altVal,
      unit: 'm',
      label: 'ALTITUD',
      color: '#ef5350',
    },
    {
      icon: <i className="fa-solid fa-bolt"></i>,
      value: voltVal,
      unit: 'V',
      label: 'VOLTAJE',
      color: '#66bb6a',
    },
    {
      icon: <i className="fa-solid fa-arrow-trend-down"></i>,
      value: faseUI || '---',
      unit: '',
      label: 'FASE DE MISIÓN',
      color: '#4caf50',
      isText: true,
      isLarge: true,
    },
    {
      icon: <i className="fa-solid fa-box"></i>,
      value: commData.paquetes_recibidos?.v !== undefined ? commData.paquetes_recibidos.v : '---',
      unit: 'IX',
      label: 'PAQUETES RECIBIDOS',
      color: '#5c6bc0',
    },
  ];

  // Dynamic Safety Banner
  let statusLabel = 'SIN DATOS';
  let detailText = 'CONECTANDO CON SATÉLITE...';
  let bannerClass = 'security-banner--info';
  let iconClass = 'fa-circle-info';

  if (isConnected) {
    const count = activeAlerts.length;
    if (estadoAmbiental === 'ANOMALIA') {
      statusLabel = 'ANOMALÍA';
      detailText = 'ALERTA: DESCOMPRESIÓN RÁPIDA DETECTADA (PA/S CAÍDA)';
      bannerClass = 'security-banner--danger';
      iconClass = 'fa-gauge-high fa-fade';
    } else if (count === 0) {
      statusLabel = 'SEGURO';
      detailText = 'TODOS LOS PARAMETROS EN RANGO NORMAL';
      bannerClass = 'security-banner--ok';
      iconClass = 'fa-circle-check';
    } else if (count <= 3) {
      statusLabel = 'EN RIESGO';
      detailText = `PARÁMETROS FUERA DEL UMBRAL: ${activeAlerts.join(', ')}`;
      bannerClass = 'security-banner--warning';
      iconClass = 'fa-triangle-exclamation';
    } else {
      statusLabel = 'CRÍTICO';
      detailText = `PARÁMETROS FUERA DEL UMBRAL: ${activeAlerts.join(', ')}`;
      bannerClass = 'security-banner--danger';
      iconClass = 'fa-triangle-exclamation fa-fade';
    }
  }

  return (
    <div className="vista-general">
      {/* Security Status */}
      <section className="security-status">
        <h3 className="section-title">ESTADO AMBIENTAL DE SEGURIDAD</h3>
        <div className={`security-banner ${bannerClass}`}>
          <div className="security-icon">
            <i className={`fa-solid ${iconClass}`} style={{ fontSize: '18px', color: '#fff' }}></i>
          </div>
          <div className="security-text">
            <span className="security-label">{statusLabel}</span>
            <span className="security-detail">{detailText}</span>
          </div>
        </div>
      </section>

      {/* Visores 3D en Tiempo Real */}
      <section className="visor-general-row">
        <div className="panel-card visor-card premium-card-hover" style={{ '--card-color': '#00e5ff' }}>
          <h4 className="card-label-3d">
            <i className="fa-solid fa-cube" style={{ marginRight: '6px', color: '#00e5ff' }}></i>
            Estructura Interna del Cubesat (Sensores / Paracaídas)
          </h4>
          <div className="visor-3d-wrapper">
            <CubesatVisor3D
              cabeceo={orientData.cabeceo_deg?.v ?? 0}
              balanceo={orientData.balanceo_deg?.v ?? 0}
              giro={orientData.giro_yaw_deg?.v ?? 0}
            />
          </div>
        </div>

        <div className="panel-card visor-card premium-card-hover" style={{ '--card-color': '#38bdf8' }}>
          <h4 className="card-label-3d">
            <i className="fa-solid fa-map-location-dot" style={{ marginRight: '6px', color: '#38bdf8' }}></i>
            Posicionamiento Orbital
          </h4>
          <div className="visor-3d-wrapper">
            <MapaOrbital />
          </div>
        </div>
      </section>

      {/* Data Cards */}
      <section className="data-cards">
        {cards.map((card, i) => (
          <div key={i} className={`data-card premium-card-hover ${card.isLarge ? 'data-card--span-2' : ''}`} style={{ '--card-color': card.color }}>
            <div className="card-icon" style={{ color: card.color }}>
              {card.icon}
            </div>
            <div className="card-content">
              <div className="card-value-row">
                <span
                  className={`card-value ${card.isText ? 'card-value--text' : ''}`}
                  style={{ color: card.isText ? card.color : '#e0e0e0' }}
                >
                  {card.value}
                </span>
                {card.unit && <span className="card-unit">{card.unit}</span>}
              </div>
              <span className="card-label">{card.label}</span>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
