import { useState, useEffect } from 'react';
import { useSateliteMqtt } from '../../mqtt/paquete_mqtt/useSateliteMqtt';
import { useComunicacionMqtt } from '../../mqtt/paquete_mqtt/useComunicacionMqtt';
import { MqttService } from '../../mqtt/config/mqttConfig';
import './BottomBar.css';

export default function BottomBar() {
  const [time, setTime] = useState(new Date());
  const [brokerOnline, setBrokerOnline] = useState(false);

  const { data: satData, isConnected: satConnected } = useSateliteMqtt();
  const { data: commData, isConnected: commConnected } = useComunicacionMqtt();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    const unsubMqtt = MqttService.subscribeStatus((connected) => {
      setBrokerOnline(connected);
    });
    return () => {
      clearInterval(timer);
      unsubMqtt();
    };
  }, []);
  const utcOffset = -time.getTimezoneOffset() / 60;
  const utcLabel = `UTC${utcOffset >= 0 ? '+' : ''}${utcOffset}`;
  const shortTime = time.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const activeSensorsCount = satData.sensores_activos?.v !== undefined ? satData.sensores_activos.v : '---';
  const totalSensorsCount = satData.sensores_activos?.total !== undefined ? satData.sensores_activos.total : 7;
  const linkQuality = commData.calidad_enlace_pct?.v !== undefined ? commData.calidad_enlace_pct.v : '---';
  const linkQualityFormatted = typeof linkQuality === 'number' ? linkQuality.toFixed(0) : '---';
  const pktsRec = commData.paquetes_recibidos?.v !== undefined ? commData.paquetes_recibidos.v : '---';
  const pktsLost = commData.paquetes_perdidos?.v !== undefined ? commData.paquetes_perdidos.v : '---';

  return (
    <footer className="bottombar">
      <div className="bottombar-left">
        <span className="status-item">
          <i className="fa-solid fa-server status-icon broker-icon"></i>
          <span className="status-label">Broker MQTT:</span>
          <span className={`status-value broker-status ${brokerOnline ? 'ok' : 'offline'}`}>
            <span className="status-dot"></span>
            {brokerOnline ? 'CONECTADO' : 'DESCONECTADO'}
          </span>
        </span>

        <span className="status-separator">|</span>

        <span className="status-item">
          <i className="fa-solid fa-microchip status-icon"></i>
          <span className="status-label">Sensores:</span>
          <span className={`status-value sensors-status ${activeSensorsCount === totalSensorsCount && totalSensorsCount !== '---' ? 'ok' : 'warning'}`}>
            {activeSensorsCount} / {totalSensorsCount} Activos
          </span>
        </span>

        <span className="status-separator">|</span>

        <span className="status-item">
          <i className="fa-solid fa-signal status-icon"></i>
          <span className="status-label">Calidad RF:</span>
          <span className={`status-value quality-status ${typeof linkQuality === 'number' && linkQuality >= 80 ? 'ok' : typeof linkQuality === 'number' && linkQuality >= 50 ? 'warning' : 'danger'}`}>
            {linkQualityFormatted}%
          </span>
        </span>

        <span className="status-separator">|</span>

        <span className="status-item">
          <i className="fa-solid fa-box-open status-icon"></i>
          <span className="status-label">Paquetes (Rec/Per):</span>
          <span className="status-value pkts-status">
            <span className="pkt-rec">{pktsRec}</span>
            <span className="pkt-divider">/</span>
            <span className="pkt-lost">{pktsLost}</span>
          </span>
        </span>
      </div>
      <div className="bottombar-right">
        <span className="station-name">Estación Terrena - CEMPAI Space Systems</span>
        <span className="bottombar-time">
          {shortTime} {utcLabel}
        </span>
      </div>
    </footer>
  );
}
