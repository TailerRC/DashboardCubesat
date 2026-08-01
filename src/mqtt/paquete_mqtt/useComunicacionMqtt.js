import { useState, useEffect } from 'react';
import { MqttService } from '../config/mqttConfig';

const TOPIC = 'cempai/cubesat/telemetry/comunicacion';
const HISTORY_SIZE = 20;
const MAX_LOG_ENTRIES = 20;

export function useComunicacionMqtt() {
  const [data, setData] = useState(() => {
    return {
      paquetes_enviados: { v: 0, hace_seg: 0.0 },
      paquetes_recibidos: { v: 0, hace_seg: 0.0 },
      paquetes_perdidos: { v: 0, hace_seg: 0.0 },
      frecuencia_ghz: { v: 0, hace_seg: 0.0 },
      canal_nrf24: { v: 0 },
      calidad_enlace_pct: { v: 0, hace_seg: 0.0, history: [] },
      calidad_label: '---',
      baudios_debug: { v: 0 },
      tasa_aire_nrf24_kbps: { v: 0 },
      ultimo_pkt_timestamp: '---',
      logEntries: [],
      pkts_window: Array(30).fill('error')
    };
  });
  const [lastPacketId, setLastPacketId] = useState(null);
  const [lastValidPacketTime, setLastValidPacketTime] = useState(null);

  useEffect(() => {
    const handleMessage = (packet) => {
      setLastPacketId(packet.packet_id);
      const packetTime = Date.now();

      if (packet.data) {
        setLastValidPacketTime(packetTime);
        const d = packet.data;

        setData(prev => {
          // Update link quality history
          const prevCalHist = prev.calidad_enlace_pct.history || [];
          const newCalHist = [...prevCalHist, { value: d.calidad_enlace_pct.v, timestamp: packetTime }];
          if (newCalHist.length > HISTORY_SIZE) newCalHist.shift();

          // Append to log entries if a new log entry arrived
          const prevLogs = prev.logEntries || [];
          let newLogs = [...prevLogs];
          if (d.log_entry) {
            newLogs.push(d.log_entry);
            if (newLogs.length > MAX_LOG_ENTRIES) newLogs.shift();
          }

          // Build pkts_window representation for UI blocks (30 blocks)
          const windowRaw = d.pkts_window || [];
          const pktsWindow = windowRaw.map(ok => (ok ? 'ok' : 'error'));
          while (pktsWindow.length < 30) pktsWindow.unshift('ok');

          return {
            paquetes_enviados: { v: d.paquetes_enviados.v, hace_seg: d.paquetes_enviados.hace_seg },
            paquetes_recibidos: { v: d.paquetes_recibidos.v, hace_seg: d.paquetes_recibidos.hace_seg },
            paquetes_perdidos: { v: d.paquetes_perdidos.v, hace_seg: d.paquetes_perdidos.hace_seg },
            frecuencia_ghz: { v: d.frecuencia_ghz.v, hace_seg: d.frecuencia_ghz.hace_seg },
            canal_nrf24: { v: d.canal_nrf24 ? d.canal_nrf24.v : 1 },
            calidad_enlace_pct: { v: d.calidad_enlace_pct.v, hace_seg: d.calidad_enlace_pct.hace_seg, history: newCalHist },
            calidad_label: d.calidad_label,
            baudios_debug: { v: d.baudios_debug ? d.baudios_debug.v : 9600 },
            tasa_aire_nrf24_kbps: { v: d.tasa_aire_nrf24_kbps ? d.tasa_aire_nrf24_kbps.v : 2000 },
            ultimo_pkt_timestamp: d.ultimo_pkt_timestamp || '00:00:00',
            logEntries: newLogs,
            pkts_window: pktsWindow
          };
        });
      }
    };

    const unsubscribe = MqttService.subscribe(TOPIC, handleMessage);
    return () => unsubscribe();
  }, []);

  return {
    data,
    logEntries: data.logEntries,
    lastPacketId,
    isConnected: lastValidPacketTime !== null && (Date.now() - lastValidPacketTime) <= 5000
  };
}
