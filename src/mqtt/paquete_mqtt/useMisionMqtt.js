import { useState, useEffect, useRef } from 'react';
import { MqttService } from '../config/mqttConfig';
import { FASES_UI_NAMES } from '../../utils/missionPhaseLogic';

const TOPIC_MISION = 'cempai/cubesat/telemetry/mision';
const TOPIC_UBICACION = 'cempai/cubesat/telemetry/ubicacion';
const HISTORY_SIZE = 20;

// Normaliza el texto de la fase enviado por el ESP32 (con/sin acentos) al estándar de la UI
function normalizeFase(fase) {
  if (!fase) return FASES_UI_NAMES.INICIALIZACION;
  const upper = fase.toUpperCase().trim();
  if (upper === 'INICIALIZACION' || upper === 'INICIALIZACIÓN') return FASES_UI_NAMES.INICIALIZACION;
  if (upper === 'ASCENSO / LANZAMIENTO' || upper === 'ASCENSO' || upper === 'LANZAMIENTO') return FASES_UI_NAMES.ASCENSO;
  if (upper === 'DESCENSO') return FASES_UI_NAMES.DESCENSO;
  if (upper === 'PROXIMIDAD AL SUELO' || upper === 'PROXIMIDAD') return FASES_UI_NAMES.PROXIMIDAD_SUELO;
  if (upper === 'ATERRIZADO') return FASES_UI_NAMES.ATERRIZADO;
  return upper;
}

export function useMisionMqtt() {
  const [data, setData] = useState(() => {
    return {
      fase_cdr: '---',
      fase_cdr_index: null,
      fase_ui: FASES_UI_NAMES.INICIALIZACION,
      altitud_m: { v: 0, hace_seg: 0.0, history: [] },
      velocidad_vertical_ms: { v: 0, hace_seg: 0.0, history: [] },
      t_vuelo_seg: { v: 0, hace_seg: 0.0 },
      sd_card_status: '---'
    };
  });
  const [lastPacketId, setLastPacketId] = useState(null);
  const [lastValidPacketTime, setLastValidPacketTime] = useState(null);

  useEffect(() => {
    // Handler para el tópico de misión real del ESP32
    const handleMisionMessage = (packet) => {
      setLastPacketId(packet.packet_id);
      const packetTime = Date.now();

      if (packet.received && packet.crc_valido && packet.data) {
        setLastValidPacketTime(packetTime);
        const d = packet.data;

        setData(prev => {
          let rawAlt = (d.altitud_m?.v !== undefined && d.altitud_m?.v !== null) ? d.altitud_m.v : 0;
          rawAlt = Math.min(100.0, Math.max(0.0, rawAlt));
          
          // Usamos directamente la fase reportada por el ESP32 en tiempo real
          const realFaseUI = normalizeFase(d.fase_ui);

          // Historial de altitud
          const prevAltHist = prev.altitud_m.history || [];
          const newAltHist = [...prevAltHist, { value: rawAlt, timestamp: packetTime }];
          if (newAltHist.length > HISTORY_SIZE) newAltHist.shift();

          // Historial de velocidad vertical
          const velVal = d.velocidad_vertical_ms?.v ?? 0;
          const prevVelHist = prev.velocidad_vertical_ms.history || [];
          const newVelHist = [...prevVelHist, { value: velVal, timestamp: packetTime }];
          if (newVelHist.length > HISTORY_SIZE) newVelHist.shift();

          return {
            fase_cdr: d.fase_cdr || '---',
            fase_cdr_index: d.fase_cdr_index ?? null,
            fase_ui: realFaseUI,
            altitud_m: { v: rawAlt, hace_seg: d.altitud_m?.hace_seg || 0.0, history: newAltHist },
            velocidad_vertical_ms: { v: velVal, hace_seg: d.velocidad_vertical_ms?.hace_seg || 0.0, history: newVelHist },
            t_vuelo_seg: { v: d.t_vuelo_seg?.v || 0, hace_seg: d.t_vuelo_seg?.hace_seg || 0.0 },
            sd_card_status: d.sd_card_status || '---'
          };
        });
      }
    };

    const unsubMision = MqttService.subscribe(TOPIC_MISION, handleMisionMessage);

    return () => {
      unsubMision();
    };
  }, []);

  // Watchdog: si no llegan datos reales del ESP32 en 5 segundos, resetea a inicialización
  useEffect(() => {
    const watchdog = setInterval(() => {
      const now = Date.now();
      const elapsed = lastValidPacketTime !== null ? now - lastValidPacketTime : Infinity;

      if (elapsed > 5000) {
        setData(prev => {
          if (prev.fase_ui === FASES_UI_NAMES.INICIALIZACION &&
              prev.altitud_m.v === 0 &&
              prev.velocidad_vertical_ms.v === 0) {
            return prev;
          }
          return {
            ...prev,
            fase_ui: FASES_UI_NAMES.INICIALIZACION,
            altitud_m: { ...prev.altitud_m, v: 0 },
            velocidad_vertical_ms: { ...prev.velocidad_vertical_ms, v: 0 },
            t_vuelo_seg: { ...prev.t_vuelo_seg, v: 0 }
          };
        });
      }
    }, 1000);

    return () => clearInterval(watchdog);
  }, [lastValidPacketTime]);

  return {
    data,
    faseUI: data.fase_ui,
    lastPacketId,
    isConnected: lastValidPacketTime !== null && (Date.now() - lastValidPacketTime) <= 5000
  };
}
