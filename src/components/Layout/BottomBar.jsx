import { useState, useEffect } from 'react';
import './BottomBar.css';

export default function BottomBar() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const utcOffset = -time.getTimezoneOffset() / 60;
  const utcLabel = `UTC${utcOffset >= 0 ? '+' : ''}${utcOffset}`;
  const shortTime = time.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return (
    <footer className="bottombar">
      <div className="bottombar-left">
        <span className="status-item">
          <span className="status-label">Sensors:</span>
          <span className="status-value ok">7/7</span>
        </span>
        <span className="status-item">
          <span className="status-label">I2C:</span>
          <span className="status-value">0x40, 0x44</span>
        </span>
        <span className="status-item">
          <span className="status-label">Serial:</span>
          <span className="status-value">COM3</span>
        </span>
      </div>
      <div className="bottombar-right">
        <span className="station-name">Estación Terreno - Cempai Space Systems</span>
        <span className="bottombar-time">
          {shortTime} {utcLabel}
        </span>
      </div>
    </footer>
  );
}
