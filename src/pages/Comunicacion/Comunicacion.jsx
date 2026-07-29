import React, { useRef, useEffect } from 'react';
import { useComunicacionMqtt } from '../../mqtt/paquete_mqtt/useComunicacionMqtt';
import SensorChart from '../../components/Charts/SensorChart';
import './Comunicacion.css';

export default function Comunicacion() {
  const { data: comData, logEntries, isConnected } = useComunicacionMqtt();
  const logContainerRef = useRef(null);

  // Scroll únicamente el contenedor interno del terminal log sin afectar el scroll de la página principal
  useEffect(() => {
    if (logContainerRef.current) {
      const el = logContainerRef.current;
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      if (isNearBottom) {
        el.scrollTop = el.scrollHeight;
      }
    }
  }, [logEntries]);

  // CDR Corrección 3: Quality Badge determination
  const calidadPct = comData.calidad_enlace_pct.v;
  const calidadLabel = comData.calidad_label;

  let badgeClass = 'badge-buena';
  if (calidadPct >= 95) badgeClass = 'badge-excelente';
  else if (calidadPct >= 85) badgeClass = 'badge-buena';
  else if (calidadPct >= 70) badgeClass = 'badge-regular';
  else badgeClass = 'badge-debil';

  const calidadHist = comData.calidad_enlace_pct.history || [];
  const pkts = comData.pkts_window || Array(30).fill('ok');

  // Mission progress packet count
  const recvCount = comData.paquetes_recibidos.v;
  const progressPct = Math.min(100, parseFloat(((recvCount / 10000) * 100).toFixed(1)));

  return (
    <div className={`comunicacion-view ${!isConnected ? 'view-stale' : ''}`}>

      {/* Top Stats Grid */}
      <section className="com-stats-grid">
        <div className="com-stat-card premium-card-hover" style={{ '--card-color': '#4fc3f7' }}>
          <span className="com-stat-title">PAQUETES ENVIADOS</span>
          <div className="com-stat-value blue-text">{comData.paquetes_enviados.v}</div>
          <span className="com-stat-subtitle">Desde el CubeSat OBC</span>
        </div>

        <div className="com-stat-card premium-card-hover" style={{ '--card-color': '#8bc34a' }}>
          <span className="com-stat-title">PAQUETES RECIBIDOS</span>
          <div className="com-stat-value green-text">{comData.paquetes_recibidos.v}</div>
          <span className="com-stat-subtitle">En Estación Terrena</span>
        </div>

        <div className="com-stat-card premium-card-hover" style={{ '--card-color': '#ff9800' }}>
          <span className="com-stat-title">PAQUETES PERDIDOS</span>
          <div className="com-stat-value orange-text">- {comData.paquetes_perdidos.v}</div>
          <span className="com-stat-subtitle">Pérdida / CRC Inválido</span>
        </div>

        {/* CDR Corrección 2: Frecuencia NRF24L01 2.401 GHz */}
        <div className="com-stat-card premium-card-hover" style={{ '--card-color': '#ffeb3b' }}>
          <span className="com-stat-title">FRECUENCIA TX (NRF24L01)</span>
          <div className="com-stat-value yellow-text">
            {comData.frecuencia_ghz.v} <span className="unit-small">GHz</span>
          </div>
          <span className="com-stat-subtitle">Canal {comData.canal_nrf24.v} (2.400-2.525 GHz)</span>
        </div>
      </section>

      {/* Middle Grid: Signal Stats + Packet Blocks */}
      <section className="com-middle-grid">
        {/* Signal Stats */}
        <div className="panel-card signal-panel premium-card-hover" style={{ '--card-color': '#2196f3' }}>
          <div className="signal-header">
            <i className="fa-solid fa-tower-broadcast" style={{ color: '#4fc3f7', fontSize: '22px' }}></i>
            <h2>ENLACE ACTIVO (NRF24L01)</h2>
          </div>

          <div className="signal-list">
            {/* CDR Corrección 3: Reemplazar RSSI/SNR por Calidad de Enlace */}
            <div className="signal-row">
              <span>CALIDAD DE ENLACE:</span>
              <span className={`quality-badge ${badgeClass}`}>
                {calidadPct}% ({calidadLabel})
              </span>
            </div>

            {/* CDR Corrección 2: Frecuencia 2.401 GHz */}
            <div className="signal-row">
              <span>FRECUENCIA RF:</span>
              <strong>{comData.frecuencia_ghz.v} GHz (Canal {comData.canal_nrf24.v})</strong>
            </div>

            {/* CDR Corrección 8: Clarificar Baudios Debug */}
            <div className="signal-row">
              <span>BAUDIOS (Puerto Serial Debug):</span>
              <strong>{comData.baudios_debug.v} bps</strong>
            </div>

            <div className="signal-row">
              <span>TASA EN AIRE (NRF24L01):</span>
              <strong>{comData.tasa_aire_nrf24_kbps.v} kbps</strong>
            </div>

            <div className="signal-row">
              <span>ÚLTIMO PKT RECIBIDO:</span>
              <strong>{comData.ultimo_pkt_timestamp}</strong>
            </div>
          </div>
        </div>

        {/* Visualización de paquetes */}
        <div className="panel-card pkt-panel premium-card-hover" style={{ '--card-color': '#4caf50' }}>
          <h3 className="panel-header" style={{ textTransform: 'none' }}>Ventana Móvil de Paquetes (Últimos 30)</h3>

          <div className="pkt-blocks">
            {pkts.map((status, i) => (
              <div key={i} className={`pkt-block pkt-${status}`} title={`Pkt #${i + 1}: ${status.toUpperCase()}`}></div>
            ))}
          </div>

          <div className="pkt-legend">
            <div className="legend-item"><div className="pkt-block pkt-ok"></div> RX OK</div>
            <div className="legend-item"><div className="pkt-block pkt-error"></div> RX ERROR / LOSS</div>
          </div>

          <h3 className="panel-header" style={{ textTransform: 'none', marginTop: '14px' }}>Progreso Acumulado de Recepción</h3>
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${progressPct}%` }}></div>
            <span className="progress-text">{recvCount} / 10000 paquetes ({progressPct}%)</span>
          </div>
        </div>
      </section>

      {/* Real-time Link Quality Chart */}
      <section className="panel-card com-chart-panel premium-card-hover" style={{ '--card-color': '#8bc34a' }}>
        <h3 className="panel-header">
          <i className="fa-solid fa-chart-line" style={{ marginRight: '8px', color: '#8bc34a' }}></i>
          HISTORIAL DE CALIDAD DE ENLACE EN TIEMPO REAL (%)
        </h3>
        <div style={{ height: '180px', marginTop: '6px' }}>
          <SensorChart
            data={calidadHist.map(pt => ({
              value: pt.value,
              tsAgo: Math.max(0, (Date.now() - pt.timestamp) / 1000)
            }))}
            color="#8bc34a"
            yMin={0}
            yMax={100}
            unit="%"
            decimals={1}
            thresholdY={70}
          />
        </div>
      </section>

      {/* Bottom Terminal Log */}
      <section className="panel-card log-panel premium-card-hover" style={{ '--card-color': '#ffb74d' }}>
        <h3 className="panel-header">
          <i className="fa-solid fa-terminal" style={{ marginRight: '8px', color: '#ffb74d' }}></i>
          LOG DE PAQUETES EN TIEMPO REAL
        </h3>
        <div className="log-container" ref={logContainerRef}>
          {logEntries.map((log, i) => (
            <div key={i} className="log-line">
              <span>[{log.timestamp}]</span>
              <span className={log.status === 'RX OK' ? 'log-ok' : log.status === 'RX ERROR' ? 'log-error' : 'log-timeout'}>
                [{log.status}]
              </span>
              <span>{log.text}</span>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
