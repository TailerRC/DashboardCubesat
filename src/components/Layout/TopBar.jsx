import { useState, useEffect } from 'react';
import { useAmbientalMqtt } from '../../mqtt/paquete_mqtt/useAmbientalMqtt';
import { useUbicacionMqtt } from '../../mqtt/paquete_mqtt/useUbicacionMqtt';
import { useSateliteMqtt } from '../../mqtt/paquete_mqtt/useSateliteMqtt';
import { useOrientacion3DMqtt } from '../../mqtt/paquete_mqtt/useOrientacion3DMqtt';
import './TopBar.css';

export default function TopBar({ viewName = 'Vista General', scrollPct = 0 }) {
  const [time, setTime] = useState(new Date());

  // Subscribe to live telemetry hooks
  const { sensors: ambSensors } = useAmbientalMqtt();
  const { data: ubiData } = useUbicacionMqtt();
  const { data: satData } = useSateliteMqtt();
  const { data: orientData } = useOrientacion3DMqtt();

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

  const fmt = (val, decimals = 1, fallback = '---') => {
    return (val !== null && val !== undefined && typeof val === 'number' && !isNaN(val))
      ? val.toFixed(decimals)
      : fallback;
  };

  // Safe checks and scaling for active telemetry parameters
  const co2 = fmt(ambSensors?.co2_ppm?.v, 1);
  const tempAmb = fmt(ambSensors?.temperatura_c?.v, 1);
  const hum = fmt(ambSensors?.humedad_pct?.v, 1);
  const pres = fmt(ambSensors?.presion_pa?.v, 0);
  const uv = fmt(ambSensors?.radiacion_uv?.v, 1);

  const lat = fmt(ubiData?.latitud?.v, 4);
  const lon = fmt(ubiData?.longitud?.v, 4);
  const alt = ambSensors?.altura_barometrica_m?.calibrando
    ? 'Calib.'
    : fmt(ambSensors?.altura_barometrica_m?.v, 1);
  const vel = fmt(ubiData?.velocidad_kmh?.v, 1);
  const dist = fmt(ubiData?.distancia_origen?.v, 1);
  const sats = ubiData?.satelites?.v !== undefined && ubiData?.satelites?.v !== null ? ubiData.satelites.v : '---';

  const volt = fmt(satData?.voltaje_v?.v, 2);
  const curr = fmt(satData?.corriente_ma?.v, 1);
  const cons = fmt(satData?.consumo_w?.v, 2);
  const tempMcu = fmt(satData?.temp_mcu?.v, 1);
  const accX = fmt(orientData?.accel_x?.v, 1);
  const accY = fmt(orientData?.accel_y?.v, 1);
  const accZ = fmt(orientData?.accel_z?.v, 1);
  const uptime = (satData?.tiempo_encendido_seg?.v !== undefined && satData?.tiempo_encendido_seg?.v !== null)
    ? formatUptime(satData.tiempo_encendido_seg.v)
    : '---';

  // Raw telemetry data compile (removing unmapped packages and phase)
  const telemetryItems = [
    { label: 'Voltaje:', value: `${volt} V`, color: '#ef5350' },
    { label: 'Corriente:', value: `${curr} mA`, color: '#42a5f5' },
    { label: 'Consumo:', value: `${cons} W`, color: '#ba68c8' },
    { label: 'Altitud Vuelo:', value: ambSensors?.altura_barometrica_m?.calibrando ? alt : `${alt} m`, color: '#ef5350' },
    { label: 'Latitud:', value: `${lat}°`, color: '#4fc3f7' },
    { label: 'Longitud:', value: `${lon}°`, color: '#4fc3f7' },
    { label: 'CO2:', value: `${co2} ppm`, color: '#f9a825' },
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
