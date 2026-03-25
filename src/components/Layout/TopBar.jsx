import { useState, useEffect } from 'react';
import './TopBar.css';

export default function TopBar({ viewName = 'Vista General' }) {
  const [time, setTime] = useState(new Date());

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

  const utcOffset = -time.getTimezoneOffset() / 60;
  const utcLabel = `UTC${utcOffset >= 0 ? '+' : ''}${utcOffset}`;

  const telemetryItems = [
    { label: 'Altitud:', value: '500m', color: '#4fc3f7' },
    { label: 'Voltaje:', value: '12.5V', color: '#4fc3f7' },
    { label: 'Corriente:', value: '0.8A', color: '#4fc3f7' },
    { label: 'Latitud:', value: '23.45°', color: '#4fc3f7' },
    { label: 'Longitud:', value: '-99.27°', color: '#4fc3f7' },
    { label: 'Paquetes:', value: '12345', color: '#4fc3f7' },
    { label: 'Estado:', value: 'Seguro', color: '#4caf50' },
    { label: 'Temperatura:', value: '27°C', color: '#4fc3f7' },
  ];

  return (
    <header className="topbar">
      <div className="topbar-telemetry">
        {telemetryItems.map((item, i) => (
          <span key={i} className="telemetry-item">
            <span className="telemetry-label">{item.label}</span>
            <span className="telemetry-value" style={{ color: item.color }}>
              {item.value}
            </span>
          </span>
        ))}
      </div>

      <div className="topbar-info">
        <div className="topbar-info-left">
          <span className="station-label">Estación Terreno</span>
          <span className="view-name">{viewName}</span>
        </div>
        <div className="topbar-progress">
          <div className="progress-track">
            <div className="progress-fill"></div>
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
