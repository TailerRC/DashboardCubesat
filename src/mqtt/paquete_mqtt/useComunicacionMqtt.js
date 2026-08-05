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
          const getV = (obj, fallback = 0) => (obj && typeof obj === 'object' && obj.v !== undefined && obj.v !== null) ? obj.v : (typeof obj === 'number' ? obj : fallback);
          const getSeg = (obj, fallback = 0) => (obj && typeof obj === 'object' && obj.hace_seg !== undefined && obj.hace_seg !== null) ? obj.hace_seg : fallback;

          // Update link quality history
          const calidadVal = getV(d.calidad_enlace_pct, prev.calidad_enlace_pct.v);
          const prevCalHist = prev.calidad_enlace_pct.history || [];
          const newCalHist = [...prevCalHist, { value: calidadVal, timestamp: packetTime }];
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
            paquetes_enviados: { v: getV(d.paquetes_enviados, prev.paquetes_enviados.v), hace_seg: getSeg(d.paquetes_enviados) },
            paquetes_recibidos: { v: getV(d.paquetes_recibidos, prev.paquetes_recibidos.v), hace_seg: getSeg(d.paquetes_recibidos) },
            paquetes_perdidos: { v: getV(d.paquetes_perdidos, prev.paquetes_perdidos.v), hace_seg: getSeg(d.paquetes_perdidos) },
            frecuencia_ghz: { v: getV(d.frecuencia_ghz, prev.frecuencia_ghz.v), hace_seg: getSeg(d.frecuencia_ghz) },
            canal_nrf24: { v: getV(d.canal_nrf24, 1) },
            calidad_enlace_pct: { v: calidadVal, hace_seg: getSeg(d.calidad_enlace_pct), history: newCalHist },
            calidad_label: d.calidad_label || prev.calidad_label,
            baudios_debug: { v: getV(d.baudios_debug, 9600) },
            tasa_aire_nrf24_kbps: { v: getV(d.tasa_aire_nrf24_kbps, 2000) },
            ultimo_pkt_timestamp: d.ultimo_pkt_timestamp || prev.ultimo_pkt_timestamp,
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
