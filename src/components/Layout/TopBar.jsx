import { useState, useEffect } from 'react';
import { useAmbientalMqtt } from '../../mqtt/paquete_mqtt/useAmbientalMqtt';
import { useUbicacionMqtt } from '../../mqtt/paquete_mqtt/useUbicacionMqtt';
import { useSateliteMqtt } from '../../mqtt/paquete_mqtt/useSateliteMqtt';
import './TopBar.css';

export default function TopBar({ viewName = 'Vista General', scrollPct = 0 }) {
  const [time, setTime] = useState(new Date());

  // Subscribe to live telemetry hooks
  const { sensors: ambSensors } = useAmbientalMqtt();
  const { data: ubiData } = useUbicacionMqtt();
  const { data: satData } = useSateliteMqtt();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (d) => {
    return d.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const formatUptime = (totalSecs) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return [
      h.toString().padStart(2, '0'),
      m.toString().padStart(2, '0'),
      s.toString().padStart(2, '0')
    ].join(':');
  };

  const utcOffset = -time.getTimezoneOffset() / 60;
  const utcLabel = `UTC${utcOffset >= 0 ? '+' : ''}${utcOffset}`;

  // Safe checks and scaling for active telemetry parameters
  const co2 = ambSensors?.co2_ppm?.v !== undefined ? ambSensors.co2_ppm.v.toFixed(1) : '---';
  const voc = ambSensors?.gas_voc_ppb?.v !== undefined ? ambSensors.gas_voc_ppb.v.toFixed(1) : '---';
  const tempAmb = ambSensors?.temperatura_c?.v !== undefined ? ambSensors.temperatura_c.v.toFixed(1) : '---';
  const hum = ambSensors?.humedad_pct?.v !== undefined ? ambSensors.humedad_pct.v.toFixed(1) : '---';
  const pres = ambSensors?.presion_pa?.v !== undefined ? ambSensors.presion_pa.v.toFixed(0) : '---';
  const uv = ambSensors?.radiacion_uv?.v !== undefined ? ambSensors.radiacion_uv.v.toFixed(1) : '---';

  const lat = ubiData?.latitud?.v !== undefined ? ubiData.latitud.v.toFixed(4) : '---';
  const lon = ubiData?.longitud?.v !== undefined ? ubiData.longitud.v.toFixed(4) : '---';
  const alt = ubiData?.altitud_gps?.v !== undefined ? ubiData.altitud_gps.v.toFixed(1) : '---';
  const vel = ubiData?.velocidad_kmh?.v !== undefined ? ubiData.velocidad_kmh.v.toFixed(1) : '---';
  const dist = ubiData?.distancia_origen?.v !== undefined ? ubiData.distancia_origen.v.toFixed(1) : '---';
  const sats = ubiData?.satelites?.v !== undefined ? ubiData.satelites.v : '---';

  const volt = satData?.voltaje_v?.v !== undefined ? satData.voltaje_v.v.toFixed(2) : '---';
  const curr = satData?.corriente_ma?.v !== undefined ? satData.corriente_ma.v.toFixed(1) : '---';
  const cons = satData?.consumo_w?.v !== undefined ? satData.consumo_w.v.toFixed(2) : '---';
  const tempMcu = satData?.temp_mcu?.v !== undefined ? satData.temp_mcu.v.toFixed(1) : '---';
  const accX = satData?.accel_x?.v !== undefined ? satData.accel_x.v.toFixed(1) : '---';
  const accY = satData?.accel_y?.v !== undefined ? satData.accel_y.v.toFixed(1) : '---';
  const accZ = satData?.accel_z?.v !== undefined ? satData.accel_z.v.toFixed(1) : '---';
  const uptime = satData?.tiempo_encendido_seg?.v !== undefined ? formatUptime(satData.tiempo_encendido_seg.v) : '---';

  // Raw telemetry data compile (removing unmapped packages and phase)
  const telemetryItems = [
    { label: 'Voltaje:', value: `${volt} V`, color: '#ef5350' },
    { label: 'Corriente:', value: `${curr} mA`, color: '#42a5f5' },
    { label: 'Consumo:', value: `${cons} W`, color: '#ba68c8' },
    { label: 'Altitud:', value: `${alt} m`, color: '#ef5350' },
    { label: 'Latitud:', value: `${lat}°`, color: '#4fc3f7' },
    { label: 'Longitud:', value: `${lon}°`, color: '#4fc3f7' },
    { label: 'CO2:', value: `${co2} ppm`, color: '#f9a825' },
    { label: 'VOC:', value: `${voc} ppb`, color: '#00bcd4' },
    { label: 'Temp Amb:', value: `${tempAmb} °C`, color: '#ff7043' },
    { label: 'Humedad:', value: `${hum} %`, color: '#03a9f4' },
    { label: 'Presión:', value: `${pres} Pa`, color: '#ab47bc' },
    { label: 'UV Index:', value: uv, color: '#ff9800' },
    { label: 'Velocidad:', value: `${vel} km/h`, color: '#4fc3f7' },
    { label: 'Distancia:', value: `${dist} m`, color: '#4fc3f7' },
    { label: 'Satélites:', value: sats, color: '#4caf50' },
    { label: 'MCU Temp:', value: `${tempMcu} °C`, color: '#ff7043' },
    { label: 'Acel X:', value: `${accX} m/s²`, color: '#ef5350' },
    { label: 'Acel Y:', value: `${accY} m/s²`, color: '#ffca28' },
    { label: 'Acel Z:', value: `${accZ} m/s²`, color: '#66bb6a' },
    { label: 'Uptime:', value: uptime, color: '#ab47bc' }
  ];

  return (
    <header className="topbar">
      <div className="topbar-telemetry">
        <div className="topbar-telemetry-scroll">
          {telemetryItems.map((item, i) => (
            <span key={`a-${i}`} className="telemetry-item">
              <span className="telemetry-label">{item.label}</span>
              <span className="telemetry-value" style={{ color: item.color }}>
                {item.value}
              </span>
            </span>
          ))}
          {telemetryItems.map((item, i) => (
            <span key={`b-${i}`} className="telemetry-item">
              <span className="telemetry-label">{item.label}</span>
              <span className="telemetry-value" style={{ color: item.color }}>
                {item.value}
              </span>
            </span>
          ))}
        </div>
      </div>

      <div className="topbar-info">
        <div className="topbar-info-left">
          <span className="station-label">Estación Terreno</span>
          <span className="view-name">{viewName}</span>
        </div>
        <div className="topbar-progress">
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${scrollPct}%` }}
            ></div>
          </div>
        </div>
        <div className="topbar-info-right">
          <span className="topbar-time">
            {formatTime(time)} {utcLabel}
          </span>
        </div>
      </div>
    </header>
  );
}
